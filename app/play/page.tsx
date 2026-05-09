"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function PlayPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? null);
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Skill League</h1>
            <p className="mt-2 text-zinc-400">
              Logged in as {email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-white px-4 py-2 text-black transition hover:opacity-80"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Today's Game</h2>

            <div className="mt-4 rounded-xl bg-black p-10 text-center text-zinc-500">
              Game goes here
            </div>

            <button className="mt-6 w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:opacity-90">
              Play Now
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Leaderboard</h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-black p-4">
                <span>1. PlayerOne</span>
                <span>1240</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black p-4">
                <span>2. SkillMaster</span>
                <span>1180</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black p-4">
                <span>3. You</span>
                <span>1120</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}