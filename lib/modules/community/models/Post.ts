import mongoose, { Schema, Document } from 'mongoose'

export interface IComment {
  _id?: mongoose.Types.ObjectId
  authorId: mongoose.Types.ObjectId
  authorName: string
  content: string
  createdAt: Date
}

export interface IPost extends Document {
  title: string
  content: string
  authorId: mongoose.Types.ObjectId
  authorName: string
  tags: string[]
  likes: mongoose.Types.ObjectId[]
  comments: IComment[]
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new Schema<IComment>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const PostSchema = new Schema<IPost>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 10000 },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema]
}, { timestamps: true })

// Add text index for search
PostSchema.index({ title: 'text', tags: 'text' })
// Support sorting by newest first
PostSchema.index({ createdAt: -1 })

export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema)
