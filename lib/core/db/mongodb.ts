import dns from 'node:dns'
import mongoose from 'mongoose'
import logger from '@/lib/core/utils/logger'

// `mongodb+srv://` requires a DNS SRV + TXT lookup. Some local/ISP resolvers
// refuse SRV queries (querySrv ECONNREFUSED), which fails the connection before
// any query runs. We try system DNS first, then fall back to public resolvers.
const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1']
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

// Pre-register all Mongoose Models to prevent MissingSchemaError during population in Next.js Serverless Routes
import '@/lib/modules/auth/models/User'
import '@/lib/modules/quiz/models/Category'
import '@/lib/modules/quiz/models/Quiz'
import '@/lib/modules/quiz/models/QuizSession'
import '@/lib/modules/quiz/models/QuizComment'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined')
}

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
  // Reuse existing connection immediately — no reconnect, no log
  if (cached.conn) {
    return cached.conn
  }

  // Start a new connection promise if none in-flight
  if (!cached.promise) {
    const connectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, connectOptions)
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
            return await mongoose.connect(MONGODB_URI, connectOptions)
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
      .then((m) => {
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
    throw new Error(`MongoDB connection failed: ${(err as Error).message}`)
  }

  return cached.conn
}
