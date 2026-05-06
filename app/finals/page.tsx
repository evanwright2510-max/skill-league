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
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(now);
  monday.setDate(diff);

  return monday.toISOString().split("T")[0];
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

  const weekStart = getWeekStart();
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
        setLoading(false);
        return;
      }

      setScores(scoresData || []);

      const userIds = [...new Set((scoresData || []).map((s) => s.user_id))];

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

    loadFinalsData();
  }, [weekStart, supabase]);

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
      const ranked = groupedGames[key].sort((a, b) => b.score - a.score);

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

    return Object.values(players).sort(
      (a, b) => b.totalLeaguePoints - a.totalLeaguePoints
    );
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
                className="mt-6 inline-block rounded-2xl bg-emerald-300 px-6 py-4 font-black text-black"
              >
                Login
              </Link>
            </div>
          )}

          {!loading && currentUserId && !isSaturday && (
            <div>
              <h2 className="text-3xl font-black">Finals Locked</h2>
              <p className="mt-3 text-zinc-400">
                Finals open on Saturday. Keep climbing the weekly leaderboard.
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

              <button
                disabled
                className="mt-6 rounded-2xl bg-emerald-300 px-6 py-4 font-black text-black opacity-60"
              >
                Final Game Coming Next
              </button>
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

          {qualifiers.length === 0 && (
            <div className="p-6 text-zinc-400">No qualifiers yet.</div>
          )}

          {qualifiers.map((player, index) => (
            <div
              key={player.user_id}
              className="grid grid-cols-4 items-center border-b border-white/5 px-5 py-4 last:border-b-0"
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