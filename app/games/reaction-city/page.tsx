import ReactionCity from "@/components/Games/ReactionCity";

export default function ReactionCityPage() {
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(new Date());

  if (today !== "Friday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white text-center px-4">
        <p className="text-6xl mb-6">🔒</p>
        <p className="text-white text-2xl font-black">Today reads as: {today}</p>
        <p className="text-white/60 text-lg">This game is only available on Fridays.</p>
      </div>
    );
  }

  return <ReactionCity />;
}