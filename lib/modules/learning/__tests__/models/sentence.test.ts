import { Sentence } from '@/lib/modules/learning/models/Sentence'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Sentence Model', () => {
  it('should auto-generate normalizedText and checksum', () => {
    const s = new Sentence({
      text: 'Hello World', languageId: '507f1f77bcf86cd799439011', source: 'manual',
      schemaVersion: 1, contentVersion: 1, metadata: {},
    })
    s.validateSync()
    expect(s.normalizedText).toBe('hello world')
    expect(s.checksum).toBeDefined()
    expect(s.checksum.length).toBe(20)
  })

  it('should have checksum+languageId unique index', () => {
    expect(Sentence.schema.indexes().some((i: any) =>
      JSON.stringify(i[0]) === JSON.stringify({ checksum: 1, languageId: 1 }) && i[1]?.unique
    )).toBe(true)
  })

  it('should have searchIndexDefinition', () => {
    expect((Sentence.schema as any).statics?.searchIndexDefinition).toBeDefined()
  })
})
