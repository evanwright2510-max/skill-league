"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

export default function AccountPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("You need to log in first.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: null,
            display_name: null,
          })
          .select("id, username, display_name")
          .single();

        if (insertError) {
          setMessage(insertError.message);
          setLoading(false);
          return;
        }

        setUsername(newProfile.username || "");
        setDisplayName(newProfile.display_name || "");
      } else {
        setUsername(profile.username || "");
        setDisplayName(profile.display_name || "");
      }

      setLoading(false);
    }

    loadAccount();
  }, [supabase]);

  async function saveProfile() {
    setMessage("");

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    const cleanDisplayName = displayName.trim();

    if (!cleanUsername) {
      setMessage("Username is required.");
      return;
    }

    if (cleanUsername.length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }

    if (cleanUsername.length > 20) {
      setMessage("Username must be 20 characters or less.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        username: cleanUsername,
        display_name: cleanDisplayName || cleanUsername,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setMessage("That username is already taken.");
      } else {
        setMessage(error.message);
      }

      return;
    }

    setUsername(cleanUsername);
    setDisplayName(cleanDisplayName || cleanUsername);
    setMessage("Profile saved.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-xl font-black">Loading account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Account
          </h1>

          <p className="mt-3 text-zinc-400">
            Set your public player name for leaderboards.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-bold text-zinc-400">
                Email
              </label>

              <input
                value={email}
                disabled
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-zinc-500 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-400">
                Username
              </label>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="evanw"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
              />

              <p className="mt-2 text-xs text-zinc-500">
                Lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-400">
                Display Name
              </label>

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Evan"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-zinc-300">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-2xl bg-emerald-300 px-6 py-3 font-black text-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              <Link
                href="/menu"
                className="rounded-2xl border border-white/10 bg-white/[0.08] px-6 py-3 font-black"
              >
                Menu
              </Link>

              <button
                onClick={signOut}
                className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-3 font-black text-red-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}