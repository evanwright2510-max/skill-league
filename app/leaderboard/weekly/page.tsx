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
  played_on: string | null;
  week_start: string | null;
  created_at: string;
  flagged?: boolean | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type Standing = {
  user_id: string;
  score: number;
  leaguePoints: number;
  gamesRanked: number;
  wins: number;
  attempts: number;
};

const GAMES = [
  { id: "word-rush", name: "Word Rush" },
  { id: "memory-grid", name: "Memory Grid" },
  { id: "precision-trace", name: "Precision Trace" },
  { id: "reaction-city", name: "Reaction City" },
  { id: "saturday-final", name: "Saturday Final" },
];

function getWeekStart() {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);

  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getLeaguePoints(rank: number) {
  if (rank === 1) return 100;
  if (rank === 2) return 80;
  if (rank === 3) return 65;
  if (rank === 4) return 55;
  if (rank === 5) return 45;

  return Math.max(10, 45 - (rank - 5) * 3);
}

function getDisplayName(profile?: Profile) {
  return profile?.display_name || profile?.username || "Unknown Player";
}

export default function WeeklyLeaderboardPage() {
  const supabase = createClient();

  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overall");

  const weekStart = useMemo(() => getWeekStart(), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data, error } = await supabase
        .from("game_scores")
        .select("*")
        .gte("played_on", weekStart)
        .or("flagged.is.null,flagged.eq.false");

      if (error) {
        console.error("Leaderboard score load error:", error);
        setScores([]);
        setLoading(false);
        return;
      }

      const rows = data || [];
      setScores(rows);

      const userIds = [...new Set(rows.map((row) => row.user_id))];

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        if (profileError) {
          console.error("Profile load error:", profileError);
        }

        const mapped: Record<string, Profile> = {};

        for (const profile of profileData || []) {
          mapped[profile.id] = profile;
        }

        setProfiles(mapped);
      } else {
        setProfiles({});
      }

      setLoading(false);
    }

    loadData();
  }, [supabase, weekStart]);

  const rankings = useMemo(() => {
    const gameRankings: Record<string, Standing[]> = {};
    const overall: Record<string, Standing> = {};

    for (const game of GAMES) {
      const gameRows = scores.filter((row) => row.game_id === game.id);

      const firstAttemptByPlayer: Record<string, ScoreRow> = {};

      for (const row of gameRows) {
        const current = firstAttemptByPlayer[row.user_id];

        if (
          !current ||
          new Date(row.created_at).getTime() <
            new Date(current.created_at).getTime()
        ) {
          firstAttemptByPlayer[row.user_id] = row;
        }
      }

      const ranked = Object.values(firstAttemptByPlayer).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      });

      gameRankings[game.id] = ranked.map((row, index) => {
        const rank = index + 1;
        const points = getLeaguePoints(rank);
        const attempts = gameRows.filter((r) => r.user_id === row.user_id).length;

        if (!overall[row.user_id]) {
          overall[row.user_id] = {
            user_id: row.user_id,
            score: 0,
            leaguePoints: 0,
            gamesRanked: 0,
            wins: 0,
            attempts: 0,
          };
        }

        overall[row.user_id].leaguePoints += points;
        overall[row.user_id].gamesRanked += 1;
        overall[row.user_id].attempts += attempts;

        if (rank === 1) {
          overall[row.user_id].wins += 1;
        }

        return {
          user_id: row.user_id,
          score: row.score,
          leaguePoints: points,
          gamesRanked: 1,
          wins: rank === 1 ? 1 : 0,
          attempts,
        };
      });
    }

    const overallRankings = Object.values(overall).sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) {
        return b.leaguePoints - a.leaguePoints;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.gamesRanked !== a.gamesRanked) {
        return b.gamesRanked - a.gamesRanked;
      }

      return b.score - a.score;
    });

    return {
      overall: overallRankings,
      games: gameRankings,
    };
  }, [scores]);

  const activeRows =
    activeTab === "overall" ? rankings.overall : rankings.games[activeTab] || [];

  const activeTitle =
    activeTab === "overall"
      ? "Overall Weekly Ranking"
      : GAMES.find((game) => game.id === activeTab)?.name || "Game Ranking";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Weekly Leaderboard
          </h1>

          <p className="mt-3 text-zinc-400">
            First attempt counts for each game. Each game gets its own ranking.
            Overall ranking is built from placement points.
          </p>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Week Start: {weekStart}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black transition hover:bg-emerald-200"
            >
              Menu
            </Link>

            <button
              onClick={() => setActiveTab("overall")}
              className={[
                "rounded-2xl px-5 py-3 font-black transition",
                activeTab === "overall"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20",
              ].join(" ")}
            >
              Overall
            </button>

            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => setActiveTab(game.id)}
                className={[
                  "rounded-2xl px-5 py-3 font-black transition",
                  activeTab === game.id
                    ? "bg-emerald-300 text-black"
                    : "bg-white/10 text-white hover:bg-white/20",
                ].join(" ")}
              >
                {game.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black">{activeTitle}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {activeTab === "overall"
                ? "Overall is calculated from each game’s placement points."
                : "Only each player’s first submitted attempt for this game counts."}
            </p>
          </div>

          <p className="text-sm font-bold text-zinc-500">
            {scores.length} score rows loaded
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl">
          <div className="grid grid-cols-6 border-b border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-400">
            <div>Rank</div>
            <div className="col-span-2">Player</div>
            <div>{activeTab === "overall" ? "League Pts" : "Score"}</div>
            <div>{activeTab === "overall" ? "Games" : "Attempts"}</div>
            <div>Wins</div>
          </div>

          {loading && (
            <div className="p-6 text-zinc-400">Loading leaderboard...</div>
          )}

          {!loading && activeRows.length === 0 && (
            <div className="p-6 text-zinc-400">No scores yet.</div>
          )}

          {!loading &&
            activeRows.map((player, index) => {
              const profile = profiles[player.user_id];
              const displayName = getDisplayName(profile);
              const qualified = activeTab === "overall" && index < 5;

              return (
                <div
                  key={player.user_id}
                  className={[
                    "grid grid-cols-6 items-center border-b border-white/5 px-5 py-4 last:border-b-0",
                    qualified ? "bg-emerald-300/[0.06]" : "",
                  ].join(" ")}
                >
                  <div className="font-black text-emerald-300">
                    #{index + 1}
                  </div>

                  <div className="col-span-2">
                    <p className="font-bold text-zinc-200">{displayName}</p>

                    {qualified && (
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                        Saturday Qualifier
                      </p>
                    )}
                  </div>

                  <div className="text-2xl font-black">
                    {activeTab === "overall"
                      ? player.leaguePoints
                      : player.score}
                  </div>

                  <div className="font-bold text-zinc-300">
                    {activeTab === "overall"
                      ? player.gamesRanked
                      : player.attempts}
                  </div>

                  <div className="font-bold text-zinc-300">{player.wins}</div>
                </div>
              );
            })}
        </section>
      </div>
    </main>
  );
}