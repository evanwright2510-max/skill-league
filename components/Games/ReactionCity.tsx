"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const GAME_TIME = 60;
const TRACK_WIDTH = 1000;
const INPUT_COOLDOWN_MS = 140;

type Phase = "idle" | "playing" | "gameOver";
type Feedback = "perfect" | "good" | "miss" | null;

type TargetZone = {
  start: number;
  width: number;
};

type Snapshot = {
  phase: Phase;
  timeLeft: number;
  score: number;
  hits: number;
  misses: number;
  combo: number;
  bestCombo: number;
  level: number;
  markerX: number;
  zone: TargetZone;
  feedback: Feedback;
  message: string;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function makeZone(level: number): TargetZone {
  const width = clamp(160 - level * 8, 48, 160);
  const start = rand(70, TRACK_WIDTH - width - 70);
  return { start, width };
}

function getSpeed(level: number) {
  return clamp(0.55 + level * 0.06, 0.55, 1.55);
}

export default function ReactionCity() {
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastInputRef = useRef(0);
  const savedRef = useRef(false);

  const phaseRef = useRef<Phase>("idle");
  const markerRef = useRef(0);
  const directionRef = useRef(1);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const levelRef = useRef(1);
  const zoneRef = useRef<TargetZone>(makeZone(1));

  const [snap, setSnap] = useState<Snapshot>({
    phase: "idle",
    timeLeft: GAME_TIME,
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
    level: 1,
    markerX: 0,
    zone: zoneRef.current,
    feedback: null,
    message: "Press start. Lock the cursor inside the green zone.",
  });

  const sync = useCallback((patch?: Partial<Snapshot>) => {
    setSnap((prev) => ({
      ...prev,
      phase: phaseRef.current,
      score: scoreRef.current,
      hits: hitsRef.current,
      misses: missesRef.current,
      combo: comboRef.current,
      bestCombo: bestComboRef.current,
      level: levelRef.current,
      markerX: markerRef.current,
      zone: zoneRef.current,
      ...patch,
    }));
  }, []);

  const endGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    phaseRef.current = "gameOver";

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;

    sync({
      phase: "gameOver",
      timeLeft: 0,
      feedback: null,
      message: "Game over.",
    });

    if (!savedRef.current) {
      savedRef.current = true;

      const total = hitsRef.current + missesRef.current;
      const accuracy = total > 0 ? hitsRef.current / total : 0;

      saveScore({
        gameId: "reaction-lock",
        score: scoreRef.current,
        durationSeconds: GAME_TIME,
        accuracy,
        attemptNumber: 1,
      }).then((result) => {
        console.log("REACTION LOCK SAVE RESULT:", result);
      });
    }
  }, [sync]);

  const gameLoop = useCallback(
    (now: number) => {
      if (phaseRef.current !== "playing") return;

      if (lastFrameRef.current === null) lastFrameRef.current = now;
      if (startTimeRef.current === null) startTimeRef.current = now;

      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const elapsed = (now - startTimeRef.current) / 1000;
      const timeLeft = Math.max(0, GAME_TIME - elapsed);

      let next =
        markerRef.current +
        directionRef.current * getSpeed(levelRef.current) * delta;

      if (next >= TRACK_WIDTH) {
        next = TRACK_WIDTH;
        directionRef.current = -1;
      }

      if (next <= 0) {
        next = 0;
        directionRef.current = 1;
      }

      markerRef.current = next;

      sync({ timeLeft: Math.ceil(timeLeft) });

      if (timeLeft <= 0) {
        endGame();
        return;
      }

      frameRef.current = requestAnimationFrame(gameLoop);
    },
    [endGame, sync]
  );

  const startGame = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    savedRef.current = false;
    phaseRef.current = "playing";
    markerRef.current = 0;
    directionRef.current = 1;
    scoreRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    levelRef.current = 1;
    zoneRef.current = makeZone(1);
    lastFrameRef.current = null;
    startTimeRef.current = null;
    lastInputRef.current = 0;

    sync({
      phase: "playing",
      timeLeft: GAME_TIME,
      feedback: null,
      message: "Click or press SPACE when the marker is inside the green zone.",
    });

    frameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, sync]);

  const handleLock = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const now = performance.now();

    if (now - lastInputRef.current < INPUT_COOLDOWN_MS) return;
    lastInputRef.current = now;

    const marker = markerRef.current;
    const zone = zoneRef.current;
    const zoneEnd = zone.start + zone.width;
    const center = zone.start + zone.width / 2;

    const inside = marker >= zone.start && marker <= zoneEnd;
    const distance = Math.abs(marker - center);
    const perfectWindow = Math.max(9, zone.width * 0.22);
    const perfect = inside && distance <= perfectWindow;

    if (inside) {
      hitsRef.current += 1;
      comboRef.current += 1;
      bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);

      const shouldLevelUp = hitsRef.current % 4 === 0;
      if (shouldLevelUp) levelRef.current += 1;

      const gained = perfect
        ? 150 + comboRef.current * 12 + levelRef.current * 8
        : 85 + comboRef.current * 6 + levelRef.current * 5;

      scoreRef.current += gained;
      zoneRef.current = makeZone(levelRef.current);

      sync({
        feedback: perfect ? "perfect" : "good",
        message: perfect ? `Perfect lock! +${gained}` : `Good hit! +${gained}`,
      });
    } else {
      missesRef.current += 1;
      comboRef.current = 0;

      const penalty = Math.min(130, 35 + levelRef.current * 6);
      scoreRef.current = Math.max(0, scoreRef.current - penalty);
      zoneRef.current = makeZone(levelRef.current);

      sync({
        feedback: "miss",
        message: `Miss. -${penalty}`,
      });
    }

    window.setTimeout(() => {
      if (phaseRef.current === "playing") {
        sync({ feedback: null });
      }
    }, 180);
  }, [sync]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      e.preventDefault();
      handleLock();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [handleLock]);

  const progressPercent = Math.round((snap.timeLeft / GAME_TIME) * 100);
  const markerPercent = (snap.markerX / TRACK_WIDTH) * 100;
  const zoneLeftPercent = (snap.zone.start / TRACK_WIDTH) * 100;
  const zoneWidthPercent = (snap.zone.width / TRACK_WIDTH) * 100;

  return (
    <div className="min-h-screen overflow-hidden bg-black px-5 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,197,94,0.24),transparent_30%),radial-gradient(circle_at_85%_5%,rgba(250,204,21,0.20),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:46px_46px]" />

      <div className="relative mx-auto max-w-[1450px]">
        <div className="mb-5 rounded-[2rem] border border-white/10 bg-white/[0.065] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge color="emerald">Friday Game</Badge>
                <Badge color="yellow">Timing</Badge>
                <Badge color="sky">Reaction Lock</Badge>
              </div>

              <h1 className="text-5xl font-black tracking-tight md:text-7xl">
                Reaction <span className="text-emerald-300">Lock</span>
              </h1>

              <p className="mt-3 max-w-4xl text-lg font-medium text-zinc-300">
                The marker sweeps across the track. Click or press space when it
                enters the green zone. Perfect center hits score more.
              </p>
            </div>

            <button
              onClick={startGame}
              className="rounded-2xl bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 px-9 py-4 text-xl font-black text-zinc-950 shadow-xl shadow-emerald-950/50 transition hover:scale-[1.03] active:scale-[0.98]"
            >
              {snap.phase === "idle"
                ? "Start Game"
                : snap.phase === "gameOver"
                ? "Play Again"
                : "Restart"}
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Score" value={snap.score} detail="Live total" />
          <Stat label="Time" value={snap.timeLeft} detail="Seconds left" />
          <Stat label="Hits" value={snap.hits} detail="Successful locks" />
          <Stat label="Combo" value={snap.combo} detail="Current streak" />
          <Stat label="Level" value={snap.level} detail="Speed + precision" />
        </div>

        <div
          className={[
            "rounded-[2rem] border bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl transition",
            snap.feedback === "perfect"
              ? "border-yellow-300/70"
              : snap.feedback === "good"
              ? "border-emerald-300/70"
              : snap.feedback === "miss"
              ? "border-red-300/70"
              : "border-white/10",
          ].join(" ")}
        >
          <div className="mb-4 h-3 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="relative min-h-[660px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950 p-8 shadow-2xl">
            {snap.phase === "idle" && (
              <CenterOverlay
                title="Ready?"
                text="Click start. Lock the moving marker inside the green target zone."
              />
            )}

            {snap.phase === "gameOver" && (
              <CenterOverlay
                title="Game Over"
                text={`Final Score: ${snap.score} • Hits: ${snap.hits} • Misses: ${snap.misses} • Best Combo: ${snap.bestCombo}`}
                highlight
              />
            )}

            <div className="relative z-10 flex min-h-[590px] flex-col items-center justify-center gap-12">
              <div className="rounded-[2rem] border border-white/10 bg-black/35 px-8 py-5 text-center shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">
                  Target
                </p>
                <p className="mt-2 text-4xl font-black">
                  {snap.feedback === "perfect"
                    ? "PERFECT"
                    : snap.feedback === "good"
                    ? "LOCKED"
                    : snap.feedback === "miss"
                    ? "MISS"
                    : "Hit Green"}
                </p>
              </div>

              <div className="w-full max-w-[1150px]">
                <div className="relative h-32 rounded-[2rem] border border-white/10 bg-black/50 p-5 shadow-2xl backdrop-blur-xl">
                  <div className="absolute inset-5 rounded-[1.5rem] border border-white/10 bg-zinc-950">
                    <div
                      className="absolute top-0 h-full rounded-xl border-2 border-emerald-100 bg-emerald-400/80 shadow-lg shadow-emerald-400/40"
                      style={{
                        left: `${zoneLeftPercent}%`,
                        width: `${zoneWidthPercent}%`,
                      }}
                    />

                    <div
                      className="absolute top-0 h-full w-[4px] rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.9)]"
                      style={{ left: `${markerPercent}%` }}
                    />

                    <div
                      className="absolute top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-gradient-to-br from-sky-300 to-fuchsia-300 shadow-2xl shadow-sky-300/40"
                      style={{ left: `${markerPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleLock}
                  disabled={snap.phase !== "playing"}
                  className={[
                    "mt-8 w-full rounded-[2rem] px-8 py-6 text-3xl font-black shadow-2xl transition",
                    snap.phase === "playing"
                      ? "bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 text-zinc-950 hover:scale-[1.015] active:scale-[0.99]"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-500",
                  ].join(" ")}
                >
                  LOCK
                </button>

                <p className="mt-4 text-center text-sm font-bold text-zinc-500">
                  Press <span className="text-zinc-300">SPACE</span> or click{" "}
                  <span className="text-zinc-300">LOCK</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-base font-semibold text-zinc-300">
            {snap.message}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "yellow" | "sky";
}) {
  const styles = {
    emerald:
      "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    yellow: "border-yellow-300/30 bg-yellow-300/10 text-yellow-200",
    sky: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  };

  return (
    <span
      className={[
        "rounded-full border px-4 py-1 text-xs font-black uppercase tracking-[0.3em]",
        styles[color],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
        {label}
      </p>
      <p className="mt-1 text-4xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-500">{detail}</p>
    </div>
  );
}

function CenterOverlay({
  title,
  text,
  highlight = false,
}: {
  title: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-zinc-950/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        <p
          className={[
            "text-5xl font-black",
            highlight ? "text-emerald-300" : "text-white",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="mt-4 text-lg font-semibold text-zinc-300">{text}</p>
      </div>
    </div>
  );
}