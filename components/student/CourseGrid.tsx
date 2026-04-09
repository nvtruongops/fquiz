'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

async function fetchCourses(): Promise<string[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/courses`)
  if (!res.ok) throw new Error('Failed to fetch courses')
  const data = await res.json()
  return data.courses as string[]
}

function CourseSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-lg animate-pulse"
          style={{ backgroundColor: '#B0D4B8' }}
        />
      ))}
    </div>
  )
}

export default function CourseGrid() {
  const { data: courses, isLoading, isError } = useQuery<string[]>({
    queryKey: ['courses'],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) return <CourseSkeleton />

  if (isError) {
    return (
      <div className="text-center py-12 text-red-600">
        Failed to load courses. Please try again later.
      </div>
    )
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No courses available yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {courses.map((code) => (
        <Link key={code} href={`/courses/${code}`}>
          <Card
            className="h-28 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 hover:shadow-md border-0"
            style={{ backgroundColor: '#B0D4B8' }}
          >
            <CardContent className="p-4 flex items-center justify-center w-full h-full">
              <span
                className="text-xl font-bold text-center tracking-wide"
                style={{ color: '#5D7B6F' }}
              >
                {code}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
