import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthProvider } from '@/lib/auth/context'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TEMPORARILY DISABLED: Allow access without authentication
  // const supabase = await createClient()
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser()

  // if (!user) {
  //   redirect('/login')
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

