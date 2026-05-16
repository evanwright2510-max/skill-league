export type GameId =
  | "word-rush"
  | "memory-grid"
  | "precision-trace"
  | "match-rush"
  | "reaction-city";

export const DAILY_GAMES: Record<number, GameId> = {
  1: "word-rush",        // Monday
  2: "memory-grid",     // Tuesday
  3: "precision-trace", // Wednesday
  4: "match-rush",      // Thursday
  5: "reaction-city",   // Friday
};

export function getTodayGameId() {
  const day = new Date().getDay();
  return DAILY_GAMES[day] ?? null;
}

export function canPlayOfficial(gameId: GameId) {
  return getTodayGameId() === gameId;
}