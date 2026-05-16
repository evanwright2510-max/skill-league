import GameGate from "@/components/GameGate";
import WordRush from "@/components/Games/WordRush";

export default function WordRushPage() {
  return (
    <GameGate gameId="word-rush">
      <WordRush />
    </GameGate>
  );
}