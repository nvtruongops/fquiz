import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Vocabulary Model', () => {
  it('should auto-generate normalizedLemma on validate', () => {
    const v = new Vocabulary({
      lemma: 'Café', display: 'Café', definition: 'A coffee shop', partOfSpeech: 'noun',
      languageId: '507f1f77bcf86cd799439011', source: 'manual',
      schemaVersion: 1, contentVersion: 1, metadata: {},
    })
    v.validateSync()
    expect(v.normalizedLemma).toBe('cafe')
  })

  it('should require lemma + languageId unique', () => {
    expect(Vocabulary.schema.indexes().some((i: any) =>
      JSON.stringify(i[0]) === JSON.stringify({ lemma: 1, languageId: 1 }) && i[1]?.unique
    )).toBe(true)
  })

  it('should have searchIndexDefinition', () => {
    expect((Vocabulary.schema as any).statics?.searchIndexDefinition).toBeDefined()
  })
})
