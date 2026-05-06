"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const WIDTH = 1500;
const HEIGHT = 760;
const GAME_TIME = 120;

type Point = { x: number; y: number };
type Phase = "idle" | "study" | "ready" | "tracing" | "crashed" | "gameOver";

type Hazard = {
  id: number;
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
};

type TrailPoint = Point & { t: number };

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;

  if (len === 0) return dist(p, a);

  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)
  );

  return dist(p, {
    x: a.x + t * dx,
    y: a.y + t * dy,
  });
}

function distToPath(p: Point, path: Point[]) {
  let best = Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    best = Math.min(best, distToSegment(p, path[i], path[i + 1]));
  }

  return best;
}

function makePath(level: number): Point[] {
  const points = [
    { x: 95, y: HEIGHT / 2 },
    { x: 275, y: rand(160, 300) },
    { x: 490, y: rand(485, 625) },
    { x: 710, y: rand(160, 300) },
    { x: 930, y: rand(485, 625) },
    { x: 1160, y: rand(165, 310) },
    { x: 1405, y: HEIGHT / 2 },
  ];

  if (level >= 4) {
    points.splice(3, 0, { x: 610, y: rand(320, 450) });
  }

  if (level >= 7) {
    points.splice(6, 0, { x: 1050, y: rand(320, 455) });
  }

  if (level >= 10) {
    points.splice(2, 0, { x: 390, y: rand(315, 455) });
  }

  return points;
}

function pointOnPath(path: Point[], progress: number) {
  const segments = [];
  let total = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const len = dist(path[i], path[i + 1]);
    segments.push({ a: path[i], b: path[i + 1], len });
    total += len;
  }

  let target = total * progress;

  for (const s of segments) {
    if (target <= s.len) {
      const ratio = target / s.len;

      return {
        x: s.a.x + (s.b.x - s.a.x) * ratio,
        y: s.a.y + (s.b.y - s.a.y) * ratio,
      };
    }

    target -= s.len;
  }

  return path[path.length - 1];
}

function makeHazards(level: number, path: Point[], corridorWidth: number) {
  const hazards: Hazard[] = [];
  const count = Math.min(3 + level * 2, 30);

  let tries = 0;

  while (hazards.length < count && tries < 1800) {
    tries++;

    const base = pointOnPath(path, rand(0.12, 0.88));
    const angle = rand(0, Math.PI * 2);
    const offset = rand(0, corridorWidth * 0.23);

    const r = rand(Math.max(10, 30 - level), Math.max(17, 45 - level));
    const speed = Math.min(1.15, 0.22 + level * 0.055);

    const h: Hazard = {
      id: Date.now() + tries + hazards.length,
      x: base.x + Math.cos(angle) * offset,
      y: base.y + Math.sin(angle) * offset,
      r,
      dx: rand(-speed, speed),
      dy: rand(-speed, speed),
    };

    if (dist(h, path[0]) < 155) continue;
    if (dist(h, path[path.length - 1]) < 155) continue;
    if (distToPath(h, path) > corridorWidth / 2 - h.r - 5) continue;

    const overlaps = hazards.some((o) => dist(o, h) < o.r + h.r + 24);
    if (overlaps) continue;

    hazards.push(h);
  }

  return hazards;
}

