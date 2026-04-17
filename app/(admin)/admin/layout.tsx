import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { requireAdmin } from '@/lib/dal'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verify admin access - will throw if not admin
  try {
    await requireAdmin()
  } catch (error) {
    // Not authenticated or not admin - redirect to login
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#EAE7D6] flex">
      <AdminSidebar />
      {/* Desktop: ml-56 để tránh sidebar cố định. Mobile: pt-14 để tránh top bar */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen w-0">
        {children}
      </main>
    </div>
  )
}
