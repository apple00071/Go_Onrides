import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        role,
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    // Update password if provided
    if (newPassword && newPassword.trim() !== '') {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        params.id,
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
  { params }: { params: { id: string } }
) {
  try {
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
    if (params.id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Check if the user being deleted is an admin
    const { data: targetUser, error: targetUserError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", params.id)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json({ error: "Admin users cannot be deleted" }, { status: 400 });
    }

    // Delete user from auth (this will cascade to profiles due to FK constraint)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(params.id);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/users/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
