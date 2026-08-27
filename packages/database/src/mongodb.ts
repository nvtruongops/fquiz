import dns from 'node:dns'
import mongoose from 'mongoose'
import { bootstrapModels } from './model-registry'

// `mongodb+srv://` requires a DNS SRV + TXT lookup. Some local/ISP resolvers
// refuse SRV queries (querySrv ECONNREFUSED), which fails the connection before
// any query runs. We try system DNS first, then fall back to public resolvers.
const DNS_FALLBACK_1 = '8.8.8.8'
const DNS_FALLBACK_2 = '1.1.1.1'
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
  return /querySrv|queryTxt|ECONNREFUSED|ENOTFOUND|ESERVFAIL|ETIMEOUT|EAI_AGAIN/i.test(msg)
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
    const connectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    }

    cached.promise = mongoose
      .connect(mongodbUri, connectOptions)
      .catch(async (err) => {
        if (isSrvDnsError(err)) {
          console.warn('[Database] MongoDB SRV DNS lookup failed — retrying with public DNS')
          try {
            dns.setServers(PUBLIC_DNS)
            return await mongoose.connect(mongodbUri, connectOptions)
          } finally {
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
        await bootstrapModels()
        cached.conn = m
        return m
      })
      .catch((err) => {
        console.error('[Database] MongoDB connection failed:', err)
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
