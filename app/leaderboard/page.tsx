"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ScoreRow = {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  accuracy: number | null;
  duration_seconds: number | null;
  played_on: string | null;
  week_start: string | null;
  flagged: boolean | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

const gameNames: Record<string, string> = {
  "word-rush": "Word Rush",
  "memory-grid": "Memory Grid",
  "precision-trace": "Precision Trace",
  "match-rush": "Match Rush",
  "reaction-city": "Reaction City",
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getTodayGameId() {
  const day = new Date().getDay();

  const games: Record<number, string> = {
    1: "word-rush",
    2: "memory-grid",
    3: "precision-trace",
    4: "match-rush",
    5: "reaction-city",
  };

  return games[day] ?? null;
}

export default function DailyLeaderboardPage() {
  const supabase = createClient();

  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const today = getTodayDate();
  const todayGameId = getTodayGameId();

  useEffect(() => {
    async function loadDailyLeaderboard() {
      setLoading(true);

      if (!todayGameId) {
        setScores([]);
        setLoading(false);
        return;
      }

      const { data: scoresData, error: scoresError } = await supabase
        .from("game_scores")
        .select("*")
        .eq("played_on", today)
        .eq("game_id", todayGameId)
        .or("flagged.is.null,flagged.eq.false");

      if (scoresError) {
        console.error("DAILY LEADERBOARD ERROR:", scoresError);
        setLoading(false);
        return;
      }

      const rows = scoresData || [];

      const firstAttemptByPlayer: Record<string, ScoreRow> = {};

      for (const row of rows) {
        const current = firstAttemptByPlayer[row.user_id];

        if (
          !current ||
          new Date(row.created_at).getTime() <
            new Date(current.created_at).getTime()
        ) {
          firstAttemptByPlayer[row.user_id] = row;
        }
      }

      const filtered = Object.values(firstAttemptByPlayer).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      });

      setScores(filtered);

      const userIds = [...new Set(filtered.map((s) => s.user_id))];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        const mapped: Record<string, Profile> = {};

        for (const profile of profilesData || []) {
          mapped[profile.id] = profile;
        }

        setProfiles(mapped);
      }

      setLoading(false);
    }

    loadDailyLeaderboard();
  }, [supabase, today, todayGameId]);

  const leaderboard = useMemo(() => {
    return scores.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));
  }, [scores]);

  function getName(userId: string) {
    const profile = profiles[userId];

    return profile?.display_name || profile?.username || "Unknown Player";
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Daily Leaderboard
          </h1>

          <p className="mt-3 text-zinc-400">
            Today’s official rankings.
          </p>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            {todayGameId
              ? `${gameNames[todayGameId]} • ${today}`
              : "No weekday game today."}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/menu"
              className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black"
            >
              Menu
            </Link>

            <Link
              href="/leaderboard/weekly"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 font-black"
            >
              Weekly
            </Link>

            <Link
              href="/leaderboard/all-time"
              className="rounded-2xl bg-yellow-300 px-5 py-3 font-black text-black"
            >
              All-Time
            </Link>

            <Link
              href="/play"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 font-black"
            >
              Play Today
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl">
          <div className="grid grid-cols-5 border-b border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-400">
            <div>Rank</div>
            <div>Player</div>
            <div>Score</div>
            <div>Accuracy</div>
            <div>Time</div>
          </div>

          {loading && (
            <div className="p-6 text-zinc-400">
              Loading daily leaderboard...
            </div>
          )}

          {!loading && !todayGameId && (
            <div className="p-6 text-zinc-400">
              No daily game today. Check weekly standings or finals.
            </div>
          )}

          {!loading && todayGameId && leaderboard.length === 0 && (
            <div className="p-6 text-zinc-400">
              No official scores yet today.
            </div>
          )}

          {!loading &&
            leaderboard.map((score) => (
              <div
                key={score.id}
                className="grid grid-cols-5 items-center border-b border-white/5 px-5 py-4 last:border-b-0"
              >
                <div className="font-black text-emerald-300">
                  #{score.rank}
                </div>

                <div className="font-bold text-zinc-200">
                  {getName(score.user_id)}
                </div>

                <div className="text-2xl font-black">
                  {score.score}
                </div>

                <div className="font-bold text-zinc-300">
                  {score.accuracy === null || score.accuracy === undefined
                    ? "—"
                    : `${Math.round(score.accuracy)}%`}
                </div>

                <div className="font-bold text-zinc-300">
                  {score.duration_seconds
                    ? `${score.duration_seconds}s`
                    : "—"}
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}