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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the login link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-5xl font-bold">Login</h1>

        <p className="mt-4 text-lg text-gray-400">
          Enter your email to save scores and compete.
        </p>

        <input
          className="mt-8 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-lg text-white outline-none"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={signIn}
          className="mt-6 w-full rounded-2xl bg-white py-4 text-lg font-bold text-black"
        >
          Send Login Link
        </button>

        {message && <p className="mt-6 text-gray-300">{message}</p>}
      </div>
    </main>
  );
}