import GameGate from "@/components/GameGate";
import ReactionCity from "@/components/Games/ReactionCity";

export default function ReactionCityPage() {
  return (
    <GameGate gameId="reaction-city">
      <ReactionCity />
    </GameGate>
  );
}