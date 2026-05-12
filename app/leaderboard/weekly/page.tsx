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
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type WeeklyPlayer = {
  user_id: string;
  totalLeaguePoints: number;
  gamesPlayed: number;
  wins: number;
};

function getWeekStart() {
  const now = new Date();

  const local = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const day = local.getDay(); // Sun = 0, Mon = 1, Tue = 2...

  const diff = day === 0 ? -6 : 1 - day;

  local.setDate(local.getDate() + diff);

  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const date = String(local.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getLeaguePoints(rank: number) {
  if (rank === 1) return 100;
  if (rank === 2) return 80;
  if (rank === 3) return 65;
  if (rank === 4) return 55;
  if (rank === 5) return 45;

  return Math.max(10, 45 - (rank - 5) * 3);
}

export default function WeeklyLeaderboardPage() {
  const supabase = createClient();

  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => getWeekStart(), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: scoresData, error: scoresError } = await supabase
        .from("game_scores")
        .select("*")
        .eq("week_start", weekStart)
        .eq("flagged", false);

      if (scoresError) {
        console.error("Weekly leaderboard scores error:", scoresError);
        setScores([]);
        setLoading(false);
        return;
      }

      const rows = scoresData || [];
      setScores(rows);

      const userIds = [...new Set(rows.map((s) => s.user_id))];

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        if (profilesError) {
          console.error("Weekly leaderboard profiles error:", profilesError);
        }

        const mapped: Record<string, Profile> = {};

        for (const profile of profilesData || []) {
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

  const leaderboard = useMemo(() => {
    const groupedGames: Record<string, ScoreRow[]> = {};

    for (const score of scores) {
      const key = `${score.game_id}-${score.played_on}`;

      if (!groupedGames[key]) {
        groupedGames[key] = [];
      }

      groupedGames[key].push(score);
    }

    const players: Record<string, WeeklyPlayer> = {};

    for (const key in groupedGames) {
      const ranked = [...groupedGames[key]].sort((a, b) => b.score - a.score);

      ranked.forEach((score, index) => {
        const rank = index + 1;
        const leaguePoints = getLeaguePoints(rank);

        if (!players[score.user_id]) {
          players[score.user_id] = {
            user_id: score.user_id,
            totalLeaguePoints: 0,
            gamesPlayed: 0,
            wins: 0,
          };
        }

        players[score.user_id].totalLeaguePoints += leaguePoints;
        players[score.user_id].gamesPlayed += 1;

        if (rank === 1) {
          players[score.user_id].wins += 1;
        }
      });
    }

    return Object.values(players).sort((a, b) => {
      if (b.totalLeaguePoints !== a.totalLeaguePoints) {
        return b.totalLeaguePoints - a.totalLeaguePoints;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return b.gamesPlayed - a.gamesPlayed;
    });
  }, [scores]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Weekly Leaderboard
          </h1>

          <p className="mt-3 text-zinc-400">
            Balanced weekly rankings based on daily placement.
          </p>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Week Start: {weekStart}
          </p>

          <div className="mt-6 flex gap-4">
            <Link
              href="/menu"
              className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black transition hover:bg-emerald-200"
            >
              Menu
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl">
          <div className="grid grid-cols-5 border-b border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-400">
            <div>Rank</div>
            <div>Player</div>
            <div>League Pts</div>
            <div>Games</div>
            <div>Wins</div>
          </div>

          {loading && (
            <div className="p-6 text-zinc-400">Loading leaderboard...</div>
          )}

          {!loading && leaderboard.length === 0 && (
            <div className="p-6 text-zinc-400">No scores yet.</div>
          )}

          {!loading &&
            leaderboard.map((player, index) => {
              const profile = profiles[player.user_id];

              const displayName =
                profile?.display_name ||
                profile?.username ||
                "Unknown Player";

              const qualified = index < 5;

              return (
                <div
                  key={player.user_id}
                  className={[
                    "grid grid-cols-5 items-center border-b border-white/5 px-5 py-4 last:border-b-0",
                    qualified ? "bg-emerald-300/[0.06]" : "",
                  ].join(" ")}
                >
                  <div className="font-black text-emerald-300">
                    #{index + 1}
                  </div>

                  <div>
                    <p className="font-bold text-zinc-200">{displayName}</p>

                    {qualified && (
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                        Saturday Qualifier
                      </p>
                    )}
                  </div>

                  <div className="text-2xl font-black">
                    {player.totalLeaguePoints}
                  </div>

                  <div className="font-bold text-zinc-300">
                    {player.gamesPlayed}
                  </div>

                  <div className="font-bold text-zinc-300">{player.wins}</div>
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}