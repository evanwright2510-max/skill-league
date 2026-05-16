"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
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
  const router = useRouter();
  const supabase = createClient();
  const savedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [authLoading, setAuthLoading] = useState(true);

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
  const [showWords, setShowWords] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setAuthLoading(false);
    }

    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    if (authLoading) return;

    async function loadWords() {
      try {
        const res = await fetch("/words.txt");

        if (!res.ok) throw new Error("words.txt not found");

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
        setMessage("Dictionary failed to load. Make sure words.txt is in /public.");
      }
    }

    loadWords();
  }, [authLoading]);

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

    // Focus input on mobile after starting
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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

    // Keep focus on input for fast typing on mobile
    inputRef.current?.focus();
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Checking login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-emerald-950 px-3 py-4 text-white md:px-4 md:py-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300 md:text-sm">
              Monday Game
            </p>

            <h1 className="text-4xl font-black md:text-5xl">
              Word <span className="text-emerald-300">Rush</span>
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/60 md:mt-3 md:text-base">
              Make as many 4+ letter words as possible. The board changes every
              15 seconds.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/menu"
              className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:scale-105 hover:bg-white/15 md:px-6 md:py-4 md:text-base"
            >
              Menu
            </Link>

            <button
              onClick={startGame}
              disabled={!dictLoaded}
              className="flex-1 rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-zinc-950 transition hover:scale-105 hover:bg-emerald-200 disabled:scale-100 disabled:opacity-40 md:flex-none md:px-8 md:py-4 md:text-base"
            >
              {!dictLoaded ? "Loading..." : gameOver ? "Play Again" : "Start"}
            </button>
          </div>
        </div>

        {/* Main grid - stacks on mobile */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_320px]">

          {/* Game section */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur md:rounded-3xl md:p-6">

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-3 gap-2 text-center md:mb-6 md:gap-3">
              <div className="rounded-xl bg-black/30 p-3 md:rounded-2xl md:p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 md:text-xs">
                  Score
                </p>
                <p className="text-2xl font-black text-emerald-300 md:text-3xl">{score}</p>
              </div>

              <div className="rounded-xl bg-black/30 p-3 md:rounded-2xl md:p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 md:text-xs">
                  Time
                </p>
                <p
                  className={`text-2xl font-black md:text-3xl ${
                    timeLeft <= 10 ? "text-red-300" : "text-white"
                  }`}
                >
                  {timeLeft}
                </p>
              </div>

              <div className="rounded-xl bg-black/30 p-3 md:rounded-2xl md:p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 md:text-xs">
                  Board
                </p>
                <p
                  className={`text-2xl font-black md:text-3xl ${
                    boardTimeLeft <= 3 ? "text-yellow-300" : "text-white"
                  }`}
                >
                  {boardTimeLeft}
                </p>
              </div>
            </div>

            {/* Letter board */}
            <div className="mb-4 grid grid-cols-4 gap-2 md:mb-6 md:gap-3">
              {board.map((letter, i) => (
                <div
                  key={`${letter}-${i}`}
                  className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-2xl font-black shadow-lg md:h-20 md:rounded-2xl md:text-3xl"
                >
                  {letter}
                </div>
              ))}
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                disabled={!gameStarted || gameOver}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitWord();
                }}
                placeholder={gameStarted ? "Type a word..." : "Press start to play"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 rounded-xl border border-white/10 bg-white px-3 py-3 text-base font-bold text-black outline-none disabled:opacity-50 md:rounded-2xl md:px-4 md:py-4 md:text-lg"
              />

              <button
                onClick={submitWord}
                disabled={!gameStarted || gameOver}
                className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-40 md:rounded-2xl md:px-6 md:py-4"
              >
                Enter
              </button>
            </div>

            {/* Message */}
            <div className="mt-3 rounded-xl bg-black/30 p-3 text-center text-base font-bold md:mt-4 md:rounded-2xl md:p-4 md:text-lg">
              {message}
            </div>

            {/* Game over result */}
            {gameOver && (
              <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-center md:mt-6 md:rounded-3xl md:p-6">
                <h2 className="text-2xl font-black text-emerald-300 md:text-3xl">
                  Final Score: {score}
                </h2>

                <p className="mt-2 text-sm text-white/70 md:text-base">
                  You found {usedWords.length} words.
                </p>
              </div>
            )}
          </section>

          {/* Words sidebar - collapsible on mobile */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur md:rounded-3xl md:p-6">
            <div className="mb-3 flex items-center justify-between md:mb-4">
              <button
                onClick={() => setShowWords(!showWords)}
                className="flex items-center gap-2 md:cursor-default"
              >
                <h2 className="text-xl font-black md:text-2xl">Words</h2>
                <span className="text-xs text-white/30 md:hidden">
                  {showWords ? "▲" : "▼"}
                </span>
              </button>

              <span className="rounded-full bg-emerald-300/20 px-3 py-1 text-sm font-bold text-emerald-300">
                {usedWords.length}
              </span>
            </div>

            {/* Always visible on desktop, toggleable on mobile */}
            <div className={`overflow-y-auto pr-1 transition-all duration-300 ${showWords ? "max-h-[400px]" : "max-h-0 md:max-h-[520px]"} md:max-h-[520px]`}>
              <div className="space-y-2">
                {sortedWords.length === 0 ? (
                  <p className="text-sm text-white/50">No words yet.</p>
                ) : (
                  sortedWords.map((word) => (
                    <div
                      key={word}
                      className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 md:rounded-xl md:px-4 md:py-3"
                    >
                      <span className="text-sm font-bold uppercase tracking-wide md:text-base">
                        {word}
                      </span>

                      <span className="text-xs font-black text-emerald-300 md:text-sm">
                        +{scoreWord(word)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}