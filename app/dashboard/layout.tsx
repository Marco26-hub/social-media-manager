import Sidebar from '@/components/Sidebar'
import DemoBanner from '@/components/DemoBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex min-h-screen w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden">
        <DemoBanner />
        {children}
      </main>
    </div>
  )
}
