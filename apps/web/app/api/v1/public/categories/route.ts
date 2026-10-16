import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPublicCategories } from '@/lib/modules/quiz/services/category.service'
import { checkPublicApiRateLimit } from '@/lib/core/security/rate-limit/public-api'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await checkPublicApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const data = await getPublicCategories()

    const response = NextResponse.json({ data })

    // Add cache headers for public data (1 min edge cache, 2 min SWR)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
