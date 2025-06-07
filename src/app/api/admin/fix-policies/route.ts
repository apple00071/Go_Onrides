import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Drop existing policies
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Allow only admins to update payments" ON payments;
        DROP POLICY IF EXISTS "Allow only admins to delete payments" ON payments;
        DROP POLICY IF EXISTS "Allow users to view payments with permission" ON payments;
        DROP POLICY IF EXISTS "Allow users to manage payments with permission" ON payments;
      `
    });

    // Create new policies
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow users to view payments"
        ON payments FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND (
              role = 'admin' OR
              permissions->>'managePayments' = 'true'
            )
          )
        );

        CREATE POLICY "Allow users to manage payments"
        ON payments FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND (
              role = 'admin' OR
              permissions->>'managePayments' = 'true'
            )
          )
        );
      `
    });

    return NextResponse.json({ 
      message: 'Payment policies updated successfully'
    });
  } catch (error) {
    console.error('Error in fix policies:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 