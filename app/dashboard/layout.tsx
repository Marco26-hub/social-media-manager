import Sidebar from '@/components/Sidebar'
import DemoBanner from '@/components/DemoBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <DemoBanner />
        {children}
      </main>
    </div>
  )
}
