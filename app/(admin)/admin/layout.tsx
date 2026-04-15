import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
