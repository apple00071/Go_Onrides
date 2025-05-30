import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import CustomersList from '@/components/customers/CustomersList'
import type { Database } from '@/types/database'

interface CustomerListItem {
  id: string
  name: string
  email: string
  phone: string
  temp_address_street: string | null
  perm_address_street: string | null
  created_at: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CustomersPage() {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient<Database>({ 
      cookies: () => cookieStore
    })
  
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return redirect('/login')
    }

    // Fetch user profile to check role and permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    if (!profile) {
      console.error('No profile found')
      return redirect('/login')
    }

    // Check if user has admin role or viewCustomers permission
    if (profile.role !== 'admin' && !profile.permissions?.viewCustomers) {
      return redirect('/dashboard')
    }

    // Fetch all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        temp_address_street,
        perm_address_street,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      // Show empty list with error state
      return (
        <div className="container mx-auto px-4 py-8">
          <CustomersList initialCustomers={[]} error={customersError.message} />
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
    return (
      <div className="container mx-auto px-4 py-8">
        <CustomersList 
          initialCustomers={[]} 
          error={error instanceof Error ? error.message : 'An unexpected error occurred'} 
        />
      </div>
    )
  }
} 