export default function PrecisionTrace() {
  const savedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [level, setLevel] = useState(1);
  const [cleared, setCleared] = useState(0);
  const [path, setPath] = useState<Point[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [message, setMessage] = useState(
    "Press start. Memorize the flashing circles, then trace."
  );

  const corridorWidth = Math.max(100, 245 - level * 8);
  const playerRadius = 9;
  const studyTime = Math.max(2400, 6200 - level * 230);
  const progressPercent = Math.round((timeLeft / GAME_TIME) * 100);
  const score = cleared * 350 + timeLeft * 5 + level * 30;

  const pathD = useMemo(() => {
    if (!path.length) return "";
    return path.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [path]);

  function getPoint(e: React.PointerEvent<HTMLDivElement>): Point | null {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function buildLevel(nextLevel: number) {
    const newPath = makePath(nextLevel);
    const newWidth = Math.max(100, 245 - nextLevel * 8);

    setPath(newPath);
    setHazards(makeHazards(nextLevel, newPath, newWidth));
    setTrail([]);
    setPhase("study");
    setMessage("Memorize the flashing red circles. They will disappear.");
  }

  function startGame() {
    savedRef.current = false;

    setTimeLeft(GAME_TIME);
    setLevel(1);
    setCleared(0);
    setTrail([]);
    buildLevel(1);
  }

  function crash(reason: string) {
    if (phase === "crashed" || phase === "gameOver") return;

    setPhase("crashed");
    setTrail([]);
    setMessage(reason);

    setTimeout(() => {
      buildLevel(level);
    }, 750);
  }

  function completeLevel() {
    const next = level + 1;

    setCleared((c) => c + 1);
    setLevel(next);
    setMessage("Level cleared. New pattern loading.");
    buildLevel(next);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "ready") return;

    const p = getPoint(e);
    if (!p || !path[0]) return;

    if (dist(p, path[0]) > 66) {
      setMessage("Start inside the green circle.");
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setPhase("tracing");
    setTrail([{ ...p, t: Date.now() }]);
    setMessage("Trace to yellow. Hidden circles still count.");
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "tracing") return;

    const p = getPoint(e);
    if (!p) return;

    const now = Date.now();

    setTrail((old) => [
      ...old.filter((point) => now - point.t < 1500),
      { ...p, t: now },
    ]);

    if (distToPath(p, path) > corridorWidth / 2 - playerRadius) {
      crash("You left the path.");
      return;
    }

    if (hazards.some((h) => dist(p, h) <= h.r + playerRadius)) {
      crash("You hit a hidden circle.");
      return;
    }

    const finish = path[path.length - 1];

    if (dist(p, finish) < 70) {
      completeLevel();
    }
  }

  function handlePointerUp() {
    if (phase === "tracing") {
      crash("You lifted your mouse.");
    }
  }

  useEffect(() => {
    if (phase !== "study") return;

    const timer = setTimeout(() => {
      setPhase("ready");
      setMessage("Circles hidden. Start from green and trace to yellow.");
    }, studyTime);

    return () => clearTimeout(timer);
  }, [phase, studyTime]);

  useEffect(() => {
    if (phase === "idle" || phase === "gameOver") return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("gameOver");
          setTrail([]);
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

    const accuracy = cleared + level > 0 ? cleared / (cleared + level) : 0;

    saveScore({
      gameId: "precision-trace",
      score,
      durationSeconds: GAME_TIME,
      accuracy,
      attemptNumber: 1,
    }).then((result) => {
      console.log("PRECISION TRACE SAVE RESULT:", result);
    });
  }, [phase, score, cleared, level]);

  useEffect(() => {
    if (phase !== "study") return;

    const mover = setInterval(() => {
      setHazards((old) =>
        old.map((h) => {
          let x = h.x + h.dx;
          let y = h.y + h.dy;
          let dx = h.dx;
          let dy = h.dy;

          if (x < h.r || x > WIDTH - h.r) dx *= -1;
          if (y < h.r || y > HEIGHT - h.r) dy *= -1;

          return {
            ...h,
            x: Math.max(h.r, Math.min(WIDTH - h.r, x)),
            y: Math.max(h.r, Math.min(HEIGHT - h.r, y)),
            dx,
            dy,
          };
        })
      );
    }, 16);

    return () => clearInterval(mover);
  }, [phase]);

  return (
    <div className="min-h-screen overflow-hidden bg-black px-5 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(217,70,239,0.30),transparent_30%),radial-gradient(circle_at_82%_2%,rgba(14,165,233,0.24),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.16),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative mx-auto max-w-[1580px]">
        <div className="mb-5 rounded-[2rem] border border-white/10 bg-white/[0.065] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-fuchsia-200">
                  Wednesday Game
                </span>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-emerald-200">
                  Memory + Precision
                </span>
                <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-sky-200">
                  2 Minute Run
                </span>
              </div>

              <h1 className="text-5xl font-black tracking-tight md:text-7xl">
                Precision <span className="text-fuchsia-300">Trace</span>
              </h1>

              <p className="mt-3 max-w-4xl text-lg font-medium text-zinc-300">
                Memorize the flashing hazards, then trace the glowing route from
                middle-left to middle-right without touching hidden danger zones.
              </p>
            </div>

            <button
              onClick={startGame}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 px-9 py-4 text-xl font-black text-zinc-950 shadow-xl shadow-fuchsia-950/50 transition hover:scale-[1.03]"
            >
              {phase === "idle"
                ? "Start Game"
                : phase === "gameOver"
                  ? "Play Again"
                  : "Restart"}
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Level" value={level} detail="Current route" />
          <Stat label="Cleared" value={cleared} detail="Successful traces" />
          <Stat label="Time" value={timeLeft} detail="Seconds left" />
          <Stat label="Score" value={score} detail="Live total" />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 h-3 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div
            ref={boardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={[
              "relative aspect-[1500/760] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950",
              "touch-none select-none cursor-crosshair shadow-2xl",
              phase === "crashed" ? "ring-4 ring-red-400" : "",
            ].join(" ")}
          >
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="heavyGlow">
                  <feGaussianBlur stdDeviation="16" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <linearGradient
                  id="pathGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(52,211,153,0.38)" />
                  <stop offset="50%" stopColor="rgba(217,70,239,0.42)" />
                  <stop offset="100%" stopColor="rgba(251,191,36,0.38)" />
                </linearGradient>

                <linearGradient
                  id="trailGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgb(56,189,248)" />
                  <stop offset="50%" stopColor="rgb(217,70,239)" />
                  <stop offset="100%" stopColor="rgb(255,255,255)" />
                </linearGradient>
              </defs>

              <rect width={WIDTH} height={HEIGHT} fill="rgb(2,6,23)" />

              <g opacity="0.4">
                {Array.from({ length: 18 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 90}
                    y1="0"
                    x2={i * 90}
                    y2={HEIGHT}
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="2"
                  />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 90}
                    x2={WIDTH}
                    y2={i * 90}
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="2"
                  />
                ))}
              </g>

              <circle cx="150" cy="110" r="220" fill="rgba(217,70,239,0.11)" />
              <circle cx="1280" cy="620" r="260" fill="rgba(14,165,233,0.1)" />
              <circle
                cx="760"
                cy="380"
                r="340"
                fill="rgba(255,255,255,0.025)"
              />

              <path
                d={pathD}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={corridorWidth + 34}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d={pathD}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth={corridorWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#heavyGlow)"
              />

              <path
                d={pathD}
                fill="none"
                stroke="rgba(255,255,255,0.44)"
                strokeWidth="6"
                strokeDasharray="22 20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {trail.length > 1 && (
                <>
                  <polyline
                    points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="url(#trailGradient)"
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#heavyGlow)"
                  />
                  <polyline
                    points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {path[0] && (
                <g filter="url(#glow)">
                  <circle
                    cx={path[0].x}
                    cy={path[0].y}
                    r="61"
                    fill="rgba(52,211,153,0.24)"
                  />
                  <circle
                    cx={path[0].x}
                    cy={path[0].y}
                    r="47"
                    fill="rgb(52,211,153)"
                    stroke="white"
                    strokeWidth="6"
                  />
                  <text
                    x={path[0].x}
                    y={path[0].y + 7}
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="900"
                    fill="rgb(2,6,23)"
                  >
                    START
                  </text>
                </g>
              )}

              {path[path.length - 1] && (
                <g filter="url(#glow)">
                  <circle
                    cx={path[path.length - 1].x}
                    cy={path[path.length - 1].y}
                    r="61"
                    fill="rgba(251,191,36,0.24)"
                  />
                  <circle
                    cx={path[path.length - 1].x}
                    cy={path[path.length - 1].y}
                    r="47"
                    fill="rgb(251,191,36)"
                    stroke="white"
                    strokeWidth="6"
                  />
                  <text
                    x={path[path.length - 1].x}
                    y={path[path.length - 1].y + 7}
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="900"
                    fill="rgb(2,6,23)"
                  >
                    END
                  </text>
                </g>
              )}

              {hazards.map((h, i) => (
                <g key={h.id} opacity={phase === "study" ? 1 : 0}>
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.r + 12}
                    fill="rgba(239,68,68,0.18)"
                    filter="url(#glow)"
                  />
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.r}
                    fill="rgb(239,68,68)"
                    stroke="white"
                    strokeWidth="3"
                    style={{
                      animation:
                        phase === "study"
                          ? `pulse 0.42s ease-in-out ${
                              i * 0.045
                            }s infinite alternate`
                          : "none",
                    }}
                  />
                </g>
              ))}
            </svg>

            <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/65 px-5 py-2 text-sm font-black uppercase tracking-widest text-zinc-200 shadow-xl backdrop-blur">
              {phase === "study"
                ? "Memorize"
                : phase === "ready"
                  ? "Ready To Trace"
                  : phase === "tracing"
                    ? "Tracing"
                    : phase === "crashed"
                      ? "Resetting"
                      : phase}
            </div>

            <div className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/65 px-5 py-2 text-sm font-black uppercase tracking-widest text-zinc-200 shadow-xl backdrop-blur">
              Path Width: {Math.round(corridorWidth)}
            </div>

            {phase === "study" && (
              <div className="pointer-events-none absolute left-1/2 top-7 -translate-x-1/2 rounded-3xl border border-red-300/30 bg-black/45 px-7 py-4 text-center shadow-2xl backdrop-blur-md">
                <p className="text-2xl font-black text-red-300">
                  MEMORIZE FAST
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-300">
                  Hazards vanish in {(studyTime / 1000).toFixed(1)} seconds.
                </p>
              </div>
            )}

            {phase === "idle" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="max-w-lg rounded-[2rem] border border-white/10 bg-zinc-950/70 p-8 text-center shadow-2xl backdrop-blur-md">
                  <p className="text-5xl font-black">Ready?</p>
                  <p className="mt-4 text-lg font-semibold text-zinc-300">
                    Press start. Red circles flash first, then disappear.
                  </p>
                </div>
              </div>
            )}

            {phase === "gameOver" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="max-w-lg rounded-[2rem] border border-white/10 bg-zinc-950/90 p-8 text-center shadow-2xl backdrop-blur-xl">
                  <p className="text-5xl font-black text-fuchsia-300">
                    Game Over
                  </p>
                  <p className="mt-4 text-lg font-semibold text-zinc-300">
                    Final Score: <span className="text-white">{score}</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-500">
                    Levels Cleared: {cleared}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-base font-semibold text-zinc-300">
              {message}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm font-bold text-zinc-400">
              <span className="text-fuchsia-300">Goal:</span> memorize hazards
              → trace path → clear levels → survive 2 minutes.
            </div>
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
      <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-300">
        {label}
      </p>
      <p className="mt-1 text-4xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-500">{detail}</p>
    </div>
  );
}