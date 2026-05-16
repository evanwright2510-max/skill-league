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
      message: "Tap LOCK or press SPACE when the marker is inside the green zone.",
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
    <div className="min-h-screen overflow-hidden bg-black px-3 py-4 text-white md:px-5 md:py-6">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,197,94,0.24),transparent_30%),radial-gradient(circle_at_85%_5%,rgba(250,204,21,0.20),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:46px_46px]" />

      <div className="relative mx-auto max-w-[1450px]">

        {/* Header */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.065] p-4 shadow-2xl backdrop-blur-xl md:mb-5 md:rounded-[2rem] md:p-5">
          <div className="flex flex-col justify-between gap-4 md:gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3 md:gap-3">
                <Badge color="emerald">Friday Game</Badge>
                <Badge color="yellow">Timing</Badge>
                <Badge color="sky">Reaction Lock</Badge>
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl">
                Reaction <span className="text-emerald-300">Lock</span>
              </h1>

              <p className="mt-2 max-w-4xl text-sm font-medium text-zinc-300 md:mt-3 md:text-lg">
                The marker sweeps across the track. Tap or press space when it
                enters the green zone. Perfect center hits score more.
              </p>
            </div>

            <button
              onClick={startGame}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 px-6 py-3 text-lg font-black text-zinc-950 shadow-xl shadow-emerald-950/50 transition hover:scale-[1.03] active:scale-[0.98] md:w-auto md:px-9 md:py-4 md:text-xl"
            >
              {snap.phase === "idle"
                ? "Start Game"
                : snap.phase === "gameOver"
                  ? "Play Again"
                  : "Restart"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-2 md:mb-5 md:grid-cols-5 md:gap-3">
          <Stat label="Score" value={snap.score} detail="Live total" />
          <Stat label="Time" value={snap.timeLeft} detail="Seconds left" />
          <Stat label="Hits" value={snap.hits} detail="Locks" />
          <Stat label="Combo" value={snap.combo} detail="Streak" className="hidden md:block" />
          <Stat label="Level" value={snap.level} detail="Speed" className="hidden md:block" />
        </div>

        {/* Mobile compact stats */}
        <div className="mb-4 flex items-center justify-center gap-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-300">Combo</span>
            <span className="text-2xl font-black">{snap.combo}x</span>
          </div>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-300">Level</span>
            <span className="text-2xl font-black">{snap.level}</span>
          </div>
        </div>

        {/* Game area */}
        <div
          className={[
            "rounded-2xl border bg-white/[0.055] p-3 shadow-2xl backdrop-blur-xl transition md:rounded-[2rem] md:p-4",
            snap.feedback === "perfect"
              ? "border-yellow-300/70"
              : snap.feedback === "good"
                ? "border-emerald-300/70"
                : snap.feedback === "miss"
                  ? "border-red-300/70"
                  : "border-white/10",
          ].join(" ")}
        >
          {/* Progress bar */}
          <div className="mb-3 h-2 overflow-hidden rounded-full border border-white/10 bg-zinc-950 md:mb-4 md:h-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl md:min-h-[660px] md:rounded-[1.75rem] md:p-8">
            {/* Idle overlay */}
            {snap.phase === "idle" && (
              <CenterOverlay
                title="Ready?"
                text="Tap start. Lock the moving marker inside the green target zone."
              />
            )}

            {/* Game over overlay */}
            {snap.phase === "gameOver" && (
              <CenterOverlay
                title="Game Over"
                text={`Score: ${snap.score} • Hits: ${snap.hits} • Misses: ${snap.misses} • Best Combo: ${snap.bestCombo}`}
                highlight
              />
            )}

            <div className="relative z-10 flex min-h-[320px] flex-col items-center justify-center gap-6 md:min-h-[590px] md:gap-12">

              {/* Feedback display */}
              <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-3 text-center shadow-2xl backdrop-blur-xl md:rounded-[2rem] md:px-8 md:py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 md:text-xs">
                  Target
                </p>
                <p className="mt-1 text-2xl font-black md:mt-2 md:text-4xl">
                  {snap.feedback === "perfect"
                    ? "PERFECT"
                    : snap.feedback === "good"
                      ? "LOCKED"
                      : snap.feedback === "miss"
                        ? "MISS"
                        : "Hit Green"}
                </p>
              </div>

              {/* Track area */}
              <div className="w-full max-w-[1150px]">

                {/* Track */}
                <div className="relative h-20 rounded-2xl border border-white/10 bg-black/50 p-3 shadow-2xl backdrop-blur-xl md:h-32 md:rounded-[2rem] md:p-5">
                  <div className="absolute inset-3 rounded-xl border border-white/10 bg-zinc-950 md:inset-5 md:rounded-[1.5rem]">
                    {/* Green zone */}
                    <div
                      className="absolute top-0 h-full rounded-lg border-2 border-emerald-100 bg-emerald-400/80 shadow-lg shadow-emerald-400/40 md:rounded-xl"
                      style={{
                        left: `${zoneLeftPercent}%`,
                        width: `${zoneWidthPercent}%`,
                      }}
                    />

                    {/* Marker line */}
                    <div
                      className="absolute top-0 h-full w-[3px] rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.9)] md:w-[4px]"
                      style={{ left: `${markerPercent}%` }}
                    />

                    {/* Marker ball */}
                    <div
                      className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-gradient-to-br from-sky-300 to-fuchsia-300 shadow-2xl shadow-sky-300/40 md:h-16 md:w-16 md:border-4"
                      style={{ left: `${markerPercent}%` }}
                    />
                  </div>
                </div>

                {/* Lock button */}
                <button
                  onClick={handleLock}
                  disabled={snap.phase !== "playing"}
                  className={[
                    "mt-4 w-full rounded-2xl px-6 py-5 text-2xl font-black shadow-2xl transition md:mt-8 md:rounded-[2rem] md:px-8 md:py-6 md:text-3xl",
                    snap.phase === "playing"
                      ? "bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 text-zinc-950 hover:scale-[1.015] active:scale-[0.97]"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-500",
                  ].join(" ")}
                >
                  LOCK
                </button>

                <p className="mt-3 text-center text-xs font-bold text-zinc-500 md:mt-4 md:text-sm">
                  Press <span className="text-zinc-300">SPACE</span> or tap{" "}
                  <span className="text-zinc-300">LOCK</span>
                </p>
              </div>
            </div>
          </div>

          {/* Feedback message */}
          <div className="mt-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-zinc-300 md:mt-4 md:rounded-2xl md:px-5 md:py-4 md:text-base">
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
    emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    yellow: "border-yellow-300/30 bg-yellow-300/10 text-yellow-200",
    sky: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  };

  return (
    <span
      className={[
        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] md:px-4 md:text-xs",
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
  className = "",
}: {
  label: string;
  value: number;
  detail: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.06] p-3 shadow-xl backdrop-blur-xl md:rounded-2xl md:p-5 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300 md:text-xs">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-black md:mt-1 md:text-4xl">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-zinc-500 md:mt-1 md:text-xs">{detail}</p>
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-4">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-zinc-950/90 p-6 text-center shadow-2xl backdrop-blur-xl md:rounded-[2rem] md:p-8">
        <p
          className={[
            "text-3xl font-black md:text-5xl",
            highlight ? "text-emerald-300" : "text-white",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="mt-3 text-sm font-semibold text-zinc-300 md:mt-4 md:text-lg">{text}</p>
      </div>
    </div>
  );
}