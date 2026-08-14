import { GeminiProvider } from '../gemini-provider'
import { z } from 'zod'

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation((apiKey: string) => {
      return {
        getGenerativeModel: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn().mockImplementation(async () => {
            if (apiKey === 'invalid-key') {
              throw new Error('403 API key not valid')
            }
            return {
              response: {
                text: () => '{"status": "ok"}',
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
              },
            }
          }),
        })),
      }
    }),
  }
})

describe('GeminiProvider Multi-Key Rotation & Failover', () => {
  const schema = z.object({ status: z.string() })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should rotate keys in round-robin order for successful requests', async () => {
    const provider = new GeminiProvider('key-1, key-2, key-3')

    const res1 = await provider.generate('prompt 1', { responseSchema: schema })
    expect(res1.content).toEqual({ status: 'ok' })

    const res2 = await provider.generate('prompt 2', { responseSchema: schema })
    expect(res2.content).toEqual({ status: 'ok' })
  })

  it('should automatically failover to next key if current key throws error', async () => {
    const provider = new GeminiProvider('invalid-key, key-2')

    const res = await provider.generate('test prompt', { responseSchema: schema })

    expect(res.content).toEqual({ status: 'ok' })
  })

  it('should throw error if all keys in the pool fail', async () => {
    const provider = new GeminiProvider('invalid-key, invalid-key')

    await expect(provider.generate('test prompt', { responseSchema: schema })).rejects.toThrow('403 API key not valid')
  })
})
