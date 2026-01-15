"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function inviteStaff(
  restaurantId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify current user is owner
  const { data: currentUserRole } = await supabase
    .from("restaurant_users")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .single();

  if (!currentUserRole || currentUserRole.role !== "owner") {
    return { success: false, error: "Only owners can invite staff" };
  }

  // Look up user by email
  const { data: userData, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { search_email: email }
  );

  if (lookupError) {
    return { success: false, error: "Error looking up user" };
  }

  if (!userData || userData.length === 0) {
    return { success: false, error: "User not found. Please ensure the user has an account." };
  }

  const targetUserId = userData[0].id;

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("restaurant_users")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", targetUserId)
    .single();

  if (existingMember) {
    return { success: false, error: "User is already a member of this restaurant" };
  }

  // Insert into restaurant_users
  const { error: insertError } = await supabase
    .from("restaurant_users")
    .insert({
      restaurant_id: restaurantId,
      user_id: targetUserId,
      role: "staff",
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/r/${restaurantId}/staff`);
  return { success: true };
}

export async function removeStaff(
  restaurantId: string,
  restaurantUserId: string
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify current user is owner
  const { data: currentUserRole } = await supabase
    .from("restaurant_users")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .single();

  if (!currentUserRole || currentUserRole.role !== "owner") {
    return { success: false, error: "Only owners can remove staff" };
  }

  // Get the restaurant_user record to verify it belongs to this restaurant
  const { data: restaurantUser } = await supabase
    .from("restaurant_users")
    .select("id, role")
    .eq("id", restaurantUserId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!restaurantUser) {
    return { success: false, error: "Staff member not found" };
  }

  // Prevent removing owners
  if (restaurantUser.role === "owner") {
    return { success: false, error: "Cannot remove owner" };
  }

  // Delete the restaurant_user record
  const { error: deleteError } = await supabase
    .from("restaurant_users")
    .delete()
    .eq("id", restaurantUserId)
    .eq("restaurant_id", restaurantId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath(`/r/${restaurantId}/staff`);
  return { success: true };
}
