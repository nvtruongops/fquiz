import { requireAdmin } from '@/lib/auth/dal'
import { AdminSidebar } from '@/components/AdminSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminSidebar user={{ username: admin.username, email: admin.email, role: admin.role }} />
      <div className="flex-1 md:pl-60 flex flex-col min-h-screen">
        <main className="flex-1 p-6 md:p-8 pt-18 md:pt-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
