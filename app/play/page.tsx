"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlayPage() {
  const router = useRouter();

  useEffect(() => {
    const day = new Date().getDay();

    const routes: Record<number, string> = {
      1: "/games/word-rush",
      2: "/games/memory-grid",
      3: "/games/precision-trace",
      4: "/games/match-rush",
      5: "/games/reaction-lock",
    };

    const todayRoute = routes[day];

    if (todayRoute) {
      router.replace(todayRoute);
    } else {
      router.replace("/menu");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.15),transparent_35%)]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-emerald-300" />

        <h1 className="mt-8 text-4xl font-black tracking-tight">
          Loading Today’s Game
        </h1>

        <p className="mt-3 text-lg text-zinc-400">
          Preparing your challenge...
        </p>
      </div>
    </main>
  );
}