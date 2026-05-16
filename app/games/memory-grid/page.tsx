import GameGate from "@/components/GameGate";
import MemoryGrid from "@/components/Games/MemoryGrid";

export default function MemoryGridPage() {
  return (
    <GameGate gameId="memory-grid">
      <MemoryGrid />
    </GameGate>
  );
}