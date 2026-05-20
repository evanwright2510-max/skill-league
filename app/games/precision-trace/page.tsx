import PrecisionTrace from "@/components/Games/PrecisionTrace";

export default function PrecisionTracePage() {
  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });

  if (today !== "Wednesday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#02030a] text-white text-center px-4">
        <p className="text-6xl mb-6">🔒</p>
        <h1 className="text-4xl font-black mb-3">
          Precision{" "}
          <span className="bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
            Trace
          </span>
        </h1>
        <p className="text-white/60 text-lg">This game is only available on Wednesdays.</p>
        <p className="text-white/30 mt-2 text-sm">Come back on Wednesday to play.</p>
      </div>
    );
  }

  return <PrecisionTrace />;
}