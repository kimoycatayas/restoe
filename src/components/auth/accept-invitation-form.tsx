"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

interface AcceptInvitationFormProps {
  inviteToken: string;
  restaurantId: string;
}

export default function AcceptInvitationForm({ inviteToken, restaurantId }: AcceptInvitationFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  async function handleAccept() {
    setIsLoading(true);

    try {
      // Call the RPC function to accept invitation
      const { data, error } = await supabase.rpc("accept_restaurant_invitation", {
        p_token: inviteToken,
      });

      if (error) {
        toast.error(error.message || "Failed to accept invitation");
        setIsLoading(false);
        return;
      }

      toast.success("Invitation accepted! Redirecting...");
      
      // Redirect to restaurant dashboard
      router.push(`/r/${restaurantId}`);
      router.refresh();
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  }

  return (
    <div className="border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Click the button below to accept this invitation and join the restaurant.
        </p>
      </div>
      <Button
        className="w-full bg-blue-900 text-white"
        onClick={handleAccept}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Accepting...
          </>
        ) : (
          "Accept Invitation"
        )}
      </Button>
    </div>
  );
}
