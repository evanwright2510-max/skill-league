import GameGate from "@/components/GameGate";
import MatchRush from "@/components/Games/MatchRush";

export default function MatchRushPage() {
  return (
    <GameGate gameId="match-rush">
      <MatchRush />
    </GameGate>
  );
}