"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type AllTimeRow = {
  game_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  score: number;
  accuracy: number | null;
  played_on: string | null;
  week_start: string | null;
  created_at: string;
  rank: number;
};

const GAMES = [
  { id: "word-rush", name: "Word Rush" },
  { id: "memory-grid", name: "Memory Grid" },
  { id: "precision-trace", name: "Precision Trace" },
  { id: "match-rush", name: "Match Rush" },
  { id: "reaction-city", name: "Reaction City" },
  { id: "the-grind", name: "Saturday Final" },
];

function getDisplayName(row: AllTimeRow) {
  return row.display_name || row.username || "Unknown Player";
}

export default function AllTimeLeaderboardPage() {
  const supabase = createClient();

  const [rows, setRows] = useState<AllTimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState("word-rush");

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data, error } = await supabase
        .from("all_time_game_high_scores")
        .select("*")
        .order("game_id", { ascending: true })
        .order("rank", { ascending: true });

      if (error) {
        console.error("All-time leaderboard error:", error);
        setRows([]);
      } else {
        setRows(data || []);
      }

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  const activeRows = useMemo(() => {
    return rows
      .filter((row) => row.game_id === activeGame)
      .sort((a, b) => a.rank - b.rank);
  }, [rows, activeGame]);

  const activeTitle =
    GAMES.find((game) => game.id === activeGame)?.name || "Game";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            All-Time Leaderboard
          </h1>

          <p className="mt-3 text-zinc-400">
            Highest valid score ever for each game. Only first weekly attempts
            are eligible.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/leaderboard"
              className="rounded-2xl bg-white px-5 py-3 font-black text-black transition hover:bg-zinc-200"
            >
              Weekly
            </Link>

            <Link
              href="/menu"
              className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black transition hover:bg-emerald-200"
            >
              Menu
            </Link>

            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={[
                  "rounded-2xl px-5 py-3 font-black transition",
                  activeGame === game.id
                    ? "bg-emerald-300 text-black"
                    : "bg-white/10 text-white hover:bg-white/20",
                ].join(" ")}
              >
                {game.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h2 className="text-3xl font-black">{activeTitle}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Best valid all-time scores for this game.
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl">
          <div className="grid grid-cols-6 border-b border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-400">
            <div>Rank</div>
            <div className="col-span-2">Player</div>
            <div>Score</div>
            <div>Week</div>
            <div>Date</div>
          </div>

          {loading && (
            <div className="p-6 text-zinc-400">Loading all-time leaderboard...</div>
          )}

          {!loading && activeRows.length === 0 && (
            <div className="p-6 text-zinc-400">No scores yet.</div>
          )}

          {!loading &&
            activeRows.map((row) => (
              <div
                key={`${row.game_id}-${row.user_id}`}
                className="grid grid-cols-6 items-center border-b border-white/5 px-5 py-4 last:border-b-0"
              >
                <div className="font-black text-emerald-300">#{row.rank}</div>

                <div className="col-span-2">
                  <p className="font-bold text-zinc-200">
                    {getDisplayName(row)}
                  </p>
                </div>

                <div className="text-2xl font-black">{row.score}</div>

                <div className="font-bold text-zinc-300">
                  {row.week_start || "—"}
                </div>

                <div className="font-bold text-zinc-300">
                  {row.played_on || "—"}
                </div>
              </div>
            ))}
        </section>
      </div>
    </main>
  );
}