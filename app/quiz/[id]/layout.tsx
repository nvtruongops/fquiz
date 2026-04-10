import { getServerUser } from '@/lib/get-server-user'
import NavbarWrapper from '@/components/NavbarWrapper'

export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getServerUser()
  return <NavbarWrapper initialUser={initialUser}>{children}</NavbarWrapper>
}
