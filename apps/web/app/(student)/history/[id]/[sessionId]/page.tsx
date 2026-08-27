import { redirect } from 'next/navigation'

interface HistoryDetailRedirectProps {
  params: Promise<{ id: string; sessionId: string }>
}

export default async function HistoryDetailRedirectPage({ params }: Readonly<HistoryDetailRedirectProps>) {
  const { id, sessionId } = await params
  redirect(`/quiz/${id}/result/${sessionId}`)
}
