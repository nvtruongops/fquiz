import { Client, Receiver } from "@upstash/qstash";

const token = process.env.QSTASH_TOKEN;

if (!token) {
  console.warn("QSTASH_TOKEN is not defined in environment variables");
}

/**
 * QStash Client for publishing messages to the queue
 */
export const qstashClient = new Client({
  token: token || "",
  baseUrl: process.env.QSTASH_URL,
});

/**
 * QStash Receiver for verifying signatures in API routes
 */
export const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

/**
 * Utility to publish a background job
 * @param destination The URL or Topic to send the message to
 * @param body The payload for the job
 * @param delay Optional delay in seconds
 */
export async function publishJob(destination: string, body: any, delay?: number) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[QStash] Publishing job to ${destination}...`)
    }
    
    // Local development fallback: QStash cannot call localhost
    if (destination.includes('localhost') || destination.includes('127.0.0.1') || destination.includes('::1')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[QStash] Local environment detected. Simulating background job via local fetch...')
      }
      
      const localDest = destination.replace('localhost', '127.0.0.1');
      console.log(`[QStash] Local simulation target normalized to: ${localDest}`);

      // Fire and forget local fetch to avoid deadlock in single-threaded dev server
      fetch(localDest, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'upstash-signature': 'mock-signature-for-local-dev', // Skip verification in local dev
        },
        body: JSON.stringify(body),
      })
      .then(() => { if (process.env.NODE_ENV !== 'production') console.log('[QStash] Local simulation fetch sent successfully.') })
      .catch(err => console.error('[QStash] Local simulation failed:', err));
      
      return { success: true, messageId: 'local-mock-id-' + Date.now() };
    }

    if (!process.env.QSTASH_TOKEN) {
      throw new Error("QSTASH_TOKEN is missing");
    }
    
    const result = await qstashClient.publishJSON({
      url: destination,
      body: body,
      delay: delay,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[QStash] Job published successfully. MessageId: ${result.messageId}`)
    }
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("[QStash] Failed to publish job:", error.message || error);
    return { success: false, error: error.message || error };
  }
}

/**
 * Verifies QStash signature for background job endpoints.
 */
export async function verifyQStashRequest(
  req: Request
): Promise<{ isValid: boolean; bodyText: string; status: number; error?: string }> {
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return { isValid: false, bodyText: '', status: 401, error: 'Missing signature' };
  }

  const isLocalMock = signature === 'mock-signature-for-local-dev' && process.env.NODE_ENV === 'development';
  const bodyText = await req.text();

  if (process.env.NODE_ENV === 'production' && !process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return { isValid: false, bodyText, status: 500, error: 'Signing key not configured' };
  }

  if (!isLocalMock) {
    const isValid = await qstashReceiver.verify({ signature, body: bodyText });
    if (!isValid) {
      return { isValid: false, bodyText, status: 401, error: 'Invalid signature' };
    }
  }

  return { isValid: true, bodyText, status: 200 };
}
