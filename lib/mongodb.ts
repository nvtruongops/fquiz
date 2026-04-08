import mongoose from 'mongoose'
import logger from './logger'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined')
}

declare global {
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
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
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
