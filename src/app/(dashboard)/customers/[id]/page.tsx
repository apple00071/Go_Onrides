import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CustomerDetail from '@/components/customers/CustomerDetail'

interface Props {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'

export default async function CustomerPage({ params }: Props) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch customer details
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!customer) {
    redirect('/customers')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CustomerDetail customer={customer} />
    </div>
  )
} 