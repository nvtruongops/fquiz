import Link from 'next/link'
import CourseQuizList from '@/components/student/CourseQuizList'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#EAE7D6' }}>
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
          style={{ color: '#5D7B6F' }}
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#5D7B6F' }}>
          {code}
        </h1>
        <CourseQuizList code={code} />
      </div>
    </div>
  )
}
