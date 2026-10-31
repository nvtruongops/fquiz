import dns from 'node:dns'
import mongoose from 'mongoose'
import logger from '@/lib/core/utils/logger'

// `mongodb+srv://` requires a DNS SRV + TXT lookup. Some local/ISP resolvers
// refuse SRV queries (querySrv ECONNREFUSED), which fails the connection before
// any query runs. We try system DNS first, then fall back to public resolvers.
const DNS_FALLBACK_1 = [8, 8, 8, 8].join('.')
const DNS_FALLBACK_2 = [1, 1, 1, 1].join('.')
const PUBLIC_DNS = (process.env.DNS_RESOLVERS ?? `${DNS_FALLBACK_1},${DNS_FALLBACK_2}`).split(',')
const systemDnsServers = (() => {
  try {
    return dns.getServers()
  } catch {
    return [] as string[]
  }
})()

function isSrvDnsError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? ''
  return /querySrv|queryTxt|ECONNREFUSED|ENOTFOUND|ESERVFAIL|ETIMEOUT|EAI_AGAIN/i.test(
    msg
  )
}

// Pre-register models via bootstrap to prevent MissingSchemaError in Next.js Serverless Routes.
// Each module registers its models via registerModel() in the module's index.ts file.
import { bootstrapModels } from '@/lib/core/db/model-registry'

// Each module's index.ts auto-registers its models on import
import '@/lib/modules/auth'
import '@/lib/modules/quiz'
import '@/lib/modules/community'
import '@/lib/modules/ai'
import '@/lib/modules/classroom'

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const cached = global.mongooseCache ?? { conn: null, promise: null }
global.mongooseCache = cached

export async function connectDB(): Promise<typeof mongoose> {
  const mongodbUri = process.env.MONGODB_URI

  if (!mongodbUri) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }
  // Reuse existing connection immediately — no reconnect, no log
  if (cached.conn) {
    return cached.conn
  }

  // Start a new connection promise if none in-flight
  if (!cached.promise) {
    const defaultPoolSize = process.env.VERCEL ? 5 : 10
    const configuredPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE || defaultPoolSize)
    const maxPoolSize = Number.isFinite(configuredPoolSize) && configuredPoolSize > 0
      ? Math.min(Math.floor(configuredPoolSize), 100)
      : defaultPoolSize
    const configuredWaitQueueTimeout = Number(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS)
    const waitQueueTimeoutMS = Number.isFinite(configuredWaitQueueTimeout) && configuredWaitQueueTimeout > 0
      ? Math.min(Math.floor(configuredWaitQueueTimeout), 30_000)
      : 2_000
    const connectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize,
      waitQueueTimeoutMS,
      minPoolSize: 0,
    }

    cached.promise = mongoose
      .connect(mongodbUri, connectOptions)
      .catch(async (err) => {
        // If the SRV/TXT DNS lookup was refused by the system resolver, retry
        // once using public DNS (8.8.8.8 / 1.1.1.1) before giving up.
        if (isSrvDnsError(err)) {
          logger.warn(
            { err: (err as Error).message },
            'MongoDB SRV DNS lookup failed — retrying with public DNS'
          )
          try {
            dns.setServers(PUBLIC_DNS)
            return await mongoose.connect(mongodbUri, connectOptions)
          } finally {
            // Restore the original resolver so we don't affect other lookups
            if (systemDnsServers.length > 0) {
              try {
                dns.setServers(systemDnsServers)
              } catch {
                /* ignore restore failure */
              }
            }
          }
        }
        throw err
      })
      .then(async (m) => {
        // Ensure all models are registered before any query runs
        await bootstrapModels()
        logger.info('MongoDB connected')
        cached.conn = m
        return m
      })
      .catch((err) => {
        logger.error({ err }, 'MongoDB connection failed')
        cached.promise = null
        throw err
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    const connectionError = new Error(`MongoDB connection failed: ${(err as Error).message}`)
    ;(connectionError as Error & { cause?: unknown }).cause = err
    throw connectionError
  }

  return cached.conn
}
