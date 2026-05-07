"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function signIn() {
    setMessage("Sending login link...");

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the login link.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
        <h1 className="text-4xl font-black">Login</h1>

        <p className="mt-2 text-zinc-400">
          Enter your email to save scores and compete.
        </p>

        <input
          className="mt-6 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={signIn}
          className="mt-4 w-full rounded-2xl bg-white px-5 py-3 font-black text-black"
        >
          Send Login Link
        </button>

        {message && (
          <p className="mt-4 text-sm text-zinc-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}