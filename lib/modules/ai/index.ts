/**
 * AI Module Bootstrap
 */
import { registerModel } from '@/lib/core/db/model-registry'
import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import { AILearningLog } from './models/AILearningLog'

registerModel(() => {
  import('./models/AIAsset')
})

registerModel(() => {
  import('./models/AILearningLog')
})

registerUserCleanupHandler('ai', async (userId: string) => {
  await AILearningLog.deleteMany({ createdBy: userId })
})
