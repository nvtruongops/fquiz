/**
 * AI Module Bootstrap
 */
import { registerModel } from '@/lib/core/db/model-registry'

registerModel(() => {
  import('./models/AIAsset')
})
