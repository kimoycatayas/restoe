import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { RemoveStaffButton } from "@/components/staff/remove-staff-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StaffPageProps {
  params: Promise<{ restaurantId: string }>;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: "owner" | "staff" | "member";
  created_at: string;
  email: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { restaurantId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if current user is owner
  const { data: currentUserRole } = await supabase
    .from("restaurant_users")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .single();

  if (!currentUserRole || currentUserRole.role !== "owner") {
    redirect(`/r/${restaurantId}`);
  }

  // Fetch restaurant_users for this restaurant
  const { data: restaurantUsers, error } = await supabase
    .from("restaurant_users")
    .select("id, user_id, role, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff:", error);
  }

  // Fetch pending invitations for this restaurant
  const { data: pendingInvitations, error: invitationsError } = await supabase
    .from("restaurant_invitations")
    .select("id, email, status, expires_at, created_at")
    .eq("restaurant_id", restaurantId)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });

  if (invitationsError) {
    console.error("Error fetching invitations:", invitationsError);
  }

  // Fetch user emails using RPC function
  const userEmailsMap = new Map<string, string>();
  
  if (restaurantUsers && restaurantUsers.length > 0) {
    const userIds = restaurantUsers.map((ru) => ru.user_id);
    const { data: userEmails, error: emailsError } = await supabase.rpc(
      "get_user_emails_by_ids",
      { user_ids: userIds }
    );

    if (emailsError) {
      console.error("Error fetching user emails:", emailsError);
    } else if (userEmails) {
      userEmails.forEach((ue: { user_id: string; email: string }) => {
        userEmailsMap.set(ue.user_id, ue.email);
      });
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staff</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your restaurant staff members
          </p>
        </div>
        <InviteStaffDialog restaurantId={restaurantId} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {restaurantUsers && restaurantUsers.length > 0 ? (
              restaurantUsers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {userEmailsMap.get(member.user_id) || member.user_id.substring(0, 8) + "..."}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.role === "owner"
                          ? "default"
                          : member.role === "staff"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "owner" && (
                      <RemoveStaffButton
                        restaurantId={restaurantId}
                        restaurantUserId={member.id}
                        userRole={member.role}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
