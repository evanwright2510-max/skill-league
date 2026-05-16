import GameGate from "@/components/GameGate";
import PrecisionTrace from "@/components/Games/PrecisionTrace";

export default function PrecisionTracePage() {
  return (
    <GameGate gameId="precision-trace">
      <PrecisionTrace />
    </GameGate>
  );
}