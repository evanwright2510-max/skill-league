"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveScore } from "@/lib/saveScore";

const GAME_TIME = 60;
const BOARD_SWAP_TIME = 15;
const BOARD_SIZE = 16;

const LETTER_POOL =
  "EEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

function generateBoard() {
  return Array.from(
    { length: BOARD_SIZE },
    () => LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]
  );
}

function scoreWord(word: string) {
  if (word.length === 4) return 10;
  if (word.length === 5) return 20;
  if (word.length === 6) return 35;
  if (word.length >= 7) return 55 + (word.length - 7) * 10;
  return 0;
}

function canMakeWord(word: string, board: string[]) {
  const counts: Record<string, number> = {};

  for (const letter of board) {
    const l = letter.toLowerCase();
    counts[l] = (counts[l] || 0) + 1;
  }

  for (const char of word) {
    if (!counts[char]) return false;
    counts[char]--;
  }

  return true;
}

export default function WordRush() {
  const savedRef = useRef(false);

  const [wordSet, setWordSet] = useState<Set<string>>(new Set());
  const [dictLoaded, setDictLoaded] = useState(false);

  const [board, setBoard] = useState<string[]>(generateBoard());
  const [input, setInput] = useState("");
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [boardTimeLeft, setBoardTimeLeft] = useState(BOARD_SWAP_TIME);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Loading dictionary...");

  useEffect(() => {
    async function loadWords() {
      try {
        const res = await fetch("/words.txt");

        if (!res.ok) {
          throw new Error("words.txt not found");
        }

        const text = await res.text();

        const words = text
          .split(/\r?\n/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length >= 4 && w.length <= 12)
          .filter((w) => /^[a-z]+$/.test(w));

        setWordSet(new Set(words));
        setDictLoaded(true);
        setMessage("Find 4+ letter words.");
      } catch {
        setMessage(
          "Dictionary failed to load. Make sure words.txt is in /public."
        );
      }
    }

    loadWords();
  }, []);

  const sortedWords = useMemo(() => {
    return [...usedWords].sort(
      (a, b) => b.length - a.length || a.localeCompare(b)
    );
  }, [usedWords]);

  function startGame() {
    if (!dictLoaded) return;

    savedRef.current = false;

    setBoard(generateBoard());
    setUsedWords([]);
    setScore(0);
    setInput("");
    setTimeLeft(GAME_TIME);
    setBoardTimeLeft(BOARD_SWAP_TIME);
    setGameStarted(true);
    setGameOver(false);
    setMessage("Go.");
  }

  function submitWord() {
    if (!gameStarted || gameOver) return;

    const word = input.trim().toLowerCase();

    if (word.length < 4) {
      setMessage("Too short.");
      return;
    }

    if (usedWords.includes(word)) {
      setMessage("Already used.");
      setInput("");
      return;
    }

    if (!canMakeWord(word, board)) {
      setMessage("Not on board.");
      return;
    }

    if (!wordSet.has(word)) {
      setMessage("Invalid word.");
      return;
    }

    const points = scoreWord(word);

    setUsedWords((prev) => [word, ...prev]);
    setScore((prev) => prev + points);
    setInput("");
    setMessage(`+${points}`);
  }

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true);
          setGameStarted(false);
          setMessage("Game over.");
          return 0;
        }

        return prev - 1;
      });

      setBoardTimeLeft((prev) => {
        if (prev <= 1) {
          setBoard(generateBoard());
          setInput("");
          setMessage("New board.");
          return BOARD_SWAP_TIME;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    if (savedRef.current) return;

    savedRef.current = true;

    const accuracy =
      usedWords.length > 0
        ? usedWords.filter((w) => w.length >= 5).length / usedWords.length
        : 0;

    saveScore({
      gameId: "word-rush",
      score,
      durationSeconds: GAME_TIME,
      accuracy,
      attemptNumber: 1,
    }).then((result) => {
      console.log("WORD RUSH SAVE RESULT:", result);
    });
  }, [gameOver, score, usedWords]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-emerald-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">
              Monday Game
            </p>
            <h1 className="text-5xl font-black">
              Word <span className="text-emerald-300">Rush</span>
            </h1>
            <p className="mt-3 max-w-xl text-white/60">
              Make as many 4+ letter words as possible. The board changes every
              15 seconds.
            </p>
          </div>

          <button
            onClick={startGame}
            disabled={!dictLoaded}
            className="rounded-2xl bg-emerald-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-emerald-200 disabled:scale-100 disabled:opacity-40"
          >
            {!dictLoaded ? "Loading..." : gameOver ? "Play Again" : "Start"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Score
                </p>
                <p className="text-3xl font-black text-emerald-300">{score}</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Time
                </p>
                <p
                  className={`text-3xl font-black ${
                    timeLeft <= 10 ? "text-red-300" : "text-white"
                  }`}
                >
                  {timeLeft}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Board
                </p>
                <p
                  className={`text-3xl font-black ${
                    boardTimeLeft <= 3 ? "text-yellow-300" : "text-white"
                  }`}
                >
                  {boardTimeLeft}
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-3">
              {board.map((letter, i) => (
                <div
                  key={`${letter}-${i}`}
                  className="flex h-20 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 text-3xl font-black shadow-lg"
                >
                  {letter}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                disabled={!gameStarted || gameOver}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitWord();
                }}
                placeholder={gameStarted ? "Type a word..." : "Press start to play"}
                className="flex-1 rounded-2xl border border-white/10 bg-white px-4 py-4 text-lg font-bold text-black outline-none disabled:opacity-50"
              />

              <button
                onClick={submitWord}
                disabled={!gameStarted || gameOver}
                className="rounded-2xl bg-emerald-400 px-6 py-4 font-black text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-40"
              >
                Enter
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-black/30 p-4 text-center text-lg font-bold">
              {message}
            </div>

            {gameOver && (
              <div className="mt-6 rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6 text-center">
                <h2 className="text-3xl font-black text-emerald-300">
                  Final Score: {score}
                </h2>
                <p className="mt-2 text-white/70">
                  You found {usedWords.length} words.
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">Words</h2>
              <span className="rounded-full bg-emerald-300/20 px-3 py-1 text-sm font-bold text-emerald-300">
                {usedWords.length}
              </span>
            </div>

            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
              {sortedWords.length === 0 ? (
                <p className="text-white/50">No words yet.</p>
              ) : (
                sortedWords.map((word) => (
                  <div
                    key={word}
                    className="flex items-center justify-between rounded-xl bg-black/25 px-4 py-3"
                  >
                    <span className="font-bold uppercase tracking-wide">
                      {word}
                    </span>
                    <span className="text-sm font-black text-emerald-300">
                      +{scoreWord(word)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}