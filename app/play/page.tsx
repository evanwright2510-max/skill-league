import { redirect } from "next/navigation";

function getTodayGameRoute() {
  const day = new Date().getDay();

  if (day === 1) return "/games/word-rush";
  if (day === 2) return "/games/memory-grid";
  if (day === 3) return "/games/precision-trace";
  if (day === 4) return "/games/match-rush";
  if (day === 5) return "/games/reaction-lock";

  return "/menu";
}

export default function PlayPage() {
  redirect(getTodayGameRoute());
}