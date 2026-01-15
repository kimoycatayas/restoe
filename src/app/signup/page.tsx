import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SignupForm from "@/components/auth/signup-form";

interface SignupPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { invite } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check if user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && invite) {
    // If logged in and has invite, redirect to accept invitation
    redirect(`/accept-invitation?invite=${invite}`);
  }

  if (user && !invite) {
    // If logged in without invite, redirect to home
    redirect("/");
  }

  // If invite token is present, fetch invitation details
  let invitation = null;
  let invitationError = null;

  if (invite) {
    const { data, error } = await supabase
      .from("restaurant_invitations")
      .select("email, status, expires_at")
      .eq("token", invite)
      .single();

    if (error || !data) {
      invitationError = "Invalid or expired invitation link";
    } else if (data.status !== "pending") {
      invitationError = "This invitation has already been used or revoked";
    } else if (new Date(data.expires_at) <= new Date()) {
      invitationError = "This invitation has expired";
    } else {
      invitation = data;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Restoe</h1>
          <p className="mt-2 text-muted-foreground">
            {invite ? "Create your account to accept the invitation" : "Sign up for your account"}
          </p>
        </div>
        <div className="space-y-4">
          <SignupForm inviteToken={invite} invitation={invitation} invitationError={invitationError} />
        </div>
      </div>
    </div>
  );
}
