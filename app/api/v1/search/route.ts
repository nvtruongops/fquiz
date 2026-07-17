import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { SearchService } from '@/lib/modules/learning/search-service'
import { GeminiProvider } from '@/lib/core/ai/gemini-provider'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import type { SearchCollection } from '@/lib/modules/learning/search-service'

const searchService = new SearchService(new GeminiProvider())

export const GET = withAuth(async (req, { payload }: { payload: JWTPayload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const collection = searchParams.get('collection') as SearchCollection | undefined
    const languageId = searchParams.get('languageId') ?? undefined
    const mode = searchParams.get('mode') ?? 'text'

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const limit = Number(searchParams.get('limit') || '20')

    if (mode === 'semantic') {
      const results = await searchService.semanticSearch(q, { limit, languageId })
      return NextResponse.json({ results, mode: 'semantic' })
    }

    const results = await searchService.search(q, { collection, languageId, limit })
    return NextResponse.json({ results, mode: 'text' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })
