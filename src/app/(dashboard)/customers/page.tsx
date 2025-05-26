import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import CustomersList from '@/components/customers/CustomersList'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CustomersPage() {
  try {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ 
    cookies: () => cookieStore
  })
  
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return redirect('/login')
    }

    // Fetch user profile to check role and permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return redirect('/login')
    }

    // Check if user has admin role or viewBookings permission
    if (profile.role !== 'admin' && !profile.permissions.viewBookings) {
      return redirect('/dashboard')
    }

    // Fetch all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      // Don't redirect on customer fetch error, just show empty list
      return (
        <div className="container mx-auto px-4 py-8">
          <CustomersList initialCustomers={[]} />
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <CustomersList initialCustomers={customers || []} />
      </div>
    )
  } catch (error) {
    console.error('Error in CustomersPage:', error)
    return redirect('/login')
  }
} 