import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EAE7D6] flex">
      <AdminSidebar />
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  )
}
