import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '@/lib/modules/community/models/Post'
import mongoose from 'mongoose'
import { z } from 'zod'

const SearchParamsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().max(200).optional(),
})

const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150, 'Title must be less than 150 characters'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be less than 10000 characters'),
  tags: z.array(z.string().max(50)).optional(),
})

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getErrorDetails(error: unknown): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined
  if (error instanceof Error) return error.message
  return String(error)
}

import { Category } from '@/lib/modules/quiz/models/Category'

export async function GET(req: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)

    const parsed = SearchParamsSchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      }, { status: 400 })
    }

    const page = Math.max(1, parsed.data.page ? Number.parseInt(parsed.data.page, 10) : 1)
    const limit = Math.max(1, Math.min(parsed.data.limit ? Number.parseInt(parsed.data.limit, 10) : 10, 100))
    const skip = Math.min((page - 1) * limit, 10000)
    const search = parsed.data.search

    let query: any = {}
    if (search) {
      const escapedSearch = escapeRegex(search)
      query = {
        $or: [
          { title: { $regex: escapedSearch, $options: 'i' } },
          { tags: { $regex: escapedSearch, $options: 'i' } },
          { content: { $regex: escapedSearch, $options: 'i' } }
        ]
      }
    }

    const [posts, total, tagAgg, categories] = await Promise.all([
      Post.find(query)
        .select('title content authorId authorName tags likes views comments createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
      Post.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Category.find({ is_public: true, status: 'approved' })
        .select('name')
        .limit(10)
        .lean()
    ])

    const realPostTags = tagAgg.map((t: any) => String(t._id || '').trim()).filter(Boolean)
    const categoryNames = categories.map((c: any) => String(c.name || '').trim()).filter(Boolean)
    const popularTags = Array.from(new Set([...realPostTags, ...categoryNames])).slice(0, 10)

    return NextResponse.json({
      posts,
      popularTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Fetch posts error:', error)
    return NextResponse.json({
      error: 'Failed to fetch posts',
      details: getErrorDetails(error)
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = CreatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      }, { status: 400 })
    }

    const { title, content, tags } = parsed.data

    const { default: DOMPurify } = await import('isomorphic-dompurify')
    const cleanTitle = DOMPurify.sanitize(title)
    const cleanContent = DOMPurify.sanitize(content)

    await connectDB()

    const post = await Post.create({
      title: cleanTitle,
      content: cleanContent,
      tags: tags || [],
      authorId: new mongoose.Types.ObjectId(session.userId),
      authorName: session.username,
      likes: [],
      comments: []
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: any) {
    console.error('Create post error:', error)
    return NextResponse.json({
      error: 'Failed to create post',
      details: getErrorDetails(error)
    }, { status: 500 })
  }
}
