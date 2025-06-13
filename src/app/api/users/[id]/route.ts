import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic';

// Create a Supabase client with the service role key for admin operations
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const adminSupabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // First check if the requesting user is an admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session found' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Error verifying admin status: ' + profileError.message },
        { status: 500 }
      )
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Check if trying to delete yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // First verify the user exists
    const { data: userToDelete, error: userCheckError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', params.id)
      .single()

    if (userCheckError || !userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // First delete from auth.users using admin client
    try {
      const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(params.id)
      
      if (authDeleteError) {
        console.error('Error deleting from auth.users:', authDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete user authentication: ' + authDeleteError.message },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Error in auth deletion:', error)
      return NextResponse.json(
        { error: 'Failed to delete user authentication' },
        { status: 500 }
      )
    }

    // Then delete from profiles table
    const { error: profileDeleteError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', params.id)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      // Try to log the failed deletion for debugging
      try {
        await adminSupabase.from('deletion_logs').insert({
          user_id: params.id,
          error: profileDeleteError.message,
          attempted_at: new Date().toISOString()
        })
      } catch (logError) {
        console.error('Failed to log deletion error:', logError)
      }
      
      return NextResponse.json(
        { error: 'Failed to delete user profile: ' + profileDeleteError.message },
        { status: 500 }
      )
    }

    // Log successful deletion
    try {
      await adminSupabase.from('user_logs').insert({
        user_id: session.user.id,
        action_type: 'delete_user',
        entity_type: 'user',
        entity_id: params.id,
        details: {
          deleted_user_id: params.id,
          deleted_by: session.user.id,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log user deletion:', logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete user route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    
    // Extract role and permissions from request body
    const { role, permissions } = body
    
    // First check if the requesting user is an admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session found' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Error verifying admin status: ' + profileError.message },
        { status: 500 }
      )
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    // Verify the user to update exists
    const { data: userToUpdate, error: userCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .single()

    if (userCheckError || !userToUpdate) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Update the profile with new role and/or permissions
    const updateData: { role?: string; permissions?: any } = {}
    if (role) updateData.role = role
    if (permissions) updateData.permissions = permissions
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user: ' + updateError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error in update user route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    )
  }
} 