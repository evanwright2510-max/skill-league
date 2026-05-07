"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function CreateAccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");
    }

    loadUser();
  }, [router, supabase]);

  async function createAccount() {
    if (!username) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      username,
    });

    if (!error) {
      router.push("/play");
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-4xl font-bold">
          Create Account
        </h1>

        <p className="mt-4 text-gray-400">
          Signed in as:
        </p>

        <p className="mt-1 text-lg">
          {email}
        </p>

        <input
          className="mt-8 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-lg"
          placeholder="Choose username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          onClick={createAccount}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-white py-4 text-lg font-bold text-black"
        >
          {loading ? "Creating..." : "Continue"}
        </button>
      </div>
    </main>
  );
}