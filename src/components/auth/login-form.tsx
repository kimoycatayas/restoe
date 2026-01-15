"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return alert(error.message);

    // Redirect to root, which will handle restaurant selection
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border rounded-xl p-4">
      <Input
        className="my-1"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        className="my-1"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
      />
      <Button
        variant="outline"
        className="w-full bg-blue-900 text-white"
        type="submit"
      >
        Login
      </Button>
    </form>
  );
}
