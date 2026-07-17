import { SentenceVocabulary } from '@/lib/modules/learning/models/SentenceVocabulary'
import { GrammarSentence } from '@/lib/modules/learning/models/GrammarSentence'
import { ParagraphSentence } from '@/lib/modules/learning/models/ParagraphSentence'
import type { VocabularyRepository } from '@/lib/modules/learning/repositories/vocabulary.repository'
import type { GrammarRepository } from '@/lib/modules/learning/repositories/grammar.repository'
import type { SentenceRepository } from '@/lib/modules/learning/repositories/sentence.repository'

export interface SentenceWithRelations {
  sentence: Record<string, unknown>
  vocabularies: Array<{ vocabulary: Record<string, unknown>; senseId?: string; meaningInContext?: string }>
  grammarPatterns: Array<{ grammar: Record<string, unknown>; matchedText?: string; startOffset: number; endOffset: number }>
  paragraphs: Array<{ paragraphId: string; order: number }>
}

/**
 * SentenceReadRepository — Gộp toàn bộ logic join Sentence → Vocabulary/Grammar/Paragraph.
 * Service KHÔNG tự join nhiều repository — tất cả tập trung ở đây.
 */
export class SentenceReadRepository {
  constructor(
    private sentenceRepo: SentenceRepository,
    private vocabRepo: VocabularyRepository,
    private grammarRepo: GrammarRepository,
  ) {}

  async getSentenceWithRelations(sentenceId: string): Promise<SentenceWithRelations | null> {
    const sentence = await this.sentenceRepo.findById(sentenceId)
    if (!sentence) return null

    // 1. Lấy tất cả SentenceVocabulary links
    const vocabLinks = await SentenceVocabulary.find({ sentenceId }).lean()

    // 2. Batch query Vocabulary
    const vocabIds = vocabLinks.map((l: any) => l.vocabularyId.toString())
    const vocabularies = vocabIds.length > 0 ? await this.vocabRepo.findByIds(vocabIds) : []
    const vocabMap = new Map(vocabularies.map((v: any) => [v._id.toString(), v]))

    // 3. Lấy tất cả GrammarSentence links
    const grammarLinks = await GrammarSentence.find({ sentenceId }).lean()

    // 4. Batch query GrammarPattern
    const grammarIds = grammarLinks.map((l: any) => l.grammarId.toString())
    const grammarPatterns = grammarIds.length > 0 ? await this.grammarRepo.findByIds(grammarIds) : []
    const grammarMap = new Map(grammarPatterns.map((g: any) => [g._id.toString(), g]))

    // 5. Lấy paragraph links
    const paragraphLinks = await ParagraphSentence.find({ sentenceId }).sort({ order: 1 }).lean()

    return {
      sentence: sentence as any,
      vocabularies: vocabLinks.map((l: any) => ({
        vocabulary: vocabMap.get(l.vocabularyId.toString()) || null,
        senseId: l.senseId || null,
        meaningInContext: l.meaningInContext || null,
      })),
      grammarPatterns: grammarLinks.map((l: any) => ({
        grammar: grammarMap.get(l.grammarId.toString()) || null,
        matchedText: l.matchedText || null,
        startOffset: l.startOffset,
        endOffset: l.endOffset,
      })),
      paragraphs: paragraphLinks.map((l: any) => ({
        paragraphId: l.paragraphId.toString(),
        order: l.order,
      })),
    }
  }

  /** Lấy tất cả sentences trong một paragraph, kèm vocabulary/grammar */
  async getParagraphSentencesWithRelations(paragraphId: string): Promise<SentenceWithRelations[]> {
    const links = await ParagraphSentence.find({ paragraphId }).sort({ order: 1 }).lean()
    const sentenceIds = links.map((l: any) => l.sentenceId.toString())
    if (sentenceIds.length === 0) return []

    const results = await Promise.all(sentenceIds.map((id) => this.getSentenceWithRelations(id)))
    return results.filter((r): r is SentenceWithRelations => r !== null)
  }
}
