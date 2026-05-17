import ReactionCity from "@/components/Games/ReactionCity";

export default function ReactionCityPage() {
  const today = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });

  if (today !== "Friday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white text-center px-4">
        <p className="text-6xl mb-6">🔒</p>
        <h1 className="text-4xl font-black mb-3">
          Reaction <span className="text-emerald-300">Lock</span>
        </h1>
        <p className="text-white/60 text-lg">This game is only available on Fridays.</p>
        <p className="text-white/30 mt-2 text-sm">Come back on Friday to play.</p>
      </div>
    );
  }

  return <ReactionCity />;
}