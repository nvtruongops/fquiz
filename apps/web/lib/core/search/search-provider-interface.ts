/**
 * ISearchProvider — Search abstraction for vocabulary, sentence, paragraph.
 *
 * Implementations:
 * - AtlasSearchProvider (MongoDB Atlas Search — Phase 4)
 * - MeilisearchProvider (future)
 * - ElasticProvider (future)
 */

export interface SearchOptions {
  languageId?: string
  cefrLevel?: string
  limit?: number
  offset?: number
}

export interface SearchResult {
  id: string
  collection: string
  score: number
  highlight?: Record<string, string[]>
  document: Record<string, unknown>
}

export interface ISearchProvider {
  /** Full-text / semantic search */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>

  /** Autocomplete suggestions */
  autocomplete(prefix: string, options?: SearchOptions): Promise<string[]>

  /** Index a single document */
  indexDocument(collection: string, document: Record<string, unknown>): Promise<void>
}
