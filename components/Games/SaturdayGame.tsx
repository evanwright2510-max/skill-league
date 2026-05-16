"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
// import { saveScore } from "@/lib/saveScore";

const TEST_MODE = true;

type Phase = "idle" | "intro" | "playing" | "result" | "bank" | "gameover";

type VaultType =
  | "BREACH_PULSE"
  | "REACTOR_CORE"
  | "QUANTUM_TRACE"
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

function dist(a: number, b: number) {
  return Math.abs(a - b);
}

function vaultTypeForLevel(level: number): VaultType {
  const cycle: VaultType[] = [
    "BREACH_PULSE",
    "REACTOR_CORE",
    "QUANTUM_TRACE",
    "LOCK_SYNC",
    "DRONE_PANIC",
    "BLACKOUT_NODE",
  ];

  return cycle[(level - 1) % cycle.length];
}

function getVaultName(type: VaultType) {
  if (type === "BREACH_PULSE") return "Breach Pulse";
  if (type === "REACTOR_CORE") return "Reactor Core";
  if (type === "QUANTUM_TRACE") return "Quantum Trace";
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
    timer: Math.max(9, 27 - Math.floor(level * 1.15)),
    value: 900 + level * 575,
    threat: getThreat(level),
  };
}

type Orb = {
  id: number;
  x: number;
  y: number;
  real: boolean;
};

