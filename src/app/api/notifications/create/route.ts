import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  try {
    const { title, message, actionLink, referenceType, referenceId, targetRoles, targetUserIds } = await request.json();
    
    // Validate required fields
    if (!title || !message || !referenceType || !referenceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Ensure at least one target (roles or specific users)
    if ((!targetRoles || !targetRoles.length) && (!targetUserIds || !targetUserIds.length)) {
      return NextResponse.json(
        { error: 'No notification targets specified' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Validate that the requesting user is authenticated and has permission
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
        { error: 'Forbidden: Only admins can create notifications' },
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
    
    // Find users to notify
    let usersToNotify: string[] = [];
    
    // Add users by role if specified
    if (targetRoles && targetRoles.length) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('role', targetRoles);
      
      if (usersError) {
        throw usersError;
      }
      
      usersToNotify = [...usersToNotify, ...users.map(u => u.id)];
    }
    
    // Add specific users if specified
    if (targetUserIds && targetUserIds.length) {
      // Create a set and convert back to array to remove duplicates
      const uniqueUsers = Array.from(new Set([...usersToNotify, ...targetUserIds]));
      usersToNotify = uniqueUsers;
    }
    
    // Create notifications for each user
    const notifications = usersToNotify.map(userId => ({
      user_id: userId,
      title,
      message,
      action_link: actionLink || null,
      reference_type: referenceType,
      reference_id: referenceId,
      is_read: false
    }));
    
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);
    
    if (insertError) {
      throw insertError;
    }
    
    return NextResponse.json({
      message: `Created ${notifications.length} notifications`,
      success: true
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to create notifications' },
      { status: 500 }
    );
  }
} 