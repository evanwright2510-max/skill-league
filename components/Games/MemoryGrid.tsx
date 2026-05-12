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
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [round, setRound] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [showing, setShowing] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [correctTotal, setCorrectTotal] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  const [missedTotal, setMissedTotal] = useState(0);

  const [message, setMessage] = useState("Memorize the pattern.");
  const [phaseLabel, setPhaseLabel] = useState("-");

  const patternSet = useMemo(() => new Set(pattern), [pattern]);

  const score = correctTotal * 2 - wrongTotal - missedTotal;

  function clearTimers() {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
  }

  function startRound(nextRound: number) {
    clearTimers();

    const nextPattern = generatePattern(nextRound);
    const flashTime = Math.max(700, 1500 - nextRound * 120);
    const answerTime = Math.max(3500, 8000 - nextRound * 600);

    setPattern(nextPattern);
    setSelected([]);
    setSubmitted(false);
    setShowing(true);
    setPhaseLabel("MEMORIZE");
    setMessage(`Round ${nextRound}: memorize the blue squares quickly.`);

    flashTimerRef.current = setTimeout(() => {
      setShowing(false);
      setPhaseLabel("FAST");
      setMessage("Recreate the pattern before time runs out. Picks lock in.");

      answerTimerRef.current = setTimeout(() => {
        submitRound(true);
      }, answerTime);
    }, flashTime);
  }

  function startGame() {
    clearTimers();

    savedRef.current = false;

    setRound(1);
    setCorrectTotal(0);
    setWrongTotal(0);
    setMissedTotal(0);
    setGameStarted(true);
    setGameOver(false);
    setSubmitted(false);
    setPhaseLabel("MEMORIZE");

    startRound(1);
  }

  function handleTileClick(index: number) {
    if (!gameStarted || gameOver || showing || submitted) return;
    if (selected.includes(index)) return;
    if (selected.length >= pattern.length) return;

    setSelected((prev) => [...prev, index]);
  }

  function submitRound(autoSubmit = false) {
    if (!gameStarted || gameOver || showing || submitted) return;

    clearTimers();

    if (!autoSubmit && selected.length !== pattern.length) {
      setMessage(`Pick exactly ${pattern.length} squares before submitting.`);
      return;
    }

    setSubmitted(true);

    const correct = selected.filter((tile) => patternSet.has(tile)).length;
    const wrong = selected.filter((tile) => !patternSet.has(tile)).length;
    const missed = pattern.length - correct;

    const finalCorrect = correctTotal + correct;
    const finalWrong = wrongTotal + wrong;
    const finalMissed = missedTotal + missed;
    const finalScore = finalCorrect * 2 - finalWrong - finalMissed;

    setCorrectTotal(finalCorrect);
    setWrongTotal(finalWrong);
    setMissedTotal(finalMissed);

    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      setGameStarted(false);
      setPhaseLabel("-");
      setMessage(
        `Game over. Final score: ${finalScore} | Correct: ${finalCorrect} | Wrong: ${finalWrong} | Missed: ${finalMissed}`
      );
      return;
    }

    setMessage(
      autoSubmit
        ? `Time ran out. Round ${round} submitted. Next round loading...`
        : `Round ${round} submitted. Next round loading...`
    );

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

    const totalGuesses = correctTotal + wrongTotal + missedTotal;
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
  }, [gameOver, score, correctTotal, wrongTotal, missedTotal]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

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
              Memorize the pattern. You must pick the exact number of squares.
              No changing answers after clicking.
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
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Round" value={`${round}/${TOTAL_ROUNDS}`} color="text-blue-300" />
              <Stat label="Needed" value={pattern.length} color="text-emerald-300" />
              <Stat label="Picked" value={selected.length} color="text-amber-300" />
              <Stat label="Score" value={gameOver ? score : "???"} color="text-zinc-300" />
              <Stat label="Pressure" value={phaseLabel} color="text-red-300" />
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
                    disabled={!gameStarted || gameOver || showing || submitted}
                    className={[
                      "aspect-square rounded-xl border shadow-lg shadow-black/20 transition",
                      isPattern || isSelected
                        ? "border-blue-200 bg-blue-400"
                        : "border-white/10 bg-zinc-900 hover:border-blue-300/70 hover:bg-zinc-800",
                      submitted ? "cursor-not-allowed opacity-80" : "",
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
                onClick={() => submitRound(false)}
                disabled={!gameStarted || gameOver || showing || submitted}
                className="rounded-2xl bg-blue-300 px-6 py-3 font-black text-zinc-950 transition hover:bg-blue-200 disabled:opacity-40"
              >
                Submit Pattern
              </button>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-black">Rules</h2>

            <div className="mt-5 space-y-3 text-sm text-zinc-300">
              <Rule
                title="7×7 Grid"
                color="text-blue-300"
                text="Watch the blue squares before they disappear."
              />
              <Rule
                title="Timed Answer"
                color="text-red-300"
                text="After the flash, you only have a few seconds to answer."
              />
              <Rule
                title="Locked Picks"
                color="text-emerald-300"
                text="Once you click a square, it stays selected."
              />
              <Rule
                title="Exact Amount"
                color="text-amber-300"
                text="You must pick the same number of squares shown."
              />
              <Rule
                title="Hidden Score"
                color="text-zinc-300"
                text="Your score is hidden until the game ends."
              />
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

      <p className="mt-1 text-3xl font-black">{value}</p>
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