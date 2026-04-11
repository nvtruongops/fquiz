import { getServerUser } from '@/lib/get-server-user'
import QuizLayoutClient from '@/components/QuizLayoutClient'

export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getServerUser()
  return <QuizLayoutClient initialUser={initialUser}>{children}</QuizLayoutClient>
}
