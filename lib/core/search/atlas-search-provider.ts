import type { ISearchProvider, SearchOptions, SearchResult } from '@/lib/core/search/search-provider-interface'

/**
 * AtlasSearchProvider — MongoDB Atlas Search implementation.
 *
 * TODO Phase 4:
 * - Configure Atlas Search indexes via MongoDB Atlas UI
 * - Use $search operator for fuzzy/autocomplete/text
 * - Use $vectorSearch for semantic search
 * - Implement hybrid search with Reciprocal Rank Fusion (RRF)
 */
export class AtlasSearchProvider implements ISearchProvider {
  async search(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    // TODO: Implement with MongoDB Atlas $search aggregation
    throw new Error('AtlasSearchProvider.search() not yet implemented — Phase 4')
  }

  async autocomplete(_prefix: string, _options?: SearchOptions): Promise<string[]> {
    // TODO: Implement with edgeGram analyzer
    throw new Error('AtlasSearchProvider.autocomplete() not yet implemented — Phase 4')
  }

  async indexDocument(_collection: string, _document: Record<string, unknown>): Promise<void> {
    // Atlas Search tự động index khi document được insert/update vào indexed collection
    // Không cần thao tác thủ công
  }
}
