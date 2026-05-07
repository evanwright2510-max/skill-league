"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const GAME_TIME = 60;
const TRACK_WIDTH = 1000;

type Phase = "idle" | "playing" | "gameOver";
type Feedback = "perfect" | "good" | "miss" | null;

type TargetZone = {
  start: number;
  width: number;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeZone(level: number): TargetZone {
  const width = Math.max(44, 150 - level * 7);
  const start = rand(60, TRACK_WIDTH - width - 60);
  return { start, width };
}

export default function ReactionCity() {
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const markerRef = useRef(0);
  const directionRef = useRef(1);
  const zoneRef = useRef<TargetZone>(makeZone(1));
  const phaseRef = useRef<Phase>("idle");

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [markerX, setMarkerX] = useState(0);
  const [zone, setZone] = useState<TargetZone>(() => zoneRef.current);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [message, setMessage] = useState(
    "Press start. Lock the cursor inside the green zone."
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const progressPercent = Math.round((timeLeft / GAME_TIME) * 100);

  const speed = useMemo(() => {
    return Math.min(1.65, 0.62 + level * 0.055);
  }, [level]);

  const markerPercent = (markerX / TRACK_WIDTH) * 100;
  const zoneLeftPercent = (zone.start / TRACK_WIDTH) * 100;
  const zoneWidthPercent = (zone.width / TRACK_WIDTH) * 100;

  function setNewZone(nextLevel: number) {
    const nextZone = makeZone(nextLevel);
    zoneRef.current = nextZone;
    setZone(nextZone);
  }

  function startGame() {
    savedRef.current = false;

    markerRef.current = 0;
    directionRef.current = 1;

    const firstZone = makeZone(1);
    zoneRef.current = firstZone;

    setPhase("playing");
    setTimeLeft(GAME_TIME);
    setScore(0);
    setHits(0);
    setMisses(0);
    setCombo(0);
    setBestCombo(0);
    setLevel(1);
    setMarkerX(0);
    setZone(firstZone);
    setFeedback(null);
    setMessage("Click or press SPACE when the marker is inside the green zone.");
  }

  function handleLock() {
    if (phaseRef.current !== "playing") return;

    const currentMarker = markerRef.current;
    const currentZone = zoneRef.current;

    const zoneEnd = currentZone.start + currentZone.width;
    const center = currentZone.start + currentZone.width / 2;
    const distanceFromCenter = Math.abs(currentMarker - center);
    const perfectWindow = Math.max(10, currentZone.width * 0.23);

    const inside = currentMarker >= currentZone.start && currentMarker <= zoneEnd;
    const perfect = inside && distanceFromCenter <= perfectWindow;

    if (perfect) {
      setHits((prevHits) => {
        const newHits = prevHits + 1;
        const nextLevel = newHits % 4 === 0 ? level + 1 : level;

        setLevel(nextLevel);
        setNewZone(nextLevel);

        return newHits;
      });

      setCombo((prevCombo) => {
        const nextCombo = prevCombo + 1;
        const gained = 150 + nextCombo * 12 + level * 8;

        setScore((s) => s + gained);
        setBestCombo((b) => Math.max(b, nextCombo));
        setMessage(`Perfect lock! +${gained}`);

        return nextCombo;
      });

      setFeedback("perfect");
    } else if (inside) {
      setHits((prevHits) => {
        const newHits = prevHits + 1;
        const nextLevel = newHits % 4 === 0 ? level + 1 : level;

        setLevel(nextLevel);
        setNewZone(nextLevel);

        return newHits;
      });

      setCombo((prevCombo) => {
        const nextCombo = prevCombo + 1;
        const gained = 85 + nextCombo * 6 + level * 5;

        setScore((s) => s + gained);
        setBestCombo((b) => Math.max(b, nextCombo));
        setMessage(`Good hit! +${gained}`);

        return nextCombo;
      });

      setFeedback("good");
    } else {
      const penalty = Math.min(120, 35 + level * 5);

      setScore((s) => Math.max(0, s - penalty));
      setMisses((m) => m + 1);
      setCombo(0);
      setFeedback("miss");
      setMessage(`Miss. -${penalty}`);
      setNewZone(level);
    }

    window.setTimeout(() => setFeedback(null), 220);
  }

  useEffect(() => {
    if (phase !== "playing") return;

    function animate(now: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }

      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      let next = markerRef.current + directionRef.current * speed * delta;

      if (next >= TRACK_WIDTH) {
        next = TRACK_WIDTH;
        directionRef.current = -1;
      }

      if (next <= 0) {
        next = 0;
        directionRef.current = 1;
      }

      markerRef.current = next;
      setMarkerX(next);

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = null;
    };
  }, [phase, speed]);

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("gameOver");
          setMessage("Game over.");
          return 0;
        }

        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "gameOver") return;
    if (savedRef.current) return;

    savedRef.current = true;

    const accuracy = hits + misses > 0 ? hits / (hits + misses) : 0;

    saveScore({
      gameId: "reaction-lock",
      score,
      durationSeconds: GAME_TIME,
      accuracy,
      attemptNumber: 1,
    }).then((result) => {
      console.log("REACTION LOCK SAVE RESULT:", result);
    });
  }, [phase, score, hits, misses]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        handleLock();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-black px-5 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,197,94,0.24),transparent_30%),radial-gradient(circle_at_85%_5%,rgba(250,204,21,0.20),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:46px_46px]" />

      <div className="relative mx-auto max-w-[1450px]">
        <div className="mb-5 rounded-[2rem] border border-white/10 bg-white/[0.065] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-emerald-200">
                  Friday Game
                </span>
                <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-yellow-200">
                  Timing
                </span>
                <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-sky-200">
                  Reaction Lock
                </span>
              </div>

              <h1 className="text-5xl font-black tracking-tight md:text-7xl">
                Reaction <span className="text-emerald-300">Lock</span>
              </h1>

              <p className="mt-3 max-w-4xl text-lg font-medium text-zinc-300">
                The marker sweeps across the track. Click or press space when it
                enters the green zone.
              </p>
            </div>

            <button
              onClick={startGame}
              className="rounded-2xl bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 px-9 py-4 text-xl font-black text-zinc-950 shadow-xl shadow-emerald-950/50 transition hover:scale-[1.03]"
            >
              {phase === "idle"
                ? "Start Game"
                : phase === "gameOver"
                ? "Play Again"
                : "Restart"}
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Score" value={score} detail="Live total" />
          <Stat label="Time" value={timeLeft} detail="Seconds left" />
          <Stat label="Hits" value={hits} detail="Successful locks" />
          <Stat label="Combo" value={combo} detail="Current streak" />
          <Stat label="Level" value={level} detail="Speed + smaller zone" />
        </div>

        <div
          className={[
            "rounded-[2rem] border bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl transition",
            feedback === "perfect"
              ? "border-yellow-300/70"
              : feedback === "good"
              ? "border-emerald-300/70"
              : feedback === "miss"
              ? "border-red-300/70"
              : "border-white/10",
          ].join(" ")}
        >
          <div className="mb-4 h-3 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="relative min-h-[660px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950 p-8 shadow-2xl">
            {phase === "idle" && (
              <CenterOverlay
                title="Ready?"
                text="Click start. Lock the moving marker inside the green target zone."
              />
            )}

            {phase === "gameOver" && (
              <CenterOverlay
                title="Game Over"
                text={`Final Score: ${score} • Hits: ${hits} • Misses: ${misses} • Best Combo: ${bestCombo}`}
                highlight
              />
            )}

            <div className="relative z-10 flex min-h-[590px] flex-col items-center justify-center gap-12">
              <div className="rounded-[2rem] border border-white/10 bg-black/35 px-8 py-5 text-center shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">
                  Target
                </p>
                <p className="mt-2 text-4xl font-black">
                  {feedback === "perfect"
                    ? "PERFECT"
                    : feedback === "good"
                    ? "LOCKED"
                    : feedback === "miss"
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
                  disabled={phase !== "playing"}
                  className={[
                    "mt-8 w-full rounded-[2rem] px-8 py-6 text-3xl font-black shadow-2xl transition",
                    phase === "playing"
                      ? "bg-gradient-to-r from-emerald-300 via-yellow-300 to-sky-300 text-zinc-950 hover:scale-[1.015] active:scale-[0.99]"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-500",
                  ].join(" ")}
                >
                  LOCK
                </button>

                <p className="mt-4 text-center text-sm font-bold text-zinc-500">
                  You can also press{" "}
                  <span className="text-zinc-300">SPACE</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-base font-semibold text-zinc-300">
            {message}
          </div>
        </div>
      </div>
    </div>
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