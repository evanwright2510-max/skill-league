import WordRush from "@/components/Games/WordRush";

export default function WordRushPage() {
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(new Date());

  if (today !== "Monday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-zinc-950 to-emerald-950 text-white text-center px-4">
        <p className="text-6xl mb-6">🔒</p>
        <h1 className="text-4xl font-black mb-3">
          Word <span className="text-emerald-300">Rush</span>
        </h1>
        <p className="text-white/60 text-lg">This game is only available on Mondays.</p>
        <p className="text-white/30 mt-2 text-sm">Come back on Monday to play.</p>
      </div>
    );
  }

  return <WordRush />;
}