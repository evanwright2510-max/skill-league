import { createClient } from "@/utils/supabase/client";
import { canPlayOfficial } from "@/lib/gameAccess";

type SaveScoreInput = {
  gameId: string;
  score: number;
  durationSeconds?: number;
  accuracy?: number | null;
  attemptNumber?: number;
};

function getTodayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekStart() {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function saveScore({
  gameId,
  score,
  durationSeconds = 0,
  accuracy = null,
  attemptNumber = 1,
}: SaveScoreInput) {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be logged in to save a score.");
  }

  const today = getTodayDate();
  const weekStart = getWeekStart();
  const isOfficial = canPlayOfficial(gameId);

  if (!isOfficial) {
    throw new Error("This game is not available for official scoring today.");
  }

  const { data: existingScore, error: existingError } = await supabase
    .from("game_scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .eq("played_on", today)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingScore) {
    throw new Error("You already submitted your official attempt today.");
  }

  const { error } = await supabase.from("game_scores").insert({
    user_id: user.id,
    game_id: gameId,
    score,
    duration_seconds: durationSeconds,
    accuracy,
    attempt_number: attemptNumber,
    played_on: today,
    week_start: weekStart,
    flagged: false,
  });

  if (error) throw error;

  return { success: true };
}