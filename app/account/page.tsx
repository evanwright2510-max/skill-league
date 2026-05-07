"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Account
        </h1>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-wide text-gray-500">
            Logged in as
          </p>

          <p className="mt-3 text-2xl font-semibold break-all">
            {email}
          </p>

          <button
            onClick={() => router.push("/play")}
            className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-black transition hover:opacity-90"
          >
            Play Games
          </button>

          <button
            onClick={handleLogout}
            className="mt-4 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:opacity-90"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}