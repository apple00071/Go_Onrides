import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const adminEmail = 'applegraphicshyd@gmail.com'

  try {
    // First, get the user's session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if the current user is the admin
    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const adminPermissions = {
      createBooking: true,
      viewBookings: true,
      uploadDocuments: true,
      viewDocuments: true,
      managePayments: true,
      accessReports: true
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        email: adminEmail,
        role: 'admin',
        permissions: adminPermissions
      })

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in fix-admin:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 