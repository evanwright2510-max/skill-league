const GAME_SCHEDULE: Record<string, number> = {
  "word-rush":       1,
  "memory-grid":     2,
  "precision-trace": 3,
  "match-rush":      4,
  "reaction-lock":   5,
  "the-grind":       6,
};

export function canPlayOfficial(gameId: string): boolean {
  const today = new Date().getDay();
  return GAME_SCHEDULE[gameId] === today;
}