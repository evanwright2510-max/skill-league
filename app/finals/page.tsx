"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ScoreRow = {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  played_on: string | null;
  week_start: string | null;
  flagged: boolean | null;
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

  const day = local.getDay();
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

export default function FinalsPage() {
  const supabase = createClient();

  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => getWeekStart(), []);

  const today = new Date().getDay();
  const isSaturday = today === 6;

  useEffect(() => {
    async function loadFinalsData() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const { data: scoresData, error: scoresError } = await supabase
        .from("game_scores")
        .select("*")
        .eq("week_start", weekStart)
        .eq("flagged", false);

      if (scoresError) {
        console.error("FINALS SCORES ERROR:", scoresError);
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
          console.error("FINALS PROFILES ERROR:", profilesError);
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

    loadFinalsData();
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
        const points = getLeaguePoints(rank);

        if (!players[score.user_id]) {
          players[score.user_id] = {
            user_id: score.user_id,
            totalLeaguePoints: 0,
            gamesPlayed: 0,
            wins: 0,
          };
        }

        players[score.user_id].totalLeaguePoints += points;
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

  const qualifiers = leaderboard.slice(0, 5);
  const isQualified = qualifiers.some((p) => p.user_id === currentUserId);

  function getName(userId: string) {
    const profile = profiles[userId];

    return profile?.display_name || profile?.username || "Unknown Player";
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Saturday Finals
          </h1>

          <p className="mt-3 text-zinc-400">
            Top 5 weekly players qualify for the final.
          </p>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Week Start: {weekStart}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/menu"
              className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black transition hover:bg-emerald-200"
            >
              Menu
            </Link>

            <Link
              href="/leaderboard/weekly"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 font-black transition hover:bg-white/[0.14]"
            >
              Weekly Leaderboard
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-2xl">
          {loading && <p className="text-zinc-400">Loading finals...</p>}

          {!loading && !currentUserId && (
            <div>
              <h2 className="text-3xl font-black">Login Required</h2>

              <p className="mt-3 text-zinc-400">
                You need to log in to check finals eligibility.
              </p>

              <Link
                href="/login"
                className="mt-6 inline-block rounded-2xl bg-emerald-300 px-6 py-4 font-black text-black transition hover:bg-emerald-200"
              >
                Login
              </Link>
            </div>
          )}

          {!loading && currentUserId && !isSaturday && (
            <div>
              <h2 className="text-3xl font-black">Finals Locked</h2>

              <p className="mt-3 text-zinc-400">
                Finals open on Saturday. Top 5 players qualify.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Your qualification will be based on this week’s leaderboard.
              </p>
            </div>
          )}

          {!loading && currentUserId && isSaturday && !isQualified && (
            <div>
              <h2 className="text-3xl font-black">Not Qualified</h2>

              <p className="mt-3 text-zinc-400">
                You did not finish in the top 5 this week.
              </p>
            </div>
          )}

          {!loading && currentUserId && isSaturday && isQualified && (
            <div>
              <h2 className="text-3xl font-black text-emerald-300">
                You Qualified
              </h2>

              <p className="mt-3 text-zinc-400">
                You are eligible for the Saturday final.
              </p>

              <Link
                href="/games/saturday-final"
                className="mt-6 inline-block rounded-2xl bg-emerald-300 px-6 py-4 font-black text-black transition hover:bg-emerald-200"
              >
                Play Final Game
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl">
          <div className="grid grid-cols-4 border-b border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-400">
            <div>Seed</div>
            <div>Player</div>
            <div>Points</div>
            <div>Wins</div>
          </div>

          {!loading && qualifiers.length === 0 && (
            <div className="p-6 text-zinc-400">No qualifiers yet.</div>
          )}

          {qualifiers.map((player, index) => (
            <div
              key={player.user_id}
              className={[
                "grid grid-cols-4 items-center border-b border-white/5 px-5 py-4 last:border-b-0",
                player.user_id === currentUserId ? "bg-emerald-300/[0.08]" : "",
              ].join(" ")}
            >
              <div className="font-black text-emerald-300">#{index + 1}</div>

              <div className="font-bold text-zinc-200">
                {getName(player.user_id)}
              </div>

              <div className="text-2xl font-black">
                {player.totalLeaguePoints}
              </div>

              <div className="font-bold text-zinc-300">{player.wins}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}