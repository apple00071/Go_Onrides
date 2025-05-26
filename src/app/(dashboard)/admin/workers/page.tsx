import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import WorkerManagement from '@/components/admin/WorkerManagement'

export const dynamic = 'force-dynamic'

export default async function WorkersPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch user role
  const { data: userRole } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Only allow admin access
  if (userRole?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch all workers
  const { data: workers } = await supabase
    .from('users')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <WorkerManagement initialWorkers={workers || []} />
    </div>
  )
} 