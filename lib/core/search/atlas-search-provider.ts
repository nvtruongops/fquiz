import type { ISearchProvider, SearchOptions, SearchResult } from '@/lib/core/search/search-provider-interface'

export class AtlasSearchProvider implements ISearchProvider {
  async search(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    return []
  }

  async autocomplete(_prefix: string, _options?: SearchOptions): Promise<string[]> {
    return []
  }

  async indexDocument(_collection: string, _document: Record<string, unknown>): Promise<void> {
    // Atlas Search auto-indexes documents on insert/update
  }
}
