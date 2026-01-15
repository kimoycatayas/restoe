import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AcceptInvitationForm from "@/components/auth/accept-invitation-form";

interface AcceptInvitationPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { invite } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Require logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?invite=${invite || ""}`);
  }

  if (!invite) {
    redirect("/");
  }

  // Fetch invitation + restaurant name
  const { data: invitation, error: invitationError } = await supabase
    .from("restaurant_invitations")
    .select(`
      id,
      email,
      status,
      expires_at,
      restaurants (
        id,
        name
      )
    `)
    .eq("token", invite)
    .single();

  if (invitationError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Invalid Invitation</h1>
            <p className="mt-2 text-muted-foreground">
              This invitation link is invalid or has expired.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Validate invitation status
  if (invitation.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Invitation Already Used</h1>
            <p className="mt-2 text-muted-foreground">
              This invitation has already been accepted or revoked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (new Date(invitation.expires_at) <= new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Invitation Expired</h1>
            <p className="mt-2 text-muted-foreground">
              This invitation has expired. Please request a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Validate email matches
  const userEmail = user.email?.toLowerCase();
  const invitationEmail = invitation.email.toLowerCase();

  if (userEmail !== invitationEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Email Mismatch</h1>
            <p className="mt-2 text-muted-foreground">
              This invitation was sent to {invitation.email}, but you're logged in as {user.email}.
              Please log out and sign up with the correct email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const restaurant = invitation.restaurants as { id: string; name: string } | null;

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Restaurant Not Found</h1>
            <p className="mt-2 text-muted-foreground">
              The restaurant associated with this invitation could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Accept Invitation</h1>
          <p className="mt-2 text-muted-foreground">
            You've been invited to join <strong>{restaurant.name}</strong> as Staff
          </p>
        </div>
        <div className="space-y-4">
          <AcceptInvitationForm inviteToken={invite} restaurantId={restaurant.id} />
        </div>
      </div>
    </div>
  );
}
