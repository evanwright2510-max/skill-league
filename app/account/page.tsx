"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .single();

      setUsername(
        profile?.username ||
          profile?.display_name ||
          user.email?.split("@")[0] ||
          ""
      );

      setLoading(false);
    }

    loadAccount();
  }, [router, supabase]);

  async function saveUsername() {
    setSaving(true);
    setMessage("");

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      setMessage("Username must be at least 3 characters.");
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: cleanUsername,
      display_name: cleanUsername,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Username saved.");
    }

    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-6xl font-black">Account</h1>

        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
            Logged in as
          </p>

          <p className="mt-4 text-3xl font-black">{email}</p>

          <div className="mt-10">
            <label className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
              Username
            </label>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-5 py-5 text-2xl font-black text-white outline-none"
            />

            <button
              onClick={saveUsername}
              disabled={saving}
              className="mt-4 w-full rounded-2xl bg-emerald-400 px-6 py-5 text-xl font-black text-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Username"}
            </button>

            {message && (
              <p className="mt-4 text-center font-bold text-emerald-300">
                {message}
              </p>
            )}
          </div>

          <div className="mt-8 grid gap-4">
            <Link
              href="/menu"
              className="rounded-2xl bg-white px-6 py-5 text-center text-xl font-black text-black"
            >
              Back to Menu
            </Link>

            <button
              onClick={logout}
              className="rounded-2xl bg-white px-6 py-5 text-xl font-black text-black"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}