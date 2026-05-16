"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const GAME_TIME = 60;

type Phase = "idle" | "playing" | "gameOver";

type SymbolItem = {
  id: string;
  icon: string;
  label: string;
};

type Round = {
  left: SymbolItem[];
  right: SymbolItem[];
  match: SymbolItem;
};

const SYMBOLS: SymbolItem[] = [
  { id: "rocket", icon: "🚀", label: "Rocket" },
  { id: "pizza", icon: "🍕", label: "Pizza" },
  { id: "dog", icon: "🐶", label: "Dog" },
  { id: "cat", icon: "🐱", label: "Cat" },
  { id: "star", icon: "⭐", label: "Star" },
  { id: "heart", icon: "💖", label: "Heart" },
  { id: "sun", icon: "☀️", label: "Sun" },
  { id: "moon", icon: "🌙", label: "Moon" },
  { id: "ghost", icon: "👻", label: "Ghost" },
  { id: "robot", icon: "🤖", label: "Robot" },
  { id: "frog", icon: "🐸", label: "Frog" },
  { id: "fire", icon: "🔥", label: "Fire" },
  { id: "snow", icon: "❄️", label: "Snow" },
  { id: "apple", icon: "🍎", label: "Apple" },
  { id: "banana", icon: "🍌", label: "Banana" },
  { id: "cookie", icon: "🍪", label: "Cookie" },
  { id: "burger", icon: "🍔", label: "Burger" },
  { id: "soccer", icon: "⚽", label: "Soccer" },
  { id: "basketball", icon: "🏀", label: "Basketball" },
  { id: "baseball", icon: "⚾", label: "Baseball" },
  { id: "car", icon: "🚗", label: "Car" },
  { id: "plane", icon: "✈️", label: "Plane" },
  { id: "train", icon: "🚂", label: "Train" },
  { id: "crown", icon: "👑", label: "Crown" },
  { id: "diamond", icon: "💎", label: "Diamond" },
  { id: "key", icon: "🔑", label: "Key" },
  { id: "balloon", icon: "🎈", label: "Balloon" },
  { id: "music", icon: "🎵", label: "Music" },
  { id: "paint", icon: "🎨", label: "Paint" },
  { id: "lightning", icon: "⚡", label: "Lightning" },
  { id: "leaf", icon: "🍃", label: "Leaf" },
  { id: "flower", icon: "🌸", label: "Flower" },
  { id: "taco", icon: "🌮", label: "Taco" },
  { id: "alien", icon: "👽", label: "Alien" },
  { id: "octopus", icon: "🐙", label: "Octopus" },
  { id: "turtle", icon: "🐢", label: "Turtle" },
  { id: "whale", icon: "🐳", label: "Whale" },
  { id: "bee", icon: "🐝", label: "Bee" },
  { id: "cherry", icon: "🍒", label: "Cherry" },
  { id: "watermelon", icon: "🍉", label: "Watermelon" },
];

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function makeRound(level: number): Round {
  const symbolsPerCard = Math.min(5 + Math.floor(level / 3), 9);
  const match = pickRandom(SYMBOLS);

  const pool = shuffle(SYMBOLS.filter((s) => s.id !== match.id));
  const leftUnique = pool.slice(0, symbolsPerCard - 1);
  const rightUnique = pool.slice(symbolsPerCard - 1, symbolsPerCard * 2 - 2);

  return {
    left: shuffle([match, ...leftUnique]),
    right: shuffle([match, ...rightUnique]),
    match,
  };
}

function getPositions(count: number, side: "left" | "right") {
  const base = [
    { x: 50, y: 50, size: 72, rotate: -8 },
    { x: 28, y: 28, size: 58, rotate: 12 },
    { x: 72, y: 30, size: 56, rotate: -14 },
    { x: 30, y: 72, size: 56, rotate: -6 },
    { x: 72, y: 72, size: 58, rotate: 10 },
    { x: 50, y: 22, size: 50, rotate: 5 },
    { x: 22, y: 50, size: 50, rotate: -12 },
    { x: 78, y: 50, size: 50, rotate: 15 },
    { x: 50, y: 80, size: 50, rotate: -4 },
  ];

  const offset = side === "left" ? -1 : 1;

  return base.slice(0, count).map((p, i) => ({
    ...p,
    x: p.x + offset * ((i % 2) * 2),
    y: p.y + ((i % 3) - 1) * 1.5,
  }));
}

