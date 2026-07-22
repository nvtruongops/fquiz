import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { requireAdmin } from '@/lib/modules/auth/dal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verify admin access - will throw if not admin
  try {
    await requireAdmin()
  } catch (error) {
    // Not authenticated or not admin - redirect to login
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-app-bg flex">
      <AdminSidebar />
      {/* Desktop: ml-56 để tránh sidebar cố định. Mobile: pt-14 để tránh top bar */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen w-0">
        {children}
      </main>
    </div>
  )
}
