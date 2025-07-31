import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update the specific user's permissions
    const { error } = await supabase
      .from('profiles')
      .update({
        permissions: {
          createBooking: true,
          viewBookings: true,
          managePayments: true,
          accessReports: true,
          viewCustomers: true
        }
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error updating permissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Permissions updated successfully',
      userId: session.user.id
    });
  } catch (error) {
    console.error('Error in update permissions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 