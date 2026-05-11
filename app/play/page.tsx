"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function signIn() {
    setMessage("Sending login link...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
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
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
        <h1 className="text-4xl font-black">Login</h1>

        <p className="mt-3 text-zinc-400">
          Enter your email and we’ll send you a magic login link.
        </p>

        <input
          className="mt-6 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={signIn}
          className="mt-4 w-full rounded-2xl bg-emerald-300 px-6 py-4 font-black text-black"
        >
          Send Login Link
        </button>

        {message && <p className="mt-4 text-sm text-zinc-300">{message}</p>}
      </div>
    </main>
  );
}