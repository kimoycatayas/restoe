import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CreateRestaurantForm } from "./ui/create-restaurant-form";

export default async function CreateRestaurantPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingMembership, error } = await supabase
    .from("restaurant_users")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    // If we can't determine membership, fail closed and send them to dashboard.
    // Adjust this behavior if you prefer to keep them on this page instead.
    redirect("/");
  }

  if (existingMembership) {
    redirect("/"); // TODO: Update to your dashboard route if different.
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Create your restaurant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This will be your workspace in Restoe.
        </p>

        <div className="mt-6">
          <CreateRestaurantForm />
        </div>
      </div>
    </div>
  );
}
