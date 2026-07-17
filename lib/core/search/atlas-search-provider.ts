import type { ISearchProvider, SearchOptions, SearchResult } from '@/lib/core/search/search-provider-interface'
import { SearchService } from '@/lib/modules/learning/search-service'
import { GeminiProvider } from '@/lib/core/ai/gemini-provider'

const searchService = new SearchService(new GeminiProvider())

export class AtlasSearchProvider implements ISearchProvider {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    return searchService.search(query, options)
  }

  async autocomplete(prefix: string, options?: SearchOptions): Promise<string[]> {
    return searchService.autocomplete(prefix, options)
  }

  async indexDocument(_collection: string, _document: Record<string, unknown>): Promise<void> {
    // Atlas Search tự động index khi document được insert/update vào indexed collection
  }
}