export default function MatchRush() {
  const savedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [wrongClicks, setWrongClicks] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [feedback, setFeedback] = useState(
    "Find the one matching cartoon symbol."
  );
  const [round, setRound] = useState<Round>(() => makeRound(1));
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);

  const progressPercent = Math.round((timeLeft / GAME_TIME) * 100);
  const symbolsPerCard = round.left.length;

  const leftPositions = useMemo(
    () => getPositions(round.left.length, "left"),
    [round.left.length]
  );

  const rightPositions = useMemo(
    () => getPositions(round.right.length, "right"),
    [round.right.length]
  );

  function startGame() {
    savedRef.current = false;

    setPhase("playing");
    setTimeLeft(GAME_TIME);
    setScore(0);
    setRounds(0);
    setWrongClicks(0);
    setCombo(0);
    setBestCombo(0);
    setLevel(1);
    setRound(makeRound(1));
    setFeedback("Find the matching symbol.");
    setFlash(null);
  }

  function nextRound(nextLevel: number) {
    setRound(makeRound(nextLevel));
  }

  function handlePick(symbol: SymbolItem) {
    if (phase !== "playing") return;

    if (symbol.id === round.match.id) {
      const nextCombo = combo + 1;
      const bonus = Math.min(60, nextCombo * 5);
      const gained = 100 + bonus + level * 4;

      setScore((s) => s + gained);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setRounds((r) => r + 1);
      setFlash("correct");
      setFeedback(`Correct: ${symbol.label}! +${gained}`);

      const nextLevel = level + (rounds > 0 && rounds % 4 === 0 ? 1 : 0);
      setLevel(nextLevel);
      nextRound(nextLevel);

      setTimeout(() => setFlash(null), 180);
    } else {
      const penalty = Math.min(75, 25 + level * 3);

      setScore((s) => Math.max(0, s - penalty));
      setWrongClicks((w) => w + 1);
      setCombo(0);
      setFlash("wrong");
      setFeedback(`Wrong pick. -${penalty}`);

      setTimeout(() => setFlash(null), 220);
    }
  }

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("gameOver");
          setFeedback("Game over.");
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

    const totalClicks = rounds + wrongClicks;
    const accuracy = totalClicks > 0 ? rounds / totalClicks : 0;

    saveScore({
      gameId: "match-rush",
      score,
      durationSeconds: GAME_TIME,
      accuracy,
      attemptNumber: 1,
    }).then((result) => {
      console.log("MATCH RUSH SAVE RESULT:", result);
    });
  }, [phase, score, rounds, wrongClicks]);

  return (
    <div className="min-h-screen overflow-hidden bg-black px-3 py-4 text-white md:px-5 md:py-6">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(251,191,36,0.26),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(236,72,153,0.24),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.18),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />

      <div className="relative mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.065] p-4 shadow-2xl backdrop-blur-xl md:mb-5 md:rounded-[2rem] md:p-5">
          <div className="flex flex-col justify-between gap-4 md:gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3 md:gap-3">
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-200 md:px-4 md:text-xs">
                  Thursday Game
                </span>
                <span className="rounded-full border border-pink-300/30 bg-pink-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-pink-200 md:px-4 md:text-xs">
                  Visual Speed
                </span>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200 md:px-4 md:text-xs">
                  Match Rush
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl">
                Match <span className="text-amber-300">Rush</span>
              </h1>

              <p className="mt-2 max-w-4xl text-sm font-medium text-zinc-300 md:mt-3 md:text-lg">
                Two cartoon cards. Exactly one symbol matches. Find it fast,
                build your combo, and avoid wrong clicks.
              </p>
            </div>

            <button
              onClick={startGame}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 px-6 py-3 text-lg font-black text-zinc-950 shadow-xl shadow-amber-950/40 transition hover:scale-[1.03] md:w-auto md:px-9 md:py-4 md:text-xl"
            >
              {phase === "idle"
                ? "Start Game"
                : phase === "gameOver"
                  ? "Play Again"
                  : "Restart"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 gap-2 md:mb-5 md:grid-cols-5 md:gap-3">
          <Stat label="Score" value={score} detail="Live total" />
          <Stat label="Time" value={timeLeft} detail="Seconds left" />
          <Stat label="Rounds" value={rounds} detail="Correct" />
          <Stat label="Combo" value={combo} detail="Streak" className="hidden md:block" />
          <Stat
            label="Level"
            value={level}
            detail={`${symbolsPerCard} icons`}
            className="hidden md:block"
          />
        </div>

        {/* Mobile-only compact stats */}
        <div className="mb-4 flex items-center justify-center gap-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-amber-300">Combo</span>
            <span className="text-2xl font-black">{combo}x</span>
          </div>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-amber-300">Level</span>
            <span className="text-2xl font-black">{level}</span>
          </div>
        </div>

        {/* Game area */}
        <div
          className={[
            "rounded-2xl border bg-white/[0.055] p-3 shadow-2xl backdrop-blur-xl transition md:rounded-[2rem] md:p-4",
            flash === "correct"
              ? "border-emerald-300/60"
              : flash === "wrong"
                ? "border-red-300/60"
                : "border-white/10",
          ].join(" ")}
        >
          {/* Progress bar */}
          <div className="mb-3 h-2 overflow-hidden rounded-full border border-white/10 bg-zinc-950 md:mb-4 md:h-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-pink-300 to-amber-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl md:min-h-[680px] md:rounded-[1.75rem] md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.08),transparent_55%)]" />

            {phase === "idle" && (
              <CenterOverlay
                title="Ready?"
                text="Click start. Find the one matching symbol between both cards."
              />
            )}

            {phase === "gameOver" && (
              <CenterOverlay
                title="Game Over"
                text={`Score: ${score} • Rounds: ${rounds} • Wrong: ${wrongClicks} • Best Combo: ${bestCombo}`}
                highlight
              />
            )}

            {/* Cards layout - stacks vertically on mobile */}
            <div className="relative flex min-h-[360px] flex-col items-center gap-4 md:min-h-[610px] md:gap-8 lg:grid lg:grid-cols-[1fr_220px_1fr] lg:items-center">
              <SpotCard
                title="Card A"
                items={round.left}
                positions={leftPositions}
                disabled={phase !== "playing"}
                onPick={handlePick}
                side="left"
              />

              {/* Center info - horizontal on mobile, vertical on desktop */}
              <div className="flex items-center gap-3 md:flex-col md:gap-4">
                <div className="rounded-full border border-white/10 bg-black/55 px-4 py-2 text-center shadow-xl backdrop-blur md:px-6 md:py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 md:text-xs">
                    Find
                  </p>
                  <p className="text-2xl font-black text-white md:mt-1 md:text-4xl">
                    1 Match
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center shadow-xl backdrop-blur md:rounded-3xl md:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 md:text-sm">
                    Combo
                  </p>
                  <p className="text-3xl font-black md:text-5xl">{combo}x</p>
                </div>
              </div>

              <SpotCard
                title="Card B"
                items={round.right}
                positions={rightPositions}
                disabled={phase !== "playing"}
                onPick={handlePick}
                side="right"
              />
            </div>
          </div>

          {/* Feedback row */}
          <div className="mt-3 flex flex-col gap-2 md:mt-4 md:grid md:grid-cols-[1fr_390px] md:gap-3">
            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-zinc-300 md:rounded-2xl md:px-5 md:py-4 md:text-base">
              {feedback}
            </div>

            <div className="hidden rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm font-bold text-zinc-400 md:block">
              <span className="text-amber-300">Scoring:</span> correct = points
              + combo bonus. Wrong clicks reset combo and lose points.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpotCard({
  title,
  items,
  positions,
  disabled,
  onPick,
  side,
}: {
  title: string;
  items: SymbolItem[];
  positions: ReturnType<typeof getPositions>;
  disabled: boolean;
  onPick: (symbol: SymbolItem) => void;
  side: "left" | "right";
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <p className="mb-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-zinc-300 md:mb-4 md:px-5 md:py-2 md:text-sm">
        {title}
      </p>

      <div
        className={[
          "relative aspect-square w-full max-w-[260px] rounded-full border border-white/15 shadow-2xl md:max-w-[560px]",
          "bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.95),rgba(254,243,199,0.92)_35%,rgba(251,207,232,0.9)_72%,rgba(165,243,252,0.88))]",
          side === "left" ? "rotate-[-2deg]" : "rotate-[2deg]",
        ].join(" ")}
      >
        <div className="absolute inset-3 rounded-full border-[6px] border-dashed border-zinc-900/10 md:inset-5 md:border-8" />
        <div className="absolute inset-6 rounded-full border border-zinc-900/10 md:inset-10" />

        {items.map((item, index) => {
          const p = positions[index];
          // Scale down icon sizes on mobile
          const mobileSize = Math.round(p.size * 0.55);

          return (
            <button
              key={`${item.id}-${index}`}
              disabled={disabled}
              onClick={() => onPick(item)}
              className={[
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/70 md:rounded-3xl",
                "bg-white/75 px-2 py-1 shadow-xl backdrop-blur-sm transition md:px-3 md:py-2",
                disabled
                  ? "cursor-default"
                  : "hover:scale-125 hover:bg-white active:scale-110",
              ].join(" ")}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${p.rotate}deg)`,
              }}
              aria-label={item.label}
              title={item.label}
            >
              <span
                className="block leading-none drop-shadow-sm"
                style={{ fontSize: `clamp(${mobileSize}px, 5vw, ${p.size}px)` }}
              >
                {item.icon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 md:text-xs">
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
            highlight ? "text-amber-300" : "text-white",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="mt-3 text-sm font-semibold text-zinc-300 md:mt-4 md:text-lg">{text}</p>
      </div>
    </div>
  );
}