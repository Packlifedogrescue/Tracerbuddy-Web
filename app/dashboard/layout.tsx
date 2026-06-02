import Sidebar from '@/components/Sidebar'
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      {/* pb-20 on mobile = clears the bottom tab bar; md:pb-0 removes it on desktop */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
    </div>
  )
}
