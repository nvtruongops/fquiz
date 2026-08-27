import mongoose, { Schema } from 'mongoose'
import type { IPost, IComment } from '../entities/community.types'

const CommentSchema = new Schema<IComment>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const PostSchema = new Schema<IPost>({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  content: { type: String, required: true, maxlength: 10000 },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  views: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema]
}, { timestamps: true })

PostSchema.index({ title: 'text', tags: 'text', content: 'text' })
PostSchema.index({ createdAt: -1 })

export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema)
