import WordRush from "@/components/Games/WordRush";
import MemoryGrid from "@/components/Games/MemoryGrid";
import PrecisionTrace from "@/components/Games/PrecisionTrace";
import MatchRush from "@/components/Games/MatchRush";
import ReactionLock from "@/components/Games/ReactionCity";

export const dailyGames = {
  1: {
    id: "word-rush",
    name: "Word Rush",
    day: "Monday",
    path: "/games/word-rush",
    component: WordRush,
  },
  2: {
    id: "memory-grid",
    name: "Memory Grid",
    day: "Tuesday",
    path: "/games/memory-grid",
    component: MemoryGrid,
  },
  3: {
    id: "precision-trace",
    name: "Precision Trace",
    day: "Wednesday",
    path: "/games/precision-trace",
    component: PrecisionTrace,
  },
  4: {
    id: "match-rush",
    name: "Match Rush",
    day: "Thursday",
    path: "/games/match-rush",
    component: MatchRush,
  },
  5: {
    id: "reaction-lock",
    name: "Reaction Lock",
    day: "Friday",
    path: "/games/reaction-lock",
    component: ReactionLock,
  },
} as const;

export type GameId = (typeof dailyGames)[keyof typeof dailyGames]["id"];

export function getTodayGame() {
  const day = new Date().getDay();

  return dailyGames[day as keyof typeof dailyGames] ?? null;
}

export function getGameById(gameId: string) {
  return Object.values(dailyGames).find((game) => game.id === gameId) ?? null;
}

export function isTodayGame(gameId: string) {
  const todayGame = getTodayGame();

  return todayGame?.id === gameId;
}

export function getAllGames() {
  return Object.values(dailyGames);
}