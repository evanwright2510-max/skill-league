"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const GRID_SIZE = 49;
const GRID_COLS = 7;
const TOTAL_ROUNDS = 5;

function generatePattern(round: number) {
  const count = Math.min(6 + round * 2, 18);
  const picks = new Set<number>();

  while (picks.size < count) {
    picks.add(Math.floor(Math.random() * GRID_SIZE));
  }

  return [...picks];
}

export default function MemoryGrid() {
  const savedRef = useRef(false);

  const [round, setRound] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [showing, setShowing] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  const [message, setMessage] = useState("Memorize the pattern.");

  const patternSet = useMemo(() => new Set(pattern), [pattern]);

  const roundCorrect = selected.filter((tile) => patternSet.has(tile)).length;
  const roundWrong = selected.filter((tile) => !patternSet.has(tile)).length;
  const score = correctTotal - wrongTotal;

  function startRound(nextRound: number) {
    const nextPattern = generatePattern(nextRound);

    setPattern(nextPattern);
    setSelected([]);
    setShowing(true);
    setMessage(`Round ${nextRound}: memorize the blue squares.`);

    setTimeout(() => {
      setShowing(false);
      setMessage("Recreate the pattern, then submit.");
    }, 1800);
  }

  function startGame() {
    savedRef.current = false;

    setRound(1);
    setCorrectTotal(0);
    setWrongTotal(0);
    setGameStarted(true);
    setGameOver(false);
    startRound(1);
  }

  function handleTileClick(index: number) {
    if (!gameStarted || gameOver || showing) return;

    if (selected.includes(index)) {
      setSelected((prev) => prev.filter((tile) => tile !== index));
      return;
    }

    setSelected((prev) => [...prev, index]);
  }

  function submitRound() {
    if (!gameStarted || gameOver || showing) return;

    const correct = selected.filter((tile) => patternSet.has(tile)).length;
    const wrong = selected.filter((tile) => !patternSet.has(tile)).length;

    const finalCorrect = correctTotal + correct;
    const finalWrong = wrongTotal + wrong;
    const finalScore = finalCorrect - finalWrong;

    setCorrectTotal(finalCorrect);
    setWrongTotal(finalWrong);

    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      setGameStarted(false);
      setMessage(`Game over. Final score: ${finalScore}`);
      return;
    }

    setMessage(`Round ${round}: ${correct} correct, ${wrong} wrong.`);

    const nextRound = round + 1;
    setRound(nextRound);

    setTimeout(() => {
      startRound(nextRound);
    }, 1000);
  }

  useEffect(() => {
    if (!gameOver) return;
    if (savedRef.current) return;

    savedRef.current = true;

    const totalGuesses = correctTotal + wrongTotal;
    const accuracy = totalGuesses > 0 ? correctTotal / totalGuesses : 0;

    saveScore({
      gameId: "memory-grid",
      score,
      durationSeconds: 0,
      accuracy,
      attemptNumber: 1,
    }).then((result) => {
      console.log("MEMORY GRID SAVE RESULT:", result);
    });
  }, [gameOver, score, correctTotal, wrongTotal]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-blue-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.35em] text-blue-300">
              Tuesday Game
            </p>
            <h1 className="text-5xl font-black tracking-tight">
              Memory <span className="text-blue-300">Grid</span>
            </h1>
            <p className="mt-3 max-w-xl text-zinc-300">
              Memorize the blue pattern. You get 5 rounds. Correct squares add
              points. Wrong squares deduct.
            </p>
          </div>

          <button
            onClick={startGame}
            className="rounded-2xl bg-blue-300 px-8 py-4 text-lg font-black text-zinc-950 shadow-lg shadow-blue-950/40 transition hover:scale-[1.02] hover:bg-blue-200"
          >
            {gameStarted ? "Restart" : gameOver ? "Play Again" : "Start Game"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 grid grid-cols-4 gap-3">
              <Stat label="Round" value={`${round}/${TOTAL_ROUNDS}`} color="text-blue-300" />
              <Stat label="Correct" value={correctTotal + roundCorrect} color="text-emerald-300" />
              <Stat label="Wrong" value={wrongTotal + roundWrong} color="text-red-300" />
              <Stat label="Score" value={score + roundCorrect - roundWrong} color="text-amber-300" />
            </div>

            <div
              className="mx-auto grid max-w-xl gap-2"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
            >
              {Array.from({ length: GRID_SIZE }).map((_, index) => {
                const isPattern = showing && pattern.includes(index);
                const isSelected = selected.includes(index);

                return (
                  <button
                    key={index}
                    onClick={() => handleTileClick(index)}
                    disabled={!gameStarted || gameOver || showing}
                    className={[
                      "aspect-square rounded-xl border shadow-lg shadow-black/20 transition",
                      isPattern || isSelected
                        ? "border-blue-200 bg-blue-400"
                        : "border-white/10 bg-zinc-900 hover:border-blue-300/70 hover:bg-zinc-800",
                    ].join(" ")}
                  />
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-zinc-300">
                {message}
              </p>

              <button
                onClick={submitRound}
                disabled={!gameStarted || gameOver || showing}
                className="rounded-2xl bg-blue-300 px-6 py-3 font-black text-zinc-950 transition hover:bg-blue-200 disabled:opacity-40"
              >
                Submit Pattern
              </button>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-black">Rules</h2>

            <div className="mt-5 space-y-3 text-sm text-zinc-300">
              <Rule title="7×7 Grid" color="text-blue-300" text="Watch the blue squares before they disappear." />
              <Rule title="Correct" color="text-emerald-300" text="Each correct square adds +1." />
              <Rule title="Wrong" color="text-red-300" text="Each wrong square deducts -1." />
              <Rule title="Total" color="text-amber-300" text="You get 5 rounds. Highest final score wins." />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className={`text-xs font-bold uppercase tracking-widest ${color}`}>
        {label}
      </p>
      <p className="mt-1 text-4xl font-black">{value}</p>
    </div>
  );
}

function Rule({
  title,
  text,
  color,
}: {
  title: string;
  text: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-950/70 p-4">
      <p className={`font-black ${color}`}>{title}</p>
      <p>{text}</p>
    </div>
  );
}