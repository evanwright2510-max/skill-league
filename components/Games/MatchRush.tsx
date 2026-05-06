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
    <div className="min-h-screen overflow-hidden bg-black px-5 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(251,191,36,0.26),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(236,72,153,0.24),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.18),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />

      <div className="relative mx-auto max-w-[1500px]">
        <div className="mb-5 rounded-[2rem] border border-white/10 bg-white/[0.065] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-amber-200">
                  Thursday Game
                </span>
                <span className="rounded-full border border-pink-300/30 bg-pink-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-pink-200">
                  Visual Speed
                </span>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
                  Match Rush
                </span>
              </div>

              <h1 className="text-5xl font-black tracking-tight md:text-7xl">
                Match <span className="text-amber-300">Rush</span>
              </h1>

              <p className="mt-3 max-w-4xl text-lg font-medium text-zinc-300">
                Two cartoon cards. Exactly one symbol matches. Find it fast,
                build your combo, and avoid wrong clicks.
              </p>
            </div>

            <button
              onClick={startGame}
              className="rounded-2xl bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 px-9 py-4 text-xl font-black text-zinc-950 shadow-xl shadow-amber-950/40 transition hover:scale-[1.03]"
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
          <Stat label="Rounds" value={rounds} detail="Correct matches" />
          <Stat label="Combo" value={combo} detail="Streak bonus" />
          <Stat
            label="Level"
            value={level}
            detail={`${symbolsPerCard} icons/card`}
          />
        </div>

        <div
          className={[
            "rounded-[2rem] border bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl transition",
            flash === "correct"
              ? "border-emerald-300/60"
              : flash === "wrong"
                ? "border-red-300/60"
                : "border-white/10",
          ].join(" ")}
        >
          <div className="mb-4 h-3 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-pink-300 to-amber-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="relative min-h-[680px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl">
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
                text={`Final Score: ${score} • Correct Rounds: ${rounds} • Wrong Clicks: ${wrongClicks} • Best Combo: ${bestCombo}`}
                highlight
              />
            )}

            <div className="relative grid min-h-[610px] gap-8 lg:grid-cols-[1fr_220px_1fr] lg:items-center">
              <SpotCard
                title="Card A"
                items={round.left}
                positions={leftPositions}
                disabled={phase !== "playing"}
                onPick={handlePick}
                side="left"
              />

              <div className="flex flex-col items-center justify-center gap-4">
                <div className="rounded-full border border-white/10 bg-black/55 px-6 py-4 text-center shadow-xl backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">
                    Find
                  </p>
                  <p className="mt-1 text-4xl font-black text-white">
                    1 Match
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center shadow-xl backdrop-blur">
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">
                    Combo
                  </p>
                  <p className="text-5xl font-black">{combo}x</p>
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

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_390px]">
            <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-base font-semibold text-zinc-300">
              {feedback}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm font-bold text-zinc-400">
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
    <div className="flex flex-col items-center">
      <p className="mb-4 rounded-full border border-white/10 bg-black/40 px-5 py-2 text-sm font-black uppercase tracking-[0.3em] text-zinc-300">
        {title}
      </p>

      <div
        className={[
          "relative aspect-square w-full max-w-[560px] rounded-full border border-white/15 shadow-2xl",
          "bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.95),rgba(254,243,199,0.92)_35%,rgba(251,207,232,0.9)_72%,rgba(165,243,252,0.88))]",
          side === "left" ? "rotate-[-2deg]" : "rotate-[2deg]",
        ].join(" ")}
      >
        <div className="absolute inset-5 rounded-full border-8 border-dashed border-zinc-900/10" />
        <div className="absolute inset-10 rounded-full border border-zinc-900/10" />

        {items.map((item, index) => {
          const p = positions[index];

          return (
            <button
              key={`${item.id}-${index}`}
              disabled={disabled}
              onClick={() => onPick(item)}
              className={[
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/70",
                "bg-white/75 px-3 py-2 shadow-xl backdrop-blur-sm transition",
                disabled
                  ? "cursor-default"
                  : "hover:scale-125 hover:bg-white active:scale-95",
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
                style={{ fontSize: p.size }}
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
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
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
            highlight ? "text-amber-300" : "text-white",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="mt-4 text-lg font-semibold text-zinc-300">{text}</p>
      </div>
    </div>
  );
}