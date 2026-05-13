"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
// import { saveScore } from "@/lib/saveScore";

const TEST_MODE = true;

type Phase = "idle" | "intro" | "playing" | "result" | "bank" | "gameover";

type VaultType =
  | "BREACH_PULSE"
  | "REACTOR_OVERRIDE"
  | "SIGNAL_HUNT"
  | "LOCK_SYNC"
  | "DRONE_PANIC"
  | "BLACKOUT_NODE";

type Vault = {
  level: number;
  type: VaultType;
  name: string;
  timer: number;
  value: number;
  threat: "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | "NIGHTMARE";
};

type ResultKind = "success" | "fail";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function vaultTypeForLevel(level: number): VaultType {
  const cycle: VaultType[] = [
    "BREACH_PULSE",
    "REACTOR_OVERRIDE",
    "SIGNAL_HUNT",
    "LOCK_SYNC",
    "DRONE_PANIC",
    "BLACKOUT_NODE",
  ];

  return cycle[(level - 1) % cycle.length];
}

function getVaultName(type: VaultType) {
  if (type === "BREACH_PULSE") return "Breach Pulse";
  if (type === "REACTOR_OVERRIDE") return "Reactor Override";
  if (type === "SIGNAL_HUNT") return "Signal Hunt";
  if (type === "LOCK_SYNC") return "Lock Sync";
  if (type === "DRONE_PANIC") return "Drone Panic";
  return "Blackout Node";
}

function getThreat(level: number): Vault["threat"] {
  if (level <= 2) return "LOW";
  if (level <= 4) return "MEDIUM";
  if (level <= 6) return "HIGH";
  if (level <= 9) return "EXTREME";
  return "NIGHTMARE";
}

function makeVault(level: number): Vault {
  const type = vaultTypeForLevel(level);

  return {
    level,
    type,
    name: getVaultName(type),
    timer: Math.max(8, 24 - Math.floor(level * 1.2)),
    value: 800 + level * 500,
    threat: getThreat(level),
  };
}

