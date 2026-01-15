"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function acceptInvitation(
  token: string
): Promise<{ success: boolean; restaurantId?: string; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Call the RPC function to accept invitation
  const { data: restaurantId, error } = await supabase.rpc("accept_restaurant_invitation", {
    p_token: token,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!restaurantId) {
    return { success: false, error: "Failed to accept invitation" };
  }

  revalidatePath(`/r/${restaurantId}`);
  return { success: true, restaurantId };
}
