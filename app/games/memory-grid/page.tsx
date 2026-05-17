import MemoryGrid from "@/components/Games/MemoryGrid";

export default function MemoryGridPage() {
  const today = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });

  if (today !== "Tuesday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-zinc-950 to-purple-950 text-white text-center px-4">
        <p className="text-6xl mb-6">🔒</p>
        <h1 className="text-4xl font-black mb-3">
          Memory <span className="text-purple-300">Grid</span>
        </h1>
        <p className="text-white/60 text-lg">This game is only available on Tuesdays.</p>
        <p className="text-white/30 mt-2 text-sm">Come back on Tuesday to play.</p>
      </div>
    );
  }

  return <MemoryGrid />;
}