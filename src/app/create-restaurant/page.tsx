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

  // Check if user already has any restaurant memberships
  const { data: memberships, error } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1);

  // If error, we'll allow them to stay on the page and try creating
  // The INSERT policy will handle authorization checks
  // If they have existing memberships, redirect to their first restaurant
  if (!error && memberships && memberships.length > 0) {
    redirect(`/r/${memberships[0].restaurant_id}`);
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
