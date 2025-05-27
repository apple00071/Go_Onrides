import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CustomerForm from '@/components/customers/CustomerForm'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit Customer',
  description: 'Edit customer details'
}

interface PageProps {
  params: {
    id: string
  }
  searchParams: Record<string, string | string[] | undefined>
}

export default async function EditCustomerPage(props: PageProps) {
  const { params } = props;
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
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
      <CustomerForm customer={customer} mode="edit" />
    </div>
  )
} 