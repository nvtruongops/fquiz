import { promptRegistry } from '../prompts/registry'
import { GeneratedVocabularySchema } from '../prompts/vocabulary-generation'

describe('AI Module Prompt Registry & Schemas Test Suite', () => {
  test('promptRegistry exposes all required AI prompt generators', () => {
    expect(promptRegistry.vocabulary).toBeDefined()
    expect(promptRegistry.sentence).toBeDefined()
    expect(promptRegistry.paragraph).toBeDefined()
    expect(promptRegistry.grammar).toBeDefined()
    expect(promptRegistry.quiz).toBeDefined()
    expect(promptRegistry.flashcard).toBeDefined()
    expect(promptRegistry.translation).toBeDefined()
  })

  test('GeneratedVocabularySchema validates structured JSON output', () => {
    const validVocabulary = {
      lemma: 'resilient',
      display: 'Resilient',
      ipa: '/rɪˈzɪl.jənt/',
      definition: 'Có khả năng phục hồi nhanh chóng',
      partOfSpeech: 'adjective',
      examples: ['He is resilient in the face of adversity.'],
      cefrLevel: 'B2',
      synonyms: ['tough', 'adaptable'],
    }

    const parsed = GeneratedVocabularySchema.safeParse(validVocabulary)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.lemma).toBe('resilient')
      expect(parsed.data.examples).toHaveLength(1)
    }
  })

  test('GeneratedVocabularySchema fails when mandatory fields are missing', () => {
    const invalidVocabulary = {
      display: 'Resilient',
      // missing lemma and definition
      examples: [],
    }

    const parsed = GeneratedVocabularySchema.safeParse(invalidVocabulary)
    expect(parsed.success).toBe(false)
  })

  test('vocabularyGeneration builds prompt string with expected constraints', () => {
    const promptText = promptRegistry.vocabulary.buildPrompt({
      language: 'English',
      explanationLanguage: 'Vietnamese',
      word: 'perseverance',
      cefr: 'C1',
    })

    expect(promptText).toContain('English')
    expect(promptText).toContain('Vietnamese')
    expect(promptText).toContain('perseverance')
    expect(promptText).toContain('C1')
  })
})