export default function SaturdayGame() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const motionRef = useRef<NodeJS.Timeout | null>(null);
  const introRef = useRef<NodeJS.Timeout | null>(null);
  const endedRef = useRef(false);

  const pulseDirRef = useRef(1);

  const ringsRef = useRef<number[]>([]);
  const lockedRingsRef = useRef<boolean[]>([]);

  const quantumRealRef = useRef<Orb | null>(null);

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
    "Clear vaults. Build multiplier. Bank before greed burns you."
  );

  const [lastResult, setLastResult] = useState<ResultKind>("success");
  const [lastPoints, setLastPoints] = useState(0);
  const [lastPenalty, setLastPenalty] = useState(0);

  const [pulsePos, setPulsePos] = useState(8);
  const [pulseHits, setPulseHits] = useState(0);

  const [coreHeat, setCoreHeat] = useState(48);
  const [coreStability, setCoreStability] = useState(100);
  const [coolantCharges, setCoolantCharges] = useState(5);
  const [ventCharges, setVentCharges] = useState(3);
  const [coreSurvive, setCoreSurvive] = useState(0);

  const [quantumPhase, setQuantumPhase] = useState<"observe" | "choose">("observe");
  const [quantumX, setQuantumX] = useState(12);
  const [quantumY, setQuantumY] = useState(48);
  const [quantumVX, setQuantumVX] = useState(2.4);
  const [quantumVY, setQuantumVY] = useState(1.7);
  const [quantumOrbs, setQuantumOrbs] = useState<Orb[]>([]);
  const [quantumTrail, setQuantumTrail] = useState<{ x: number; y: number }[]>([]);

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
    setMessage(`${nextVault.name} online. Threat level: ${nextVault.threat}.`);

    if (nextVault.type === "BREACH_PULSE") {
      pulseDirRef.current = 1;
      setPulsePos(8);
      setPulseHits(0);

      motionRef.current = setInterval(() => {
        setPulsePos((prev) => {
          let next = prev + pulseDirRef.current * (3.2 + nextVault.level * 0.38);

          if (next >= 92) {
            pulseDirRef.current = -1;
            next = 92;
          }

          if (next <= 0) {
            pulseDirRef.current = 1;
            next = 0;
          }

          return next;
        });
      }, 45);
    }

    if (nextVault.type === "REACTOR_CORE") {
      setCoreHeat(46);
      setCoreStability(100);
      setCoolantCharges(Math.max(3, 6 - Math.floor(nextVault.level / 4)));
      setVentCharges(Math.max(2, 4 - Math.floor(nextVault.level / 5)));
      setCoreSurvive(0);

      motionRef.current = setInterval(() => {
        setCoreSurvive((prev) => {
          const next = prev + 1;

          if (next >= Math.max(11, 16 - Math.floor(nextVault.level / 2))) {
            awardVault(1300);
          }

          return next;
        });

        setCoreHeat((prev) => {
          const rise = 5 + nextVault.level * 0.9;
          const next = clamp(prev + rise + rand(-3, 5), 0, 120);

          if (next >= 96) {
            setCoreStability((s) => {
              const damaged = s - (10 + nextVault.level * 2);
              if (damaged <= 0) {
                setTimeout(() => failVault("Reactor meltdown."), 40);
              }
              return clamp(damaged, 0, 100);
            });
          }

          return next;
        });
      }, Math.max(700, 1050 - nextVault.level * 45));
    }

    if (nextVault.type === "QUANTUM_TRACE") {
      const startX = rand(14, 28);
      const startY = rand(25, 75);

      setQuantumPhase("observe");
      setQuantumX(startX);
      setQuantumY(startY);
      setQuantumVX(2.2 + nextVault.level * 0.16);
      setQuantumVY(1.6 + nextVault.level * 0.13);
      setQuantumOrbs([]);
      setQuantumTrail([]);

      let localX = startX;
      let localY = startY;
      let vx = 2.2 + nextVault.level * 0.16;
      let vy = 1.6 + nextVault.level * 0.13;

      motionRef.current = setInterval(() => {
        localX += vx;
        localY += vy;

        if (localX > 88 || localX < 8) vx *= -1;
        if (localY > 82 || localY < 14) vy *= -1;

        localX = clamp(localX, 8, 88);
        localY = clamp(localY, 14, 82);

        setQuantumX(localX);
        setQuantumY(localY);
        setQuantumTrail((prev) => [...prev.slice(-9), { x: localX, y: localY }]);
      }, 55);

      introRef.current = setTimeout(() => {
        if (motionRef.current) clearInterval(motionRef.current);

        const real: Orb = {
          id: 999,
          x: localX,
          y: localY,
          real: true,
        };

        quantumRealRef.current = real;

        const decoyCount = Math.min(8 + nextVault.level * 2, 26);
        const decoys: Orb[] = Array.from({ length: decoyCount }, (_, i) => ({
          id: i,
          x: clamp(localX + rand(-34, 34), 6, 90),
          y: clamp(localY + rand(-28, 28), 12, 84),
          real: false,
        }));

        setQuantumPhase("choose");
        setQuantumOrbs([...decoys, real].sort(() => Math.random() - 0.5));
        setMessage("Blackout. Click the REAL final orb position.");
      }, Math.max(1700, 2600 - nextVault.level * 85));
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
          return (deg + 6.8 + nextVault.level * 1.25 + index * 2.1) % 360;
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

    const speedBonus = timeLeft * 50;
    const streakBonus = streak * 175;
    const levelBonus = vault.level * 200;

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

    const penaltyRate = vault.level >= 8 ? 0.62 : vault.level >= 5 ? 0.5 : 0.38;
    const lost = Math.floor(runScore * penaltyRate);
    const kept = Math.max(0, runScore - lost);
    const nextShields = shields - 1;

    setRunScore(kept);
    setMultiplier((prev) => Math.max(1, Number((prev - 0.7).toFixed(2))));
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
        gameId: "saturday-finals",
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

      if (nextHits >= 3) awardVault(1200);
      else setMessage(`Perfect breach. ${3 - nextHits} hits left.`);
      return;
    }

    if (distance <= 12) {
      const nextHits = pulseHits + 1;
      setPulseHits(nextHits);

      if (nextHits >= 3) awardVault(650);
      else setMessage(`Good breach. ${3 - nextHits} hits left.`);
      return;
    }

    failVault("Pulse missed.");
  }

  function coolCore() {
    if (coolantCharges <= 0) return;
    setCoolantCharges((prev) => prev - 1);
    setCoreHeat((prev) => clamp(prev - rand(21, 30), 0, 120));
    setMessage("Coolant injected. Core temperature dropping.");
  }

  function ventCore() {
    if (ventCharges <= 0) return;
    setVentCharges((prev) => prev - 1);

    setCoreHeat((prev) => {
      if (prev < 54) {
        setCoreStability((s) => clamp(s - 14, 0, 100));
        setMessage("Bad vent. Stability damaged.");
        return prev + 8;
      }

      setMessage("Pressure vented cleanly.");
      return clamp(prev - rand(12, 20), 0, 120);
    });
  }

  function chooseQuantumOrb(orb: Orb) {
    if (orb.real) {
      awardVault(1400);
      return;
    }

    const real = quantumRealRef.current;
    const closeness = real
      ? Math.hypot(orb.x - real.x, orb.y - real.y)
      : 99;

    if (closeness <= 10) {
      failVault("Close decoy selected.");
    } else {
      failVault("Wrong quantum signature.");
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
        const distanceTo90 = dist(deg, 90);
        const distanceTo270 = dist(deg, 270);
        return Math.min(distanceTo90, distanceTo270) <= tolerance;
      });

      if (synced) awardVault(1250);
      else failVault("Lock rings out of sync.");
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
      awardVault(1450);
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

  const dangerCore = coreHeat >= 82 || coreStability <= 35;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#3b120a_0%,#09090b_42%,#000_100%)] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-25">
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
              A finals rogue-run built around pressure, timing, tracking,
              risk, banking, shields, and multiplier greed.
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
                  Clear vaults, build your multiplier, and decide whether to
                  bank safely or push into harder levels for a higher score.
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
                    <Objective text="Hit the moving pulse inside the gold breach zone 3 times." />

                    <div className="relative mt-10 h-28 overflow-hidden rounded-full border border-white/10 bg-black/60 shadow-inner">
                      <div className="absolute left-[44%] top-0 h-full w-[12%] animate-pulse rounded-full bg-yellow-300/25 ring-2 ring-yellow-300/50" />

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

                {vault.type === "REACTOR_CORE" && (
                  <div>
                    <Objective text="Keep the reactor alive until the override completes. Cool when hot. Vent only when pressure is high." />

                    <div className={`mt-7 rounded-[2rem] border p-6 transition ${dangerCore ? "border-red-400/50 bg-red-500/10" : "border-white/10 bg-black/40"}`}>
                      <div className="flex flex-col items-center">
                        <div
                          className={[
                            "relative flex h-52 w-52 items-center justify-center rounded-full border-4 transition",
                            dangerCore
                              ? "animate-pulse border-red-300 bg-red-500/20 shadow-[0_0_80px_rgba(248,113,113,0.65)]"
                              : "border-yellow-300/50 bg-yellow-300/10 shadow-[0_0_70px_rgba(253,224,71,0.35)]",
                          ].join(" ")}
                        >
                          <div className="absolute inset-6 rounded-full border border-white/10" />
                          <div className="absolute inset-12 rounded-full border border-white/10" />
                          <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                              Core Heat
                            </p>
                            <p className={`text-5xl font-black ${dangerCore ? "text-red-300" : "text-yellow-300"}`}>
                              {Math.round(coreHeat)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-7 grid gap-4 md:grid-cols-2">
                        <Gauge label="Stability" value={coreStability} danger={coreStability <= 35} />
                        <Gauge label="Override" value={Math.min(100, coreSurvive * 8)} danger={false} />
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <button
                          onClick={coolCore}
                          disabled={coolantCharges <= 0}
                          className="rounded-2xl bg-cyan-300 px-6 py-5 text-xl font-black text-black transition hover:scale-[1.02] disabled:opacity-40"
                        >
                          Inject Coolant ({coolantCharges})
                        </button>

                        <button
                          onClick={ventCore}
                          disabled={ventCharges <= 0}
                          className="rounded-2xl bg-orange-300 px-6 py-5 text-xl font-black text-black transition hover:scale-[1.02] disabled:opacity-40"
                        >
                          Vent Pressure ({ventCharges})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {vault.type === "QUANTUM_TRACE" && (
                  <div>
                    <Objective text={quantumPhase === "observe" ? "Track the yellow orb. It will disappear." : "Click where the real orb ended after blackout."} />

                    <div className="relative mt-6 h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_center,#171717_0%,#050505_70%)]">
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />

                      {quantumPhase === "observe" &&
                        quantumTrail.map((p, i) => (
                          <div
                            key={i}
                            className="absolute h-5 w-5 rounded-full bg-yellow-300"
                            style={{
                              left: `${p.x}%`,
                              top: `${p.y}%`,
                              opacity: (i + 1) / quantumTrail.length / 1.4,
                            }}
                          />
                        ))}

                      {quantumPhase === "observe" && (
                        <div
                          className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300 shadow-[0_0_45px_rgba(253,224,71,0.9)]"
                          style={{ left: `${quantumX}%`, top: `${quantumY}%` }}
                        />
                      )}

                      {quantumPhase === "choose" && (
                        <>
                          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

                          {quantumOrbs.map((orb) => (
                            <button
                              key={orb.id}
                              onClick={() => chooseQuantumOrb(orb)}
                              className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300/25 bg-yellow-300/20 shadow-[0_0_25px_rgba(253,224,71,0.35)] transition hover:scale-125"
                              style={{ left: `${orb.x}%`, top: `${orb.y}%` }}
                            />
                          ))}
                        </>
                      )}
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
                    subtitle={`Next threat: ${nextThreat}. Keep multiplier alive.`}
                    value={`x${multiplier} active`}
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
              <Rule title="Rotating Challenges" text="Each vault tests a different skill: timing, tracking, pressure control, target priority, or memory." />
              <Rule title="Risk Banking" text="Bank to lock points. Push to preserve multiplier." />
              <Rule title="Partial Punishment" text="Failure costs unbanked points and one shield." />
              <Rule title="Escalation" text="Timers shrink, values rise, and chaos increases by level." />
              <Rule title="One Official Run" text="Turn off test mode later and save only the first finals attempt." />
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

function Gauge({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="mb-2 flex justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
          {label}
        </p>
        <p className={danger ? "font-black text-red-300" : "font-black text-emerald-300"}>
          {Math.round(value)}%
        </p>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={danger ? "h-full bg-red-400" : "h-full bg-emerald-300"}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
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

function Mini({ label, value }: { label: string | number; value: string | number }) {
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