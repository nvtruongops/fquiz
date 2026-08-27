/**
 * Community Module Bootstrap
 */
import { registerModel } from '@/lib/core/db/model-registry'
import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import { Post } from './models/Post'

registerModel(() => {
  import('./models/Post')
})

registerUserCleanupHandler('community', async (userId: string) => {
  // 1. Delete all Community Posts authored by user
  await Post.deleteMany({ authorId: userId })

  // 2. Remove user comments, likes, and views from remaining Community Posts
  await Post.updateMany(
    {},
    {
      $pull: {
        comments: { authorId: userId },
        likes: userId,
        views: userId,
      },
    }
  )
})
