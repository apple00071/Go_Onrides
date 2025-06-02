import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
      .select('id')
      .eq('id', params.id)
      .single()

    if (userCheckError || !userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete from profiles table
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete user profile: ' + profileDeleteError.message },
        { status: 500 }
      )
    }

    // Also delete from auth.users if possible
    try {
      await supabase.auth.admin.deleteUser(params.id)
    } catch (authDeleteError) {
      console.warn('Could not delete from auth.users:', authDeleteError)
      // Don't fail the request if auth deletion fails
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