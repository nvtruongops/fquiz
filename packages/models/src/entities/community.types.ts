import type { Types, Document } from 'mongoose'

export interface IComment {
  _id?: Types.ObjectId
  authorId: Types.ObjectId
  authorName: string
  content: string
  createdAt: Date
}

export interface IPost extends Document {
  title: string
  content: string
  authorId: Types.ObjectId
  authorName: string
  tags: string[]
  likes: Types.ObjectId[]
  views: Types.ObjectId[]
  comments: IComment[]
  createdAt: Date
  updatedAt: Date
}
