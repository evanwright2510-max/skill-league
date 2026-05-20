"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const WIDTH = 1500;
const HEIGHT = 760;
const GAME_TIME = 180;

type Point = { x: number; y: number };
type Phase = "idle" | "study" | "ready" | "tracing" | "crashed" | "gameOver";
type HazardMode = "still" | "horizontal" | "vertical" | "orbit" | "diagonal";

type Hazard = {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  r: number;
  mode: HazardMode;
  amp: number;
  speed: number;
  phase: number;
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

function getLevelSettings(level: number) {
  return {
    corridorWidth: Math.max(160, 305 - level * 3.2),
    studyTime: Math.max(4600, 9200 - level * 110),
    hazardCount:
      level <= 3
        ? 3 + level
        : level <= 7
          ? 5 + Math.floor(level * 0.8)
          : level <= 12
            ? 8 + Math.floor(level * 0.9)
            : 11 + Math.floor(level * 1.05),
    minRadius: Math.max(15, 31 - level * 0.45),
    maxRadius: Math.max(23, 50 - level * 0.55),
    movingChance:
      level <= 3
        ? 0.05
        : level <= 7
          ? 0.18
          : level <= 12
            ? 0.32
            : 0.48,
    motionSpeed:
      level <= 4
        ? 0.0005
        : level <= 9
          ? 0.00072
          : level <= 14
            ? 0.00095
            : 0.00118,
    motionAmp:
      level <= 4
        ? 10
        : level <= 9
          ? 18
          : level <= 14
            ? 27
            : 35,
  };
}

function makePath(level: number): Point[] {
  if (level <= 3) {
    return [
      { x: 95, y: HEIGHT / 2 },
      { x: 360, y: rand(285, 360) },
      { x: 665, y: rand(400, 475) },
      { x: 970, y: rand(285, 360) },
      { x: 1405, y: HEIGHT / 2 },
    ];
  }

  const points: Point[] = [
    { x: 95, y: HEIGHT / 2 },
    { x: 285, y: rand(215, 315) },
    { x: 505, y: rand(445, 545) },
    { x: 725, y: rand(215, 315) },
    { x: 945, y: rand(445, 545) },
    { x: 1165, y: rand(220, 330) },
    { x: 1405, y: HEIGHT / 2 },
  ];

  if (level >= 6) points.splice(3, 0, { x: 615, y: rand(335, 425) });
  if (level >= 10) points.splice(6, 0, { x: 1055, y: rand(335, 425) });
  if (level >= 14) points.splice(2, 0, { x: 395, y: rand(335, 425) });

  return points;
}

function makeHazards(level: number, path: Point[], corridorWidth: number) {
  const settings = getLevelSettings(level);
  const hazards: Hazard[] = [];
  let tries = 0;
  const slots = [0.15, 0.26, 0.37, 0.48, 0.59, 0.7, 0.81, 0.9];

  while (hazards.length < settings.hazardCount && tries < 3500) {
    tries++;
    const slot = slots[hazards.length % slots.length] + rand(-0.025, 0.025);
    const segLen = path.reduce((acc, p, i) => {
      if (i === 0) return 0;
      return acc + dist(path[i - 1], path[i]);
    }, 0);
    let target = segLen * Math.max(0.12, Math.min(0.9, slot));
    let base = path[0];
    for (let i = 0; i < path.length - 1; i++) {
      const d = dist(path[i], path[i + 1]);
      if (target <= d) {
        const ratio = target / d;
        base = {
          x: path[i].x + (path[i + 1].x - path[i].x) * ratio,
          y: path[i].y + (path[i + 1].y - path[i].y) * ratio,
        };
        break;
      }
      target -= d;
    }

    const angle = rand(0, Math.PI * 2);
    const offset = rand(corridorWidth * 0.08, corridorWidth * 0.23);
    const r = rand(settings.minRadius, settings.maxRadius);
    const x = base.x + Math.cos(angle) * offset;
    const y = base.y + Math.sin(angle) * offset;
    const moving = Math.random() < settings.movingChance;
    const modes: HazardMode[] =
      level < 10
        ? ["horizontal", "vertical", "orbit"]
        : ["horizontal", "vertical", "orbit", "diagonal"];
    const mode: HazardMode = moving
      ? modes[Math.floor(Math.random() * modes.length)]
      : "still";

    const h: Hazard = {
      id: Date.now() + tries + hazards.length,
      x,
      y,
      startX: x,
      startY: y,
      r,
      mode,
      amp: rand(settings.motionAmp * 0.45, settings.motionAmp * 0.9),
      speed: rand(settings.motionSpeed * 0.65, settings.motionSpeed),
      phase: rand(0, Math.PI * 2),
    };

    if (dist(h, path[0]) < 190) continue;
    if (dist(h, path[path.length - 1]) < 190) continue;
    if (h.y < 120 || h.y > HEIGHT - 120) continue;
    const pathDist = distToPath(h, path);
    if (pathDist > corridorWidth / 2 - r - 10) continue;
    if (pathDist < r * 0.35 && level <= 8) continue;
    const overlaps = hazards.some((o) => dist(o, h) < o.r + h.r + 42);
    if (overlaps) continue;
    hazards.push(h);
  }

  if (level >= 4) {
    const blockerCount = Math.min(2 + Math.floor(level / 3), 8);
    for (let i = 0; i < blockerCount; i++) {
      const bx = rand(260, 1240);
      const by = i % 2 === 0 ? rand(90, 145) : rand(HEIGHT - 145, HEIGHT - 90);
      hazards.push({
        id: Date.now() + 9000 + i,
        x: bx,
        y: by,
        startX: bx,
        startY: by,
        r: rand(28, 40),
        mode: level >= 9 ? "horizontal" : "still",
        amp: rand(12, 26),
        speed: 0.00055,
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  return hazards;
}

function updateHazardPosition(h: Hazard, elapsed: number): Hazard {
  if (h.mode === "still") return h;
  const wave = Math.sin(elapsed * h.speed + h.phase);
  const wave2 = Math.cos(elapsed * h.speed + h.phase);
  let x = h.startX;
  let y = h.startY;
  if (h.mode === "horizontal") x = h.startX + wave * h.amp;
  if (h.mode === "vertical") y = h.startY + wave * h.amp;
  if (h.mode === "orbit") {
    x = h.startX + wave * h.amp * 0.72;
    y = h.startY + wave2 * h.amp * 0.72;
  }
  if (h.mode === "diagonal") {
    x = h.startX + wave * h.amp * 0.72;
    y = h.startY + wave * h.amp * 0.5;
  }
  return {
    ...h,
    x: Math.max(h.r, Math.min(WIDTH - h.r, x)),
    y: Math.max(h.r, Math.min(HEIGHT - h.r, y)),
  };
}

// ─── MOBILE PROMPT COMPONENT ──────────────────────────────────────────────────

function MobilePrompt() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#02030a] p-8 text-center text-white">
      <div className="mb-6 text-7xl">🖥️</div>
      <h2 className="text-3xl font-black">Play on a Computer</h2>
      <p className="mt-4 max-w-sm text-lg text-zinc-400">
        Precision Trace requires a large screen and mouse precision. Please open this game on a desktop or laptop to play.
      </p>
      <div className="mt-8 flex items-center gap-3 text-zinc-500">
        <span className="text-4xl">📱</span>
        <span className="text-2xl">→</span>
        <span className="text-4xl">💻</span>
      </div>
      <p className="mt-4 text-sm text-zinc-600">
        Best experienced on a widescreen display.
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PrecisionTrace() {
  const savedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const levelStartRef = useRef(Date.now());

  const [isPortrait, setIsPortrait] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [level, setLevel] = useState(1);
  const [cleared, setCleared] = useState(0);
  const [crashes, setCrashes] = useState(0);
  const [path, setPath] = useState<Point[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [message, setMessage] = useState(
    "Press start. Memorize the hazards, then trace the safe route."
  );

  const settings = getLevelSettings(level);
  const corridorWidth = settings.corridorWidth;
  const studyTime = settings.studyTime;
  const playerRadius = 5;
  const progressPercent = Math.round((timeLeft / GAME_TIME) * 100);

  const score = Math.max(
    0,
    cleared * 520 + level * 50 + timeLeft * 4 - crashes * 105
  );

  const pathD = useMemo(() => {
    if (!path.length) return "";
    return path.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [path]);

  const trailPoints = useMemo(
    () => trail.map((p) => `${p.x},${p.y}`).join(" "),
    [trail]
  );

  // Detect mobile (small screen)
  useEffect(() => {
    function checkSize() {
      setIsPortrait(window.innerWidth < 1024);
    }
    checkSize();
    window.addEventListener("resize", checkSize);
    window.addEventListener("orientationchange", () => {
      setTimeout(checkSize, 100);
    });
    return () => {
      window.removeEventListener("resize", checkSize);
      window.removeEventListener("orientationchange", checkSize);
    };
  }, []);

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
    const newSettings = getLevelSettings(nextLevel);
    levelStartRef.current = Date.now();
    setPath(newPath);
    setHazards(makeHazards(nextLevel, newPath, newSettings.corridorWidth));
    setTrail([]);
    setPhase("study");
    setMessage("Memorize the red hazards. They keep moving after they vanish.");
  }

  function startGame() {
    savedRef.current = false;
    setTimeLeft(GAME_TIME);
    setLevel(1);
    setCleared(0);
    setCrashes(0);
    setTrail([]);
    buildLevel(1);
  }

  function crash(reason: string) {
    if (phase === "crashed" || phase === "gameOver") return;
    setCrashes((c) => c + 1);
    setPhase("crashed");
    setTrail([]);
    setMessage(`${reason} Resetting route.`);
    setTimeout(() => {
      buildLevel(level);
    }, 650);
  }

  function completeLevel() {
    const next = level + 1;
    setCleared((c) => c + 1);
    setLevel(next);
    setMessage("Route cleared. Loading next pattern.");
    buildLevel(next);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "ready") return;
    const p = getPoint(e);
    if (!p || !path[0]) return;
    if (dist(p, path[0]) > 74) {
      setMessage("Start inside the green node.");
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setPhase("tracing");
    setTrail([{ ...p, t: Date.now() }]);
    setMessage("Trace to the gold node. Hidden hazards are still moving.");
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
    if (distToPath(p, path) > corridorWidth / 2 - playerRadius + 4) {
      crash("You left the lane.");
      return;
    }
    const hit = hazards.some((h) => dist(p, h) <= h.r + playerRadius);
    if (hit) {
      crash("You hit a hidden hazard.");
      return;
    }
    const finish = path[path.length - 1];
    if (dist(p, finish) < 76) completeLevel();
  }

  function handlePointerUp() {
    if (phase === "tracing") crash("You lifted your finger.");
  }

  // Study timer
  useEffect(() => {
    if (phase !== "study") return;
    const timer = setTimeout(() => {
      setPhase("ready");
      setMessage("Hazards hidden. Start from green and trace to gold.");
    }, studyTime);
    return () => clearTimeout(timer);
  }, [phase, studyTime]);

  // Game timer
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

  // Save score
  useEffect(() => {
    if (phase !== "gameOver") return;
    if (savedRef.current) return;
    savedRef.current = true;
    const accuracy =
      cleared + crashes > 0 ? cleared / Math.max(1, cleared + crashes) : 0;
    saveScore({
      gameId: "precision-trace",
      score,
      durationSeconds: GAME_TIME,
      accuracy,
      attemptNumber: 1,
    }).then((result) => {
      console.log("PRECISION TRACE SAVE RESULT:", result);
    });
  }, [phase, score, cleared, crashes]);

  // Hazard animation
  useEffect(() => {
    if (phase !== "study" && phase !== "ready" && phase !== "tracing") return;
    const mover = setInterval(() => {
      const elapsed = Date.now() - levelStartRef.current;
      setHazards((old) => old.map((h) => updateHazardPosition(h, elapsed)));
    }, 16);
    return () => clearInterval(mover);
  }, [phase]);

  // Prevent touch scroll on the board
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    function preventTouch(e: TouchEvent) {
      e.preventDefault();
    }
    el.addEventListener("touchstart", preventTouch, { passive: false });
    el.addEventListener("touchmove", preventTouch, { passive: false });
    el.addEventListener("touchend", preventTouch, { passive: false });
    return () => {
      el.removeEventListener("touchstart", preventTouch);
      el.removeEventListener("touchmove", preventTouch);
      el.removeEventListener("touchend", preventTouch);
    };
  }, [phase]);

  // Show mobile prompt on small screens
  if (isPortrait) {
    return <MobilePrompt />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#02030a] px-3 py-4 text-white lg:px-5 lg:py-6">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(168,85,247,0.22),transparent_33%),radial-gradient(circle_at_86%_10%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_50%_105%,rgba(16,185,129,0.14),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:54px_54px] opacity-20" />

      <div className="relative mx-auto max-w-[1580px]">

        {/* Header */}
        <div className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-xl lg:mb-5 lg:rounded-[2rem]">
          <div className="relative p-3 lg:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(217,70,239,0.15),transparent_35%),radial-gradient(circle_at_95%_40%,rgba(56,189,248,0.10),transparent_35%)]" />
            <div className="relative flex flex-col justify-between gap-3 lg:gap-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 lg:mb-3 lg:gap-3">
                  <Pill color="fuchsia">Wednesday Game</Pill>
                  <Pill color="emerald">Memory + Precision</Pill>
                  <Pill color="sky">3 Minute Run</Pill>
                </div>

                <h1 className="text-3xl font-black tracking-tight md:text-5xl lg:text-7xl">
                  Precision{" "}
                  <span className="bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                    Trace
                  </span>
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-zinc-300 lg:mt-3 lg:text-lg">
                  Memorize the moving hazards, then trace the corridor without touching hidden danger zones.
                </p>
              </div>

              <button
                onClick={startGame}
                className="group w-full rounded-2xl bg-white px-6 py-3 text-lg font-black text-zinc-950 shadow-2xl shadow-fuchsia-950/40 transition hover:scale-[1.03] hover:bg-zinc-100 active:scale-95 lg:w-auto lg:px-9 lg:py-4 lg:text-xl"
              >
                <span className="bg-gradient-to-r from-fuchsia-600 via-sky-600 to-emerald-600 bg-clip-text text-transparent">
                  {phase === "idle"
                    ? "Start Game"
                    : phase === "gameOver"
                      ? "Play Again"
                      : "Restart"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-3 grid grid-cols-3 gap-2 md:grid-cols-5 lg:mb-5 lg:gap-3">
          <Stat label="Level" value={level} detail="Current route" />
          <Stat label="Cleared" value={cleared} detail="Traces done" />
          <Stat label="Crashes" value={crashes} detail="Penalties" className="hidden md:block" />
          <Stat label="Time" value={timeLeft} detail="Seconds left" />
          <Stat label="Score" value={score} detail="Live total" />
        </div>

        {/* Mobile compact stats (crashes only) */}
        <div className="mb-3 flex items-center justify-center gap-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-fuchsia-300">Crashes</span>
            <span className="text-xl font-black">{crashes}</span>
          </div>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-fuchsia-300">Lane</span>
            <span className="text-xl font-black">{Math.round(corridorWidth)}</span>
          </div>
        </div>

        {/* Game area */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2 shadow-2xl backdrop-blur-xl lg:rounded-[2rem] lg:p-4">
          {/* Progress bar */}
          <div className="mb-2 h-2 overflow-hidden rounded-full border border-white/10 bg-black/70 lg:mb-4 lg:h-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Board */}
          <div
            ref={boardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            className={[
              "relative aspect-[1500/760] w-full overflow-hidden rounded-xl border border-white/10 lg:rounded-[1.75rem]",
              "touch-none select-none overscroll-none cursor-crosshair shadow-2xl",
              "bg-[#030712]",
              phase === "crashed" ? "ring-4 ring-red-400" : "",
            ].join(" ")}
          >
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <filter id="massiveGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="34" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="18" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="tightGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#020617" />
                  <stop offset="48%" stopColor="#07111f" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>
                <radialGradient id="laneCore" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="rgba(125,211,252,0.22)" />
                  <stop offset="55%" stopColor="rgba(34,211,238,0.15)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.08)" />
                </radialGradient>
                <linearGradient id="laneEdge" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(52,211,153,0.16)" />
                  <stop offset="45%" stopColor="rgba(56,189,248,0.26)" />
                  <stop offset="100%" stopColor="rgba(217,70,239,0.15)" />
                </linearGradient>
                <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(52,211,153)" />
                  <stop offset="50%" stopColor="rgb(56,189,248)" />
                  <stop offset="100%" stopColor="rgb(217,70,239)" />
                </linearGradient>
                <pattern id="microGrid" width="44" height="44" patternUnits="userSpaceOnUse">
                  <path
                    d="M 44 0 L 0 0 0 44"
                    fill="none"
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect width={WIDTH} height={HEIGHT} fill="url(#boardBg)" />
              <rect width={WIDTH} height={HEIGHT} fill="url(#microGrid)" opacity="0.55" />

              <circle cx="160" cy="95" r="330" fill="rgba(217,70,239,0.10)" />
              <circle cx="1340" cy="650" r="360" fill="rgba(14,165,233,0.10)" />
              <circle cx="760" cy="380" r="520" fill="rgba(15,23,42,0.35)" />

              {pathD && (
                <>
                  <path d={pathD} fill="none" stroke="rgba(14,165,233,0.10)" strokeWidth={corridorWidth + 105} strokeLinecap="round" strokeLinejoin="round" filter="url(#massiveGlow)" />
                  <path d={pathD} fill="none" stroke="url(#laneEdge)" strokeWidth={corridorWidth + 54} strokeLinecap="round" strokeLinejoin="round" opacity="0.72" filter="url(#softGlow)" />
                  <path d={pathD} fill="none" stroke="rgba(2,6,23,0.36)" strokeWidth={corridorWidth + 24} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={pathD} fill="none" stroke="url(#laneCore)" strokeWidth={corridorWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.98" />
                  <path d={pathD} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={Math.max(22, corridorWidth * 0.24)} strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
                </>
              )}

              {trail.length > 1 && (
                <>
                  <polyline points={trailPoints} fill="none" stroke="url(#trailGradient)" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" filter="url(#tightGlow)" />
                  <polyline points={trailPoints} fill="none" stroke="rgba(255,255,255,0.86)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}

              {path[0] && (
                <g filter="url(#tightGlow)">
                  <circle cx={path[0].x} cy={path[0].y} r="72" fill="rgba(52,211,153,0.14)" />
                  <circle cx={path[0].x} cy={path[0].y} r="52" fill="rgba(52,211,153,0.95)" stroke="rgba(255,255,255,0.95)" strokeWidth="6" />
                  <text x={path[0].x} y={path[0].y + 7} textAnchor="middle" fontSize="18" fontWeight="900" fill="rgb(2,6,23)">START</text>
                </g>
              )}

              {path[path.length - 1] && (
                <g filter="url(#tightGlow)">
                  <circle cx={path[path.length - 1].x} cy={path[path.length - 1].y} r="72" fill="rgba(251,191,36,0.14)" />
                  <circle cx={path[path.length - 1].x} cy={path[path.length - 1].y} r="52" fill="rgba(251,191,36,0.98)" stroke="rgba(255,255,255,0.95)" strokeWidth="6" />
                  <text x={path[path.length - 1].x} y={path[path.length - 1].y + 7} textAnchor="middle" fontSize="18" fontWeight="900" fill="rgb(2,6,23)">END</text>
                </g>
              )}

              {hazards.map((h, i) => (
                <g key={h.id} opacity={phase === "study" ? 1 : 0}>
                  <circle cx={h.x} cy={h.y} r={h.r + 18} fill="rgba(239,68,68,0.12)" filter="url(#tightGlow)" />
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.r}
                    fill="rgba(248,113,113,0.96)"
                    stroke="rgba(255,255,255,0.88)"
                    strokeWidth="3"
                    style={{
                      animation: phase === "study" ? `hazardPulse 0.65s ease-in-out ${i * 0.045}s infinite alternate` : "none",
                    }}
                  />
                  <circle cx={h.x - h.r * 0.28} cy={h.y - h.r * 0.32} r={Math.max(4, h.r * 0.18)} fill="rgba(255,255,255,0.55)" />
                </g>
              ))}
            </svg>

            {/* Overlay badges */}
            <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-zinc-200 shadow-xl backdrop-blur lg:left-5 lg:top-5 lg:px-5 lg:py-2 lg:text-sm">
              {phase === "study" ? "Memorize" : phase === "ready" ? "Ready" : phase === "tracing" ? "Tracing" : phase === "crashed" ? "Resetting" : phase}
            </div>

            <div className="absolute right-2 top-2 hidden rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-zinc-200 shadow-xl backdrop-blur md:block lg:right-5 lg:top-5 lg:px-5 lg:py-2 lg:text-sm">
              Lane Width: {Math.round(corridorWidth)}
            </div>

            {/* Study overlay */}
            {phase === "study" && (
              <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-2xl border border-red-300/30 bg-black/45 px-4 py-2 text-center shadow-2xl backdrop-blur-md lg:top-7 lg:rounded-3xl lg:px-7 lg:py-4">
                <p className="text-lg font-black text-red-300 lg:text-2xl">MEMORIZE MOVEMENT</p>
                <p className="mt-1 text-xs font-bold text-zinc-300 lg:text-sm">Hazards disappear, but keep moving.</p>
              </div>
            )}

            {/* Idle overlay */}
            {phase === "idle" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <div className="max-w-lg rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-center shadow-2xl backdrop-blur-md lg:rounded-[2rem] lg:p-8">
                  <p className="text-3xl font-black lg:text-5xl">Ready?</p>
                  <p className="mt-3 text-sm font-semibold text-zinc-300 lg:mt-4 lg:text-lg">
                    Memorize the hazards, wait for them to vanish, then trace the glowing corridor from green to gold.
                  </p>
                </div>
              </div>
            )}

            {/* Game over overlay */}
            {phase === "gameOver" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
                <div className="max-w-lg rounded-2xl border border-white/10 bg-zinc-950/90 p-6 text-center shadow-2xl backdrop-blur-xl lg:rounded-[2rem] lg:p-8">
                  <p className="text-3xl font-black text-fuchsia-300 lg:text-5xl">Game Over</p>
                  <p className="mt-3 text-base font-semibold text-zinc-300 lg:mt-4 lg:text-lg">
                    Final Score: <span className="text-white">{score}</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-500">
                    Levels Cleared: {cleared} · Crashes: {crashes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Feedback row */}
          <div className="mt-2 flex flex-col gap-2 lg:mt-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-3">
            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-zinc-300 lg:rounded-2xl lg:px-5 lg:py-4 lg:text-base">
              {message}
            </div>
            <div className="hidden rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm font-bold text-zinc-400 lg:block">
              <span className="text-fuchsia-300">Goal:</span> stay inside the energy lane → avoid hidden moving hazards → survive 3 minutes.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes hazardPulse {
          from {
            transform: scale(0.94);
            opacity: 0.74;
          }
          to {
            transform: scale(1.08);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function Pill({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "fuchsia" | "emerald" | "sky";
}) {
  const classes = {
    fuchsia: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200",
    emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    sky: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  };
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] lg:px-4 lg:text-xs ${classes[color]}`}>
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
    <div className={`rounded-xl border border-white/10 bg-white/[0.06] p-3 shadow-xl backdrop-blur-xl transition hover:bg-white/[0.08] lg:rounded-2xl lg:p-5 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-300 lg:text-xs">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-black lg:mt-1 lg:text-4xl">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-zinc-500 lg:mt-1 lg:text-xs">{detail}</p>
    </div>
  );
}