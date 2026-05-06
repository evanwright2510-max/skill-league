import { createClient } from "@/utils/supabase/client";

export async function saveScore({
  gameId,
  score,
  durationSeconds,
  accuracy,
  attemptNumber = 1,
}: {
  gameId: string;
  score: number;
  durationSeconds: number;
  accuracy?: number | null;
  attemptNumber?: number;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log("NO USER FOUND:", userError);
    return { data: null, error: userError, blocked: true };
  }

  const now = new Date();

  const playedOn = now.toISOString().split("T")[0];

  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(now);
  monday.setDate(diff);

  const weekStart = monday.toISOString().split("T")[0];

  const { data: existingScore, error: checkError } = await supabase
    .from("game_scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .eq("played_on", playedOn)
    .maybeSingle();

  if (checkError) {
    console.log("ATTEMPT CHECK ERROR:", checkError);
    return { data: null, error: checkError, blocked: true };
  }

  if (existingScore) {
    console.log("ATTEMPT BLOCKED: already played today");
    return {
      data: null,
      error: null,
      blocked: true,
      reason: "You already used your official attempt for this game today.",
    };
  }

  const { data, error } = await supabase
    .from("game_scores")
    .insert({
      user_id: user.id,
      game_id: gameId,
      score,
      duration_seconds: durationSeconds,
      accuracy: accuracy ?? null,
      attempt_number: attemptNumber,
      played_on: playedOn,
      week_start: weekStart,
    })
    .select();

  console.log("SAVE RESULT:", { data, error });

  return { data, error, blocked: false };
}