import { connectDB } from '@/lib/core/db/mongodb'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import { Sentence } from '@/lib/modules/learning/models/Sentence'
import { GrammarPattern } from '@/lib/modules/learning/models/GrammarPattern'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import type { IAIProvider } from '@/lib/core/ai/ai-provider-interface'
import type { SearchOptions, SearchResult } from '@/lib/core/search/search-provider-interface'

export type SearchCollection = 'vocabulary' | 'sentence' | 'grammar' | 'quiz'

export class SearchService {
  constructor(private aiProvider: IAIProvider) {}

  async search(query: string, options?: SearchOptions & { collection?: SearchCollection }): Promise<SearchResult[]> {
    await connectDB()
    const limit = options?.limit ?? 20
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const results: SearchResult[] = []

    const collections = options?.collection ? [options.collection] : ['vocabulary', 'sentence', 'grammar', 'quiz'] as SearchCollection[]

    if (collections.includes('vocabulary')) {
      results.push(...await this.searchVocabulary(regex, limit, options?.languageId))
    }

    if (collections.includes('sentence')) {
      results.push(...await this.searchSentence(regex, limit, options?.languageId))
    }

    if (collections.includes('grammar')) {
      results.push(...await this.searchGrammar(regex, limit, options?.languageId))
    }

    if (collections.includes('quiz')) {
      results.push(...await this.searchQuiz(regex, limit))
    }

    return results
  }

  private async searchVocabulary(regex: RegExp, limit: number, languageId?: string): Promise<SearchResult[]> {
    const docs = await Vocabulary.find({
      $or: [
        { lemma: regex },
        { definition: regex },
        { display: regex },
        { normalizedLemma: regex },
      ],
      ...(languageId ? { languageId } : {}),
    }).limit(limit).lean()

    return docs.map((doc) => ({
      id: doc._id.toString(),
      collection: 'vocabulary' as const,
      score: 1,
      document: {
        lemma: doc.lemma,
        display: doc.display,
        definition: doc.definition,
        partOfSpeech: doc.partOfSpeech,
        cefrLevel: doc.cefrLevel,
      } as unknown as Record<string, unknown>,
    }))
  }

  private async searchSentence(regex: RegExp, limit: number, languageId?: string): Promise<SearchResult[]> {
    const docs = await Sentence.find({
      $or: [
        { text: regex },
        { translation: regex },
        { normalizedText: regex },
      ],
      ...(languageId ? { languageId } : {}),
    }).limit(limit).lean()

    return docs.map((doc) => ({
      id: doc._id.toString(),
      collection: 'sentence' as const,
      score: 1,
      document: {
        text: doc.text,
        translation: doc.translation,
        cefrLevel: doc.cefrLevel,
      } as unknown as Record<string, unknown>,
    }))
  }

  private async searchGrammar(regex: RegExp, limit: number, languageId?: string): Promise<SearchResult[]> {
    const docs = await GrammarPattern.find({
      $or: [
        { name: regex },
        { pattern: regex },
        { explanation: regex },
      ],
      ...(languageId ? { languageId } : {}),
    }).limit(limit).lean()

    return docs.map((doc) => ({
      id: doc._id.toString(),
      collection: 'grammar' as const,
      score: 1,
      document: {
        name: doc.name,
        pattern: doc.pattern,
        explanation: doc.explanation,
        cefrLevel: doc.cefrLevel,
      } as unknown as Record<string, unknown>,
    }))
  }

  private async searchQuiz(regex: RegExp, limit: number): Promise<SearchResult[]> {
    const docs = await Quiz.find({
      $or: [
        { title: regex },
        { description: regex },
      ],
      status: 'published',
    }).limit(limit).lean()

    return docs.map((doc) => ({
      id: doc._id.toString(),
      collection: 'quiz' as const,
      score: 1,
      document: {
        title: doc.title,
        description: doc.description,
      } as unknown as Record<string, unknown>,
    }))
  }

  async semanticSearch(text: string, options?: { limit?: number; languageId?: string }): Promise<SearchResult[]> {
    await connectDB()

    const embedding = await this.aiProvider.embed(text)
    if (!embedding.embedding || embedding.embedding.length === 0) return []

    const limit = options?.limit ?? 10
    const results: SearchResult[] = []

    const parallelQueries = [
      this.vectorSearch('vocabularyembeddings', embedding.embedding, '_id', limit, options?.languageId),
      this.vectorSearch('sentenceembeddings', embedding.embedding, 'sentenceId', limit, options?.languageId),
    ] as const

    const vectors = await Promise.all(parallelQueries)
    ;(vectors[0] ?? []).forEach((doc: any) => {
      results.push({
        id: doc._id?.toString() ?? '',
        collection: 'vocabulary',
        score: doc.score ?? 0,
        document: doc as Record<string, unknown>,
      })
    })
    ;(vectors[1] ?? []).forEach((doc: any) => {
      results.push({
        id: doc._id?.toString() ?? '',
        collection: 'sentence',
        score: doc.score ?? 0,
        document: doc as Record<string, unknown>,
      })
    })

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  private async vectorSearch(
    collectionName: string,
    vector: number[],
    foreignField: string,
    limit: number,
    _languageId?: string,
  ): Promise<any[]> {
    try {
      const mongoose = await import('mongoose')
      const db = mongoose.default.connection.db
      if (!db) return []

      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: `${collectionName}_vector_index`,
            path: 'embedding',
            queryVector: vector,
            numCandidates: limit * 10,
            limit,
          },
        },
        { $limit: limit },
      ]

      return await db.collection(collectionName).aggregate(pipeline).toArray()
    } catch {
      return []
    }
  }

  async autocomplete(prefix: string, options?: SearchOptions): Promise<string[]> {
    await connectDB()
    const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const [vocabResults, sentenceResults] = await Promise.all([
      Vocabulary.find({
        $or: [{ lemma: regex }, { display: regex }],
        ...(options?.languageId ? { languageId: options.languageId } : {}),
      }).limit(5).select('lemma display').lean(),
      Sentence.find({
        text: regex,
        ...(options?.languageId ? { languageId: options.languageId } : {}),
      }).limit(5).select('text translation').lean(),
    ])

    const suggestions = [
      ...vocabResults.map((v) => v.display || v.lemma),
      ...sentenceResults.map((s) => s.text.substring(0, 60)),
    ]

    return suggestions.slice(0, 10)
  }
}
