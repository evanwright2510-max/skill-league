"use client";

import Link from "next/link";

const games = [
  {
    day: "Monday",
    title: "Word Rush",
    route: "/games/word-rush",
    color: "from-emerald-300 to-green-500",
    description: "Build words fast from a changing letter grid.",
  },
  {
    day: "Tuesday",
    title: "Memory Grid",
    route: "/games/memory-grid",
    color: "from-sky-300 to-blue-500",
    description: "Memorize flashing tiles before they disappear.",
  },
  {
    day: "Wednesday",
    title: "Precision Trace",
    route: "/games/precision-trace",
    color: "from-fuchsia-300 to-pink-500",
    description: "Memorize hazards and trace the safe path.",
  },
  {
    day: "Thursday",
    title: "Match Rush",
    route: "/games/match-rush",
    color: "from-yellow-300 to-orange-500",
    description: "Find the matching symbol before time runs out.",
  },
  {
    day: "Friday",
    title: "Reaction City",
    route: "/games/reaction-city",
    color: "from-cyan-300 to-indigo-500",
    description: "Lock the moving marker inside the target zone.",
  },
];

export default function MenuPage() {
  const today = new Date().getDay();

  return (
    <main className="min-h-screen overflow-hidden bg-black px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,197,94,0.18),transparent_30%),radial-gradient(circle_at_85%_5%,rgba(59,130,246,0.15),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(217,70,239,0.14),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
            Skill League
          </p>

          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            Game Menu
          </h1>

          <p className="mt-4 max-w-3xl text-lg font-semibold text-zinc-400">
            Play today’s challenge, climb the leaderboard, and qualify for the
            Saturday final.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/play"
              className="rounded-2xl bg-emerald-300 px-6 py-4 text-lg font-black text-black transition hover:scale-105"
            >
              Play Today
            </Link>

            <Link
              href="/leaderboard/weekly"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-6 py-4 text-lg font-black transition hover:scale-105"
            >
              Weekly Leaderboard
            </Link>

            <Link
              href="/finals"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-6 py-4 text-lg font-black transition hover:scale-105"
            >
              Finals
            </Link>

            <Link
              href="/account"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-6 py-4 text-lg font-black transition hover:scale-105"
            >
              Account
            </Link>

            <Link
              href="/"
              className="rounded-2xl border border-white/10 bg-white/[0.08] px-6 py-4 text-lg font-black transition hover:scale-105"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game, index) => {
            const weekdayIndex = index + 1;
            const isToday = weekdayIndex === today;

            return (
              <div
                key={game.title}
                className={[
                  "relative overflow-hidden rounded-[2rem] border bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl transition duration-300 hover:scale-[1.02]",
                  isToday ? "border-emerald-300/60" : "border-white/10",
                ].join(" ")}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-20`}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
                      {game.day}
                    </p>

                    {isToday && (
                      <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black uppercase text-black">
                        Today
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-4xl font-black tracking-tight">
                    {game.title}
                  </h2>

                  <p className="mt-4 min-h-[70px] text-zinc-300">
                    {game.description}
                  </p>

                  <Link
                    href={isToday ? "/play" : "/menu"}
                    className={`mt-6 inline-block rounded-2xl bg-gradient-to-r ${game.color} px-6 py-4 text-lg font-black text-black transition hover:scale-105`}
                  >
                    {isToday ? "Play Today" : "Locked"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}