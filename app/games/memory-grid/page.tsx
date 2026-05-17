import MatchRush from "@/components/Games/MatchRush";

export default function MatchRushPage() {
  const today = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });

  if (today !== "Thursday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white text-center px-4">
        <p className="text-6xl mb-6">🔒</p>
        <h1 className="text-4xl font-black mb-3">
          Match <span className="text-amber-300">Rush</span>
        </h1>
        <p className="text-white/60 text-lg">This game is only available on Thursdays.</p>
        <p className="text-white/30 mt-2 text-sm">Come back on Thursday to play.</p>
      </div>
    );
  }

  return <MatchRush />;
}