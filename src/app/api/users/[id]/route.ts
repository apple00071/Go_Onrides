import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username, role, permissions, newPassword } = body;

    if (!username || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create admin client with service role to bypass RLS
    const { createClient } = await import('@supabase/supabase-js');
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

    // Update profile using admin client
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        username,
        role,
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    // Update password if provided
    if (newPassword && newPassword.trim() !== '') {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password: newPassword }
      );

      if (passwordError) {
        console.error("Error updating password:", passwordError);
        return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error in PATCH /api/users/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don't allow deleting self
    if (id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Create admin client with service role to bypass RLS
    const { createClient } = await import('@supabase/supabase-js');
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

    // Check if the user being deleted exists and get their role
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json({ error: "Admin users cannot be deleted" }, { status: 400 });
    }

    // Delete related records first to avoid foreign key constraint issues
    try {
      // Delete from worker_stats if exists
      await supabaseAdmin
        .from("worker_stats")
        .delete()
        .eq("worker_id", id);

      // Delete from vehicle_assignments if exists
      await supabaseAdmin
        .from("vehicle_assignments")
        .delete()
        .eq("worker_id", id);

      // Delete from notifications if exists
      await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", id);

      // Update profile to remove created_by reference (to avoid circular dependency)
      // The profile will be automatically deleted by CASCADE when we delete from auth.users
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ created_by: null })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating profile before deletion:", updateError);
        // Continue anyway, as this is not critical
      }

      // Delete user from auth.users - this will CASCADE to profiles
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
        throw deleteError;
      }

      return NextResponse.json({ message: "User deleted successfully" });
    } catch (deleteError) {
      console.error("Error during deletion process:", deleteError);
      return NextResponse.json({ 
        error: "Failed to delete user. Please ensure all related data is handled properly." 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in DELETE /api/users/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