export default function SaturdayGame() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const motionRef = useRef<NodeJS.Timeout | null>(null);
  const introRef = useRef<NodeJS.Timeout | null>(null);

  const pulseDirRef = useRef(1);
  const ringsRef = useRef<number[]>([]);
  const lockedRingsRef = useRef<boolean[]>([]);
  const endedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [vault, setVault] = useState<Vault>(() => makeVault(1));
  const [timeLeft, setTimeLeft] = useState(0);

  const [bankedScore, setBankedScore] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [shields, setShields] = useState(3);
  const [streak, setStreak] = useState(0);
  const [highestLevel, setHighestLevel] = useState(1);

  const [message, setMessage] = useState(
    "Clear vaults, build multiplier, and bank before greed burns you."
  );

  const [lastResult, setLastResult] = useState<ResultKind>("success");
  const [lastPoints, setLastPoints] = useState(0);
  const [lastPenalty, setLastPenalty] = useState(0);

  const [pulsePos, setPulsePos] = useState(10);
  const [pulseHits, setPulseHits] = useState(0);

  const [reactors, setReactors] = useState<number[]>([]);

  const [signalTarget, setSignalTarget] = useState(0);
  const [signalTiles, setSignalTiles] = useState<number[]>([]);

  const [rings, setRings] = useState<number[]>([]);
  const [lockedRings, setLockedRings] = useState<boolean[]>([]);

  const [drones, setDrones] = useState<number[]>([]);
  const [badDrones, setBadDrones] = useState<number[]>([]);

  const [nodeTarget, setNodeTarget] = useState(0);
  const [wrongNodeClicks, setWrongNodeClicks] = useState<number[]>([]);

  const totalScore = bankedScore + runScore;

  const nextThreat = useMemo(() => getThreat(vault.level + 1), [vault.level]);

  function clearAllTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (motionRef.current) clearInterval(motionRef.current);
    if (introRef.current) clearTimeout(introRef.current);

    timerRef.current = null;
    motionRef.current = null;
    introRef.current = null;
  }

  function startMainTimer(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    setTimeLeft(seconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          failVault("Time expired.");
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  function startGame() {
    clearAllTimers();
    endedRef.current = false;

    setBankedScore(0);
    setRunScore(0);
    setMultiplier(1);
    setShields(3);
    setStreak(0);
    setHighestLevel(1);
    setLastPoints(0);
    setLastPenalty(0);

    beginVault(makeVault(1));
  }

  function beginVault(nextVault: Vault) {
    clearAllTimers();
    endedRef.current = false;

    setVault(nextVault);
    setHighestLevel((prev) => Math.max(prev, nextVault.level));
    setPhase("intro");
    setMessage(`Level ${nextVault.level}: ${nextVault.name}`);

    introRef.current = setTimeout(() => {
      prepareVault(nextVault);
    }, 750);
  }

  function prepareVault(nextVault: Vault) {
    clearAllTimers();
    endedRef.current = false;

    setPhase("playing");
    setMessage(`${nextVault.name} active. Threat: ${nextVault.threat}.`);

    if (nextVault.type === "BREACH_PULSE") {
      pulseDirRef.current = 1;
      setPulsePos(8);
      setPulseHits(0);

      motionRef.current = setInterval(() => {
        setPulsePos((prev) => {
          let next = prev + pulseDirRef.current * (3.5 + nextVault.level * 0.35);

          if (next >= 94) {
            pulseDirRef.current = -1;
            next = 94;
          }

          if (next <= 0) {
            pulseDirRef.current = 1;
            next = 0;
          }

          return next;
        });
      }, 50);
    }

    if (nextVault.type === "REACTOR_OVERRIDE") {
      const count = Math.min(4 + Math.floor(nextVault.level / 2), 7);
      setReactors(Array.from({ length: count }, () => rand(18, 90)));

      motionRef.current = setInterval(() => {
        setReactors((prev) =>
          prev.map((value) => clamp(value + rand(-2, 4), 0, 100))
        );
      }, Math.max(500, 950 - nextVault.level * 45));
    }

    if (nextVault.type === "SIGNAL_HUNT") {
      const count = Math.min(12 + nextVault.level * 2, 30);
      const target = rand(0, count - 1);

      setSignalTarget(target);
      setSignalTiles(Array.from({ length: count }, (_, i) => i));
    }

    if (nextVault.type === "LOCK_SYNC") {
      const count = Math.min(3 + Math.floor(nextVault.level / 3), 5);
      const nextRings = Array.from({ length: count }, () => rand(0, 360));
      const nextLocked = Array.from({ length: count }, () => false);

      ringsRef.current = nextRings;
      lockedRingsRef.current = nextLocked;

      setRings(nextRings);
      setLockedRings(nextLocked);

      motionRef.current = setInterval(() => {
        ringsRef.current = ringsRef.current.map((deg, index) => {
          if (lockedRingsRef.current[index]) return deg;

          return (deg + 7 + nextVault.level * 1.4 + index * 2.2) % 360;
        });

        setRings([...ringsRef.current]);
      }, 55);
    }

    if (nextVault.type === "DRONE_PANIC") {
      const count = Math.min(7 + nextVault.level, 18);
      const all = Array.from({ length: count }, (_, i) => i);
      const badCount = Math.min(2 + Math.floor(nextVault.level / 3), 6);
      const bad = [...all].sort(() => Math.random() - 0.5).slice(0, badCount);

      setDrones(all);
      setBadDrones(bad);
    }

    if (nextVault.type === "BLACKOUT_NODE") {
      setNodeTarget(rand(0, 35));
      setWrongNodeClicks([]);
    }

    startMainTimer(nextVault.timer);
  }

  function awardVault(extra = 0) {
    if (endedRef.current) return;
    endedRef.current = true;
    clearAllTimers();

    const speedBonus = timeLeft * 45;
    const streakBonus = streak * 160;
    const levelBonus = vault.level * 180;

    const earned = Math.floor(
      (vault.value + speedBonus + streakBonus + levelBonus + extra) * multiplier
    );

    setRunScore((prev) => prev + earned);
    setMultiplier((prev) => Number((prev + 0.35).toFixed(2)));
    setStreak((prev) => prev + 1);
    setLastResult("success");
    setLastPoints(earned);
    setLastPenalty(0);
    setPhase("result");
    setMessage(`Access granted. +${earned.toLocaleString()} unbanked points.`);

    introRef.current = setTimeout(() => {
      setPhase("bank");
    }, 850);
  }

  function failVault(reason: string) {
    if (endedRef.current) return;
    endedRef.current = true;
    clearAllTimers();

    const penaltyRate = vault.level >= 8 ? 0.6 : vault.level >= 5 ? 0.5 : 0.4;
    const lost = Math.floor(runScore * penaltyRate);
    const kept = Math.max(0, runScore - lost);
    const nextShields = shields - 1;

    setRunScore(kept);
    setMultiplier((prev) => Math.max(1, Number((prev - 0.75).toFixed(2))));
    setStreak(0);
    setShields(nextShields);
    setLastResult("fail");
    setLastPoints(0);
    setLastPenalty(lost);

    if (nextShields <= 0) {
      setPhase("gameover");
      setMessage(`${reason} Shields depleted. Finals run ended.`);
      return;
    }

    setPhase("result");
    setMessage(
      `${reason} Lost ${lost.toLocaleString()} unbanked points. ${kept.toLocaleString()} stayed alive.`
    );

    introRef.current = setTimeout(() => {
      setPhase("bank");
    }, 1000);
  }

  function bankPoints() {
    setBankedScore((prev) => prev + runScore);
    setRunScore(0);
    setMultiplier(1);
    setStreak(0);
    beginVault(makeVault(vault.level + 1));
  }

  function pushRisk() {
    beginVault(makeVault(vault.level + 1));
  }

  function endRun() {
    clearAllTimers();
    endedRef.current = true;
    setPhase("gameover");
    setMessage("You cashed out your finals run.");

    if (!TEST_MODE) {
      /*
      saveScore({
        gameId: "vault-break",
        score: totalScore,
        durationSeconds: 0,
        accuracy: highestLevel,
        attemptNumber: 1,
      });
      */
    }
  }

  function hitPulse() {
    const distance = Math.abs(pulsePos - 50);

    if (distance <= 5) {
      const nextHits = pulseHits + 1;
      setPulseHits(nextHits);

      if (nextHits >= 3) {
        awardVault(1000);
      } else {
        setMessage(`Perfect breach. ${3 - nextHits} hits left.`);
      }

      return;
    }

    if (distance <= 13) {
      const nextHits = pulseHits + 1;
      setPulseHits(nextHits);

      if (nextHits >= 3) {
        awardVault(500);
      } else {
        setMessage(`Good breach. ${3 - nextHits} hits left.`);
      }

      return;
    }

    failVault("Breach pulse missed.");
  }

  function changeReactor(index: number, amount: number) {
    setReactors((prev) =>
      prev.map((value, i) => (i === index ? clamp(value + amount, 0, 100) : value))
    );
  }

  function submitReactors() {
    const stable = reactors.every((value) => value >= 42 && value <= 58);

    if (stable) {
      awardVault(1000);
    } else {
      failVault("Reactor meltdown.");
    }
  }

  function chooseSignal(index: number) {
    if (index === signalTarget) {
      awardVault(1100);
    } else {
      failVault("Decoy signal selected.");
    }
  }

  function stopRing(index: number) {
    if (lockedRingsRef.current[index]) return;

    lockedRingsRef.current = lockedRingsRef.current.map((locked, i) =>
      i === index ? true : locked
    );

    setLockedRings([...lockedRingsRef.current]);

    if (lockedRingsRef.current.every(Boolean)) {
      const tolerance = Math.max(18 - vault.level, 8);

      const synced = ringsRef.current.every((deg) => {
        const distanceTo90 = Math.abs(deg - 90);
        const distanceTo270 = Math.abs(deg - 270);
        return Math.min(distanceTo90, distanceTo270) <= tolerance;
      });

      if (synced) {
        awardVault(1200);
      } else {
        failVault("Lock rings out of sync.");
      }
    }
  }

  function shootDrone(index: number) {
    const droneId = drones[index];

    if (badDrones.includes(droneId)) {
      failVault("Explosive decoy drone hit.");
      return;
    }

    setDrones((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const hostileRemaining = next.filter((id) => !badDrones.includes(id));

      if (hostileRemaining.length === 0) {
        setTimeout(() => awardVault(1300), 50);
      }

      return next;
    });
  }

  function clickNode(index: number) {
    if (index === nodeTarget) {
      awardVault(1400);
      return;
    }

    const nextWrong = [...wrongNodeClicks, index];
    setWrongNodeClicks(nextWrong);

    if (nextWrong.length >= 3) {
      failVault("Blackout navigation failed.");
    }
  }

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#3b120a_0%,#09090b_42%,#000_100%)] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-yellow-300 blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-red-500 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-yellow-300">
              Saturday Finals Event
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
              Vault <span className="text-yellow-300">Break</span>
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Arcade rogue-run finals: timing, stabilization, target priority,
              lock sync, blackout search, banking, shields, and escalating chaos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/finals" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:bg-white/20">
              Finals
            </Link>

            <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:bg-white/20">
              Menu
            </Link>

            <button onClick={startGame} className="rounded-2xl bg-yellow-300 px-6 py-4 font-black text-black transition hover:scale-[1.02] hover:bg-yellow-200">
              {phase === "idle" ? "Start Run" : "Restart"}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="Level" value={vault.level} />
          <Stat label="Timer" value={phase === "playing" ? `${timeLeft}s` : "-"} />
          <Stat label="Banked" value={bankedScore.toLocaleString()} />
          <Stat label="Unbanked" value={runScore.toLocaleString()} />
          <Stat label="Multi" value={`x${multiplier}`} />
          <Stat label="Shields" value={shields} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-h-[560px] rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <div className="mb-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
              <p className="font-black text-yellow-100">{message}</p>

              {TEST_MODE && (
                <p className="mt-2 text-xs font-black uppercase tracking-widest text-red-300">
                  Test Mode: score saving disabled
                </p>
              )}
            </div>

            {phase === "idle" && (
              <Panel title="Finals Rogue Run">
                <p className="text-lg text-zinc-300">
                  Clear each vault type, build your multiplier, then choose:
                  bank safe points or push into a harder level.
                </p>
              </Panel>
            )}

            {phase === "intro" && (
              <div className="flex min-h-[430px] items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-yellow-300">
                    Level {vault.level}
                  </p>
                  <h2 className="mt-3 animate-pulse text-6xl font-black">
                    {vault.name}
                  </h2>
                  <p className="mt-4 text-xl font-bold text-zinc-400">
                    Threat: {vault.threat}
                  </p>
                </div>
              </div>
            )}

            {phase === "result" && (
              <div className="flex min-h-[430px] items-center justify-center">
                <div className="text-center">
                  <h2 className={`text-6xl font-black ${lastResult === "success" ? "text-emerald-300" : "text-red-300"}`}>
                    {lastResult === "success" ? "ACCESS GRANTED" : "BREACH FAILED"}
                  </h2>

                  <p className="mt-5 text-4xl font-black text-yellow-300">
                    {lastResult === "success"
                      ? `+${lastPoints.toLocaleString()}`
                      : `-${lastPenalty.toLocaleString()}`}
                  </p>
                </div>
              </div>
            )}

            {phase === "playing" && (
              <Panel title={`Level ${vault.level}: ${vault.name}`}>
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <Mini label="Threat" value={vault.threat} />
                  <Mini label="Value" value={vault.value.toLocaleString()} />
                  <Mini label="Streak" value={streak} />
                </div>

                {vault.type === "BREACH_PULSE" && (
                  <div>
                    <Objective text="Hit the moving pulse inside the gold zone 3 times." />

                    <div className="relative mt-10 h-28 overflow-hidden rounded-full border border-white/10 bg-black/60 shadow-inner">
                      <div className="absolute left-[43%] top-0 h-full w-[14%] animate-pulse rounded-full bg-yellow-300/25 ring-2 ring-yellow-300/50" />

                      <div
                        className="absolute top-1/2 h-14 w-14 -translate-y-1/2 rounded-full bg-red-400 shadow-[0_0_40px_rgba(248,113,113,0.75)]"
                        style={{ left: `${pulsePos}%` }}
                      />
                    </div>

                    <p className="mt-4 text-center text-sm font-black uppercase tracking-widest text-zinc-400">
                      Hits: {pulseHits}/3
                    </p>

                    <button onClick={hitPulse} className="mt-8 w-full rounded-2xl bg-yellow-300 px-6 py-5 text-xl font-black text-black transition hover:scale-[1.01] hover:bg-yellow-200">
                      Breach
                    </button>
                  </div>
                )}

                {vault.type === "REACTOR_OVERRIDE" && (
                  <div>
                    <Objective text="Keep every reactor inside the green 42–58 safe band." />

                    <div className="mt-6 grid gap-4">
                      {reactors.map((value, index) => (
                        <div key={index} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                          <div className="mb-2 flex justify-between">
                            <p className="font-black">Reactor {index + 1}</p>
                            <p className={value >= 42 && value <= 58 ? "font-black text-emerald-300" : "font-black text-red-300"}>
                              {value}%
                            </p>
                          </div>

                          <div className="relative h-5 overflow-hidden rounded-full bg-zinc-800">
                            <div className="absolute left-[42%] top-0 h-full w-[16%] bg-emerald-300/25" />
                            <div className="h-full bg-red-400 transition-all" style={{ width: `${value}%` }} />
                          </div>

                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {[-12, -6, 6, 12].map((amount) => (
                              <button key={amount} onClick={() => changeReactor(index, amount)} className="rounded-xl bg-white/10 py-2 font-black transition hover:bg-white/20">
                                {amount > 0 ? `+${amount}` : amount}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={submitReactors} className="mt-6 w-full rounded-2xl bg-yellow-300 px-6 py-5 text-xl font-black text-black">
                      Override Reactor
                    </button>
                  </div>
                )}

                {vault.type === "SIGNAL_HUNT" && (
                  <div>
                    <Objective text="Find the clean signal. Most tiles are decoys." />

                    <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
                      {signalTiles.map((tile) => {
                        const isTarget = tile === signalTarget;

                        return (
                          <button
                            key={tile}
                            onClick={() => chooseSignal(tile)}
                            className={[
                              "aspect-square rounded-2xl border text-xl font-black transition hover:scale-105",
                              isTarget
                                ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-300 animate-pulse"
                                : "border-red-300/15 bg-red-500/10 text-red-300",
                            ].join(" ")}
                          >
                            {isTarget ? "◇" : ["◆", "◇", "◈", "⬡"][tile % 4]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {vault.type === "LOCK_SYNC" && (
                  <div>
                    <Objective text="Stop every rotating ring near the vertical gold alignment mark." />

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      {rings.map((deg, index) => (
                        <button
                          key={index}
                          disabled={lockedRings[index]}
                          onClick={() => stopRing(index)}
                          className="rounded-3xl border border-white/10 bg-black/40 p-5 transition hover:scale-[1.02] disabled:opacity-60"
                        >
                          <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-zinc-700">
                            <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-yellow-300/60" />
                            <div
                              className="absolute h-3 w-16 origin-left rounded-full bg-red-400"
                              style={{ transform: `rotate(${deg}deg)` }}
                            />
                            <div className="h-5 w-5 rounded-full bg-yellow-300" />
                          </div>

                          <p className="mt-3 font-black">
                            {lockedRings[index] ? "Locked" : "Stop Ring"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {vault.type === "DRONE_PANIC" && (
                  <div>
                    <Objective text="Destroy red hostile drones. Avoid yellow explosive decoys." />

                    <div className="relative mt-6 min-h-[360px] rounded-3xl border border-white/10 bg-black/50 p-4">
                      {drones.map((id, index) => {
                        const bad = badDrones.includes(id);
                        const left = (id * 37 + vault.level * 11) % 85;
                        const top = (id * 53 + vault.level * 7) % 78;

                        return (
                          <button
                            key={id}
                            onClick={() => shootDrone(index)}
                            className={[
                              "absolute flex h-14 w-14 items-center justify-center rounded-full border text-2xl font-black transition hover:scale-125",
                              bad
                                ? "border-yellow-300/40 bg-yellow-300/15 text-yellow-300"
                                : "border-red-300/40 bg-red-500/25 text-red-300",
                            ].join(" ")}
                            style={{ left: `${left}%`, top: `${top}%` }}
                          >
                            {bad ? "⚠" : "⌖"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {vault.type === "BLACKOUT_NODE" && (
                  <div>
                    <Objective text="Find the hidden access node. You get 3 wrong clicks." />

                    <div className="mt-6 grid grid-cols-6 gap-3">
                      {Array.from({ length: 36 }).map((_, index) => {
                        const clicked = wrongNodeClicks.includes(index);
                        const nearTarget =
                          Math.abs(index - nodeTarget) <= 1 ||
                          Math.abs(index - nodeTarget) === 6;

                        return (
                          <button
                            key={index}
                            onClick={() => clickNode(index)}
                            className={[
                              "aspect-square rounded-2xl border text-lg font-black transition hover:scale-105",
                              clicked
                                ? "border-red-300/30 bg-red-500/20 text-red-300"
                                : nearTarget
                                  ? "border-yellow-300/20 bg-yellow-300/10"
                                  : "border-white/10 bg-zinc-950",
                            ].join(" ")}
                          >
                            {clicked ? "X" : ""}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-sm font-black uppercase tracking-widest text-zinc-400">
                      Wrong clicks: {wrongNodeClicks.length}/3
                    </p>
                  </div>
                )}
              </Panel>
            )}

            {phase === "bank" && (
              <Panel title="Bank or Push?">
                <div className="grid gap-4 md:grid-cols-2">
                  <Choice
                    title="Bank"
                    subtitle="Lock your unbanked points. Multiplier resets."
                    value={`+${runScore.toLocaleString()} safe`}
                    color="emerald"
                    onClick={bankPoints}
                  />

                  <Choice
                    title="Push"
                    subtitle={`Next threat: ${nextThreat}. Failure only partially hurts you.`}
                    value={`x${multiplier} alive`}
                    color="red"
                    onClick={pushRisk}
                  />
                </div>

                <button onClick={endRun} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 font-black transition hover:bg-white/20">
                  End Run
                </button>
              </Panel>
            )}

            {phase === "gameover" && (
              <Panel title="Run Complete">
                <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-8 text-center">
                  <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
                    Final Score
                  </p>

                  <p className="mt-2 text-6xl font-black text-yellow-300">
                    {totalScore.toLocaleString()}
                  </p>

                  <p className="mt-4 text-zinc-300">
                    Highest Level Reached: {highestLevel}
                  </p>
                </div>
              </Panel>
            )}
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-black text-yellow-300">Finals Rules</h2>

            <div className="mt-5 space-y-4 text-sm text-zinc-300">
              <Rule title="Different Vaults" text="Each level rotates into a different arcade mechanic." />
              <Rule title="Risk Banking" text="Bank to lock points. Push to preserve multiplier." />
              <Rule title="Partial Punishment" text="Failure costs 40–60% of unbanked points and one shield." />
              <Rule title="Escalation" text="Timers shrink, values rise, and pressure increases by level." />
              <Rule title="One Official Run" text="Later, turn off test mode and save only one final score." />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 text-3xl font-black">{title}</h2>
      {children}
    </div>
  );
}

function Objective({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5">
      <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
        Objective
      </p>
      <p className="mt-2 text-xl font-black">{text}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-yellow-300">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function Choice({
  title,
  subtitle,
  value,
  color,
  onClick,
}: {
  title: string;
  subtitle: string;
  value: string;
  color: "emerald" | "red";
  onClick: () => void;
}) {
  const box =
    color === "emerald"
      ? "border-emerald-300/20 bg-emerald-300/10"
      : "border-red-300/20 bg-red-300/10";

  const text = color === "emerald" ? "text-emerald-300" : "text-red-300";
  const button = color === "emerald" ? "bg-emerald-300" : "bg-red-400";

  return (
    <div className={`rounded-3xl border p-6 ${box}`}>
      <h3 className={`text-3xl font-black ${text}`}>{title}</h3>
      <p className="mt-2 text-zinc-300">{subtitle}</p>
      <p className="mt-4 text-2xl font-black text-white">{value}</p>

      <button
        onClick={onClick}
        className={`mt-5 w-full rounded-2xl px-5 py-4 font-black text-black transition hover:scale-[1.02] ${button}`}
      >
        {title}
      </button>
    </div>
  );
}

function Rule({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-1 text-zinc-400">{text}</p>
    </div>
  );
}