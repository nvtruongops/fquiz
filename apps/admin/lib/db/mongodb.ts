import dns from 'node:dns'
import mongoose from 'mongoose'

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

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    }

    cached.promise = mongoose
      .connect(mongodbUri, opts)
      .catch(async (initialErr: unknown) => {
        if (!isSrvDnsError(initialErr)) {
          throw initialErr
        }
        try {
          dns.setServers(PUBLIC_DNS)
          return await mongoose.connect(mongodbUri, opts)
        } catch (retryErr) {
          if (systemDnsServers.length > 0) {
            dns.setServers(systemDnsServers)
          }
          throw retryErr
        }
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}
