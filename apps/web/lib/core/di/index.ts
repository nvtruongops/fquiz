export { Container } from './container'

import { Container } from './container'
import { InMemoryCache } from '@/lib/core/cache/in-memory-cache'
import { DynamicAIProvider } from '@/lib/core/ai/dynamic-ai-provider'

export const container = new Container()

// Wire Providers
container.registerSingleton('ICache', () => new InMemoryCache())
container.registerSingleton('IAIProvider', () => new DynamicAIProvider())
