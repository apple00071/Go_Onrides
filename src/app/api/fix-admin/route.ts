import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can run this fix' },
        { status: 403 }
      );
    }

    // Create admin client with service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Run the migration script to create the notifications table
    const { error: createTableError } = await supabaseAdmin.rpc('exec', { 
      query: `
        -- Create notifications table for system events
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          action_link TEXT,
          reference_type TEXT NOT NULL,
          reference_id TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create index for quick access to user-specific notifications
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

        -- Create function to update the updated_at timestamp
        CREATE OR REPLACE FUNCTION update_notification_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger for updated_at if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'set_notification_timestamp'
          ) THEN
            CREATE TRIGGER set_notification_timestamp
            BEFORE UPDATE ON notifications
            FOR EACH ROW
            EXECUTE FUNCTION update_notification_timestamp();
          END IF;
        END $$;

        -- Create RLS policies for notifications
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

        -- Check if policies already exist and create if they don't
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE tablename = 'notifications' AND policyname = 'Allow users to see their own notifications'
          ) THEN
            CREATE POLICY "Allow users to see their own notifications"
            ON notifications FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE tablename = 'notifications' AND policyname = 'Allow users to update their own notifications'
          ) THEN
            CREATE POLICY "Allow users to update their own notifications"
            ON notifications FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid());
          END IF;
        END $$;
      `
    });

    if (createTableError) {
      console.error('Error creating notifications table:', createTableError);
      return NextResponse.json(
        { error: 'Failed to create notifications table', details: createTableError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Notifications table created successfully',
      success: true
    });
  } catch (error) {
    console.error('Error fixing notifications table:', error);
    return NextResponse.json(
      { error: 'Failed to fix notifications table', details: error },
      { status: 500 }
    );
  }
} 