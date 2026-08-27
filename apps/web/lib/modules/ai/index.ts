/**
 * AI Module Bootstrap
 */
import { registerModel } from '@/lib/core/db/model-registry'
import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import { container } from '@/lib/core/di'
import type { IAIProvider } from '@/lib/core/ai/ai-provider-interface'
import type { ICache } from '@/lib/core/cache/cache-interface'
import { AIContentService } from './services/ai-content.service'
import { AILearningLog } from './models/AILearningLog'

registerModel(() => {
  import('./models/AIAsset')
})

registerModel(() => {
  import('./models/AILearningLog')
})

if (!container.has('AIContentService')) {
  container.registerSingleton('AIContentService', () => new AIContentService(
    container.resolve<IAIProvider>('IAIProvider'),
    container.resolve<ICache>('ICache')
  ))
}

registerUserCleanupHandler('ai', async (userId: string) => {
  await AILearningLog.deleteMany({ createdBy: userId })
})
