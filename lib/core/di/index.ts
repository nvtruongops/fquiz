export { Container } from './container'

import { Container } from './container'
import { InMemoryEventBus } from '@/lib/core/events/in-memory-event-bus'
import { InMemoryCache } from '@/lib/core/cache/in-memory-cache'
import { AtlasSearchProvider } from '@/lib/core/search/atlas-search-provider'
import { DynamicAIProvider } from '@/lib/core/ai/dynamic-ai-provider'

export const container = new Container()

// Wire Providers
container.registerSingleton('IEventBus', () => new InMemoryEventBus())
container.registerSingleton('ICache', () => new InMemoryCache())
container.registerSingleton('ISearchProvider', () => new AtlasSearchProvider())
container.registerSingleton('IAIProvider', () => new DynamicAIProvider())
