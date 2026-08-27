/**
 * @jest-environment node
 */

jest.mock('node:dns', () => ({
  getServers: jest.fn(() => ['8.8.8.8']),
  setServers: jest.fn(),
}))

jest.mock('mongoose', () => {
  class MockObjectId {}
  const SchemaMock: any = function SchemaMock(def: any, opts: any) {
    const schema: any = { ...def }
    schema.index = jest.fn()
    schema.pre = jest.fn()
    schema.statics = {}
    return schema
  }
  SchemaMock.Types = { ObjectId: MockObjectId, String, Number, Boolean, Date, Mixed: {}, Map: {} }
  const mock = {
    connect: jest.fn().mockResolvedValue({ connection: { readyState: 1 } }),
    connection: { readyState: 1 },
    Schema: SchemaMock,
    model: jest.fn(() => ({})),
    models: {},
    Types: { ObjectId: { isValid: jest.fn(() => true) } },
  }
  return { __esModule: true, default: mock, ...mock }
})

jest.mock('@/lib/core/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

jest.mock('@/lib/modules/auth/models/User', () => ({ User: {} }), { virtual: true })

import { connectDB } from '../mongodb'

describe('connectDB', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete (global as any).mongooseCache
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
  })

  it('should export a function', () => {
    expect(typeof connectDB).toBe('function')
  })

  it('should connect to MongoDB', async () => {
    const conn = await connectDB()
    expect(conn).toBeDefined()
  })
})
