"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface SignupFormProps {
  inviteToken?: string;
  invitation?: { email: string } | null;
  invitationError?: string | null;
}

export default function SignupForm({ inviteToken, invitation, invitationError }: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState(invitation?.email || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email matches invitation if invite token is present
      if (inviteToken && invitation) {
        if (email.toLowerCase() !== invitation.email.toLowerCase()) {
          toast.error("Email must match the invitation");
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      // If invite token present, redirect to accept invitation page
      if (inviteToken) {
        router.push(`/accept-invitation?invite=${inviteToken}`);
      } else {
        // Otherwise redirect to home
        toast.success("Account created successfully! Please check your email to verify your account.");
        router.push("/");
      }
      router.refresh();
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  }

  if (invitationError) {
    return (
      <div className="border rounded-xl p-4">
        <p className="text-destructive text-center">{invitationError}</p>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => router.push("/")}
        >
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border rounded-xl p-4">
      <Input
        className="my-1"
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={!!invitation} // Disable if invitation email is prefilled
        required
      />
      <Input
        className="my-1"
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <Button
        variant="outline"
        className="w-full bg-blue-900 text-white"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}
