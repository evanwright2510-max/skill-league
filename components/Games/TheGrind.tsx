"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveScore } from "@/lib/saveScore";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TOTAL_TURNS = 80;
const RENT_PER_PROPERTY = 150;

// ─── CAREER DATA ──────────────────────────────────────────────────────────────

const CAREERS = [
  {
    id: "tech",
    icon: "💻",
    name: "Software Engineer",
    color: "text-blue-300",
    tagline: "High ceiling, slow start. Study hard, compound gains.",
    startCash: 600,
    special: "marketBonus",
    specialDesc: "Senior+ engineers earn +2.5% on all bond returns.",
    perks: ["Senior+: +2.5% bond returns", "Open source recruiter bonuses", "Freelance unlocks at 6 XP"],
    tiers: [
      { name: "Bootcamp Grad",      income: 160,  req: 0  },
      { name: "Junior Dev",         income: 340,  req: 3  },
      { name: "Mid Engineer",       income: 590,  req: 7  },
      { name: "Senior Engineer",    income: 960,  req: 13 },
      { name: "Staff Engineer",     income: 1420, req: 21 },
      { name: "Principal Engineer", income: 2150, req: 31 },
      { name: "CTO / Founder",      income: 3600, req: 44 },
    ],
    studyActions: [
      { id: "cs",  icon: "📚", name: "Study CS",        desc: "Core algorithms. +1.0 XP.",                   xp: 1.0, burnout: 5 },
      { id: "sys", icon: "🏗️", name: "System Design",   desc: "Architect at scale. +1.7 XP, high burnout.",  xp: 1.7, burnout: 9 },
      { id: "oss", icon: "🌐", name: "Open Source",     desc: "25% chance of recruiter bonus $300–800.",      xp: 0.6, burnout: 3 },
    ],
    workName: "Ship Features",
    workBurnout: 8,
    hustleName: "Freelance Gig",
    hustleBurnout: 20,
    hustleMulti: 1.9,
    hustleXpReq: 6,
  },
  {
    id: "finance",
    icon: "📈",
    name: "Finance & Trading",
    color: "text-emerald-300",
    tagline: "Lives by the market. Highest ceiling if you time it right.",
    startCash: 700,
    special: "leverage",
    specialDesc: "Buy stocks at 50% cost (2x leverage).",
    perks: ["2x stock leverage", "Quarterly bonus events", "Prop trading hustle"],
    tiers: [
      { name: "Analyst Intern",    income: 220,  req: 0  },
      { name: "Junior Analyst",    income: 460,  req: 3  },
      { name: "Associate",         income: 800,  req: 7  },
      { name: "VP of Finance",     income: 1280, req: 13 },
      { name: "Director",          income: 2050, req: 21 },
      { name: "Managing Director", income: 3300, req: 31 },
      { name: "Partner",           income: 5500, req: 44 },
    ],
    studyActions: [
      { id: "cfa",   icon: "📊", name: "CFA Studies",   desc: "Finance credential. +1.2 XP.",                xp: 1.2, burnout: 7  },
      { id: "quant", icon: "🧮", name: "Quant Methods", desc: "Algorithmic edge. +2.0 XP, very high burnout.", xp: 2.0, burnout: 13 },
      { id: "net",   icon: "🤝", name: "Network",       desc: "20% chance of deal bonus $400–1300.",           xp: 0.5, burnout: 3  },
    ],
    workName: "Analyze & Trade",
    workBurnout: 9,
    hustleName: "Prop Trade",
    hustleBurnout: 6,
    hustleMulti: 0,
    hustleXpReq: 5,
  },
  {
    id: "creative",
    icon: "🎨",
    name: "Creative Entrepreneur",
    color: "text-pink-300",
    tagline: "Feast or famine. Build an audience — money flows to you.",
    startCash: 450,
    special: "passive",
    specialDesc: "Each 'Build Audience' adds $100/mo passive income forever.",
    perks: ["Passive income stacks permanently", "Viral collab events", "Production boosts hustle income"],
    tiers: [
      { name: "Freelancer",      income: 80,   req: 0  },
      { name: "Indie Creator",   income: 190,  req: 3  },
      { name: "Agency Owner",    income: 390,  req: 7  },
      { name: "Brand Deal Tier", income: 700,  req: 13 },
      { name: "Studio Founder",  income: 1120, req: 21 },
      { name: "Media Company",   income: 1850, req: 31 },
      { name: "Creative Empire", income: 3100, req: 44 },
    ],
    studyActions: [
      { id: "aud",  icon: "📣", name: "Build Audience",   desc: "Adds $100/mo passive income permanently.",      xp: 0.8, burnout: 4 },
      { id: "prod", icon: "🎬", name: "Learn Production", desc: "Boosts hustle income by +20% permanently.",     xp: 1.1, burnout: 6 },
      { id: "col",  icon: "🎭", name: "Brand Collab",     desc: "40% viral $1000–4000. 60% flop.",               xp: 0.7, burnout: 5 },
    ],
    workName: "Client Projects",
    workBurnout: 6,
    hustleName: "Launch a Product",
    hustleBurnout: 14,
    hustleMulti: 2.5,
    hustleXpReq: 5,
  },
  {
    id: "medicine",
    icon: "🩺",
    name: "Medicine",
    color: "text-red-300",
    tagline: "Zero income for years. Brutal grind. Astronomical endgame.",
    startCash: 200,
    special: "burnoutImmunity",
    specialDesc: "Fellow+ rank: burnout income penalties are halved.",
    perks: ["Burnout penalties halved at Fellow+", "Research grants", "Highest possible salary"],
    tiers: [
      { name: "Pre-Med Student",     income: 0,    req: 0  },
      { name: "Medical Student",     income: 50,   req: 5  },
      { name: "Resident",            income: 290,  req: 11 },
      { name: "Fellow",              income: 570,  req: 17 },
      { name: "Attending Physician", income: 1380, req: 23 },
      { name: "Specialist",          income: 2400, req: 32 },
      { name: "Chief of Medicine",   income: 4200, req: 45 },
    ],
    studyActions: [
      { id: "medstudy",  icon: "🧬", name: "Medical Studies",  desc: "Required to advance. +1.4 XP.",            xp: 1.4, burnout: 9  },
      { id: "research",  icon: "🔬", name: "Publish Research", desc: "30% chance of $800–2000 research grant.",   xp: 2.0, burnout: 6  },
      { id: "moonlight", icon: "🌙", name: "Moonlight Shift",  desc: "80% salary extra cash. No XP. +17% burnout.", xp: 0, burnout: 17 },
    ],
    workName: "See Patients",
    workBurnout: 10,
    hustleName: "Pharma Consult",
    hustleBurnout: 8,
    hustleMulti: 1.7,
    hustleXpReq: 17,
  },
  {
    id: "realestate",
    icon: "🏠",
    name: "Real Estate",
    color: "text-yellow-300",
    tagline: "Buy properties. Rent compounds forever. Mortgage your way up.",
    startCash: 700,
    special: "rent",
    specialDesc: "$150/mo rent per property + 3% appreciation every 5 months.",
    perks: ["$150/mo rent per property", "3% appreciation every 5 months", "House flipping"],
    tiers: [
      { name: "Agent Trainee",       income: 100,  req: 0  },
      { name: "Licensed Agent",      income: 270,  req: 3  },
      { name: "Property Investor",   income: 470,  req: 7  },
      { name: "Portfolio Owner",     income: 850,  req: 13 },
      { name: "Commercial Investor", income: 1400, req: 21 },
      { name: "Developer",           income: 2300, req: 31 },
      { name: "Real Estate Mogul",   income: 4000, req: 44 },
    ],
    studyActions: [
      { id: "license", icon: "📋", name: "Get Licensed",   desc: "Tier unlock credential. +1.1 XP.",             xp: 1.1, burnout: 5  },
      { id: "buyprop", icon: "🏡", name: "Buy a Property", desc: "Costs $1000. Adds $150/mo rent permanently.",   xp: 0.4, burnout: 2  },
      { id: "flip",    icon: "🔨", name: "Flip a House",   desc: "Costs $700. 50/50: $1200–3000 or loss.",        xp: 0.8, burnout: 12 },
    ],
    workName: "Close Deals",
    workBurnout: 7,
    hustleName: "Development Project",
    hustleBurnout: 18,
    hustleMulti: 0,
    hustleXpReq: 10,
  },
  {
    id: "law",
    icon: "⚖️",
    name: "Law",
    color: "text-purple-300",
    tagline: "Longest grind. Extraordinary ceiling. Cases change everything.",
    startCash: 350,
    special: "caseBonus",
    specialDesc: "Specialised Senior+: 15% chance $800–4500 case bonus per turn.",
    perks: ["15% case bonus when specialised", "Landmark pro bono windfalls", "Managing Partner = elite salary"],
    tiers: [
      { name: "Law Student",      income: 0,    req: 0  },
      { name: "Law Clerk",        income: 185,  req: 5  },
      { name: "Associate",        income: 465,  req: 10 },
      { name: "Senior Associate", income: 845,  req: 16 },
      { name: "Junior Partner",   income: 1560, req: 23 },
      { name: "Partner",          income: 2700, req: 32 },
      { name: "Managing Partner", income: 4800, req: 45 },
    ],
    studyActions: [
      { id: "lawstudy", icon: "📖", name: "Law Studies",   desc: "Core education. +1.4 XP.",                    xp: 1.4, burnout: 8 },
      { id: "spec",     icon: "🎓", name: "Specialise",    desc: "+1.9 XP. Unlocks case win bonuses.",           xp: 1.9, burnout: 7 },
      { id: "probono",  icon: "🕊️", name: "Pro Bono Case", desc: "30% chance of $1000–3500 windfall.",           xp: 0.7, burnout: 4 },
    ],
    workName: "Bill Hours",
    workBurnout: 9,
    hustleName: "Major Litigation",
    hustleBurnout: 16,
    hustleMulti: 2.2,
    hustleXpReq: 10,
  },
];

const MARKET: number[] = [
  .03,.06,.09,.12,.11,.09,.06,.02,-.02,-.06,-.10,-.13,-.09,-.05,-.01,
  .03,.07,.11,.14,.11,.08,.05,.02,.01,.04,.08,.11,.14,.16,.12,
  .09,.06,.03,.01,-.01,-.04,-.08,-.11,.01,.05,.09,.13,.10,.08,
  .05,.02,.06,.10,.13,.10,.07,.04,.01,-.02,.03,.07,.10,.08,.05,.03,
  .01,.02,.05,.08,.11,.09,.06,.04,.02,.00,.03,.06,.09,.07,.04,.02,.01,.00,
];

const STOCK_DEFS = [
  { id: "nvt", ticker: "NVT", name: "NovaTech Systems",  sector: "Tech",    base: 120, vol: 0.08, trend: 0.006 },
  { id: "dfi", ticker: "DFI", name: "DataFlow Inc",       sector: "Tech",    base: 85,  vol: 0.10, trend: 0.008 },
  { id: "atb", ticker: "ATB", name: "Atlas Bank",         sector: "Finance", base: 200, vol: 0.05, trend: 0.003 },
  { id: "mrc", ticker: "MRC", name: "Meridian Capital",   sector: "Finance", base: 150, vol: 0.06, trend: 0.004 },
  { id: "spc", ticker: "SPC", name: "SolarPeak Corp",     sector: "Energy",  base: 60,  vol: 0.12, trend: 0.010 },
  { id: "gml", ticker: "GML", name: "GenMed Labs",        sector: "Health",  base: 180, vol: 0.07, trend: 0.005 },
  { id: "omt", ticker: "OMT", name: "OmniMart",           sector: "Retail",  base: 45,  vol: 0.09, trend: 0.002 },
  { id: "cph", ticker: "CPH", name: "CipherCoin",         sector: "Crypto",  base: 30,  vol: 0.25, trend: 0.015 },
];

const EVENTS = [
  { turn: 6,  type: "bad",     icon: "🚗", title: "Car Breakdown",        sub: "Repair bill hit.",             amount: -300  },
  { turn: 13, type: "good",    icon: "💰", title: "Tax Refund",            sub: "Government owes you.",         amount: 600   },
  { turn: 19, type: "bad",     icon: "🏥", title: "Medical Bill",          sub: "Unexpected expense.",          amount: -500  },
  { turn: 25, type: "neutral", icon: "📰", title: "Market Analysts Speak", sub: "Insider tip unlocked.",        amount: 0     },
  { turn: 31, type: "good",    icon: "🤑", title: "Old Debt Repaid",       sub: "A friend paid you back.",      amount: 800   },
  { turn: 37, type: "bad",     icon: "📉", title: "Market Shock",          sub: "Portfolio hit hard.",          amount: -999  },
  { turn: 43, type: "good",    icon: "🎁", title: "Inheritance",           sub: "Distant relative left money.", amount: 1200  },
  { turn: 50, type: "bad",     icon: "💸", title: "Lifestyle Creep",       sub: "Spending caught up.",          amount: -800  },
  { turn: 57, type: "good",    icon: "🏆", title: "Industry Award",        sub: "Cash prize attached.",         amount: 1400  },
  { turn: 63, type: "bad",     icon: "🌊", title: "Recession",             sub: "Economy contracts.",           amount: -999  },
  { turn: 70, type: "good",    icon: "🎉", title: "Year-End Bonus",        sub: "Best performance yet.",        amount: 1800  },
  { turn: 76, type: "bad",     icon: "⚠️", title: "Emergency Fund Hit",    sub: "Unexpected family expense.",   amount: -1000 },
];

const LEADERBOARD = [
  { name: "Alex M.",   score: 118840 },
  { name: "Jordan K.", score: 94120  },
  { name: "Sam T.",    score: 75800  },
  { name: "Riley P.",  score: 60500  },
  { name: "Casey L.",  score: 46200  },
  { name: "Morgan F.", score: 33800  },
  { name: "Drew N.",   score: 22400  },
  { name: "Quinn B.",  score: 14600  },
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

function fmtPrice(n: number) {
  return "$" + n.toFixed(2);
}

function getTierIdx(tiers: { req: number }[], xp: number) {
  let t = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (xp >= tiers[i].req) { t = i; break; }
  }
  return t;
}

function getBurnoutMulti(special: string, tierIdx: number, burnout: number) {
  let b = burnout;
  if (special === "burnoutImmunity" && tierIdx >= 3) b = Math.min(b, 35);
  if (b < 30) return 1.0;
  if (b < 50) return 0.82;
  if (b < 70) return 0.60;
  if (b < 90) return 0.42;
  return 0.25;
}

function getPhase(turn: number) {
  if (turn <= 15) return "Early Career";
  if (turn <= 35) return "Building Momentum";
  if (turn <= 55) return "Mid Career";
  if (turn <= 68) return "Final Stretch";
  return "Last Push 🔥";
}

function mktLabel(rate: number) {
  if (rate > .10)  return { text: "🚀 Bull Run", color: "text-emerald-300" };
  if (rate > .03)  return { text: "📈 Growing",  color: "text-emerald-400" };
  if (rate >= -.03) return { text: "➡ Flat",     color: "text-white/60"   };
  if (rate >= -.08) return { text: "📉 Dipping", color: "text-yellow-300" };
  return                   { text: "💀 Crash",   color: "text-red-300"    };
}

function tickStocks(prices: Record<string, number>, history: Record<string, number[]>, turn: number) {
  const newPrices: Record<string, number> = { ...prices };
  const newHistory: Record<string, number[]> = {};
  for (const s of STOCK_DEFS) {
    const cycle = Math.sin(turn * 0.18 + STOCK_DEFS.indexOf(s)) * 0.04;
    const chg = (Math.random() - 0.48) * s.vol + s.trend + cycle;
    newPrices[s.id] = Math.max(1, Math.round(prices[s.id] * (1 + chg) * 100) / 100);
    newHistory[s.id] = [...(history[s.id] || []).slice(-20), newPrices[s.id]];
  }
  return { newPrices, newHistory };
}

// ─── BLACKJACK HELPERS ────────────────────────────────────────────────────────

const BJ_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const BJ_SUITS = ["♠","♣","♥","♦"];

type BJCard = { r: string; s: string; red: boolean };

function makeDeck(): BJCard[] {
  const d: BJCard[] = [];
  for (const r of BJ_RANKS) for (const s of BJ_SUITS) d.push({ r, s, red: s === "♥" || s === "♦" });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardVal(r: string) {
  if (r === "A") return 11;
  if (["J","Q","K"].includes(r)) return 10;
  return parseInt(r);
}

function handScore(hand: BJCard[]) {
  let s = 0, aces = 0;
  for (const c of hand) { s += cardVal(c.r); if (c.r === "A") aces++; }
  while (s > 21 && aces > 0) { s -= 10; aces--; }
  return s;
}

function isNatural(hand: BJCard[]) {
  return hand.length === 2 && handScore(hand) === 21;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Screen = "start" | "career" | "game" | "end";

type LogEntry = { turn: number; msg: string; type: string };

type Holding = { id: string; ticker: string; shares: number; avgCost: number };

type GameState = {
  turn: number;
  cash: number;
  bonds: number;
  xp: number;
  burnout: number;
  passive: number;
  properties: number;
  marketHint: boolean;
  specialised: boolean;
  prodBoost: number;
  casinoProfit: number;
  totalEarned: number;
  totalLost: number;
  careerId: string;
  log: LogEntry[];
  holdings: Holding[];
  stockPrices: Record<string, number>;
  stockHistory: Record<string, number[]>;
};

// ─── PLAYING CARD COMPONENT ───────────────────────────────────────────────────

function PlayingCard({ card, faceDown }: { card: BJCard; faceDown?: boolean }) {
  if (faceDown) {
    return (
      <div
        className="w-10 h-14 rounded-lg flex-shrink-0 shadow-lg"
        style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", border: "1px solid rgba(255,255,255,0.15)" }}
      />
    );
  }
  return (
    <div className={`w-10 h-14 rounded-lg flex-shrink-0 shadow-lg flex flex-col items-start justify-start p-1 font-black text-xs bg-white ${card.red ? "text-red-600" : "text-zinc-900"}`}>
      <div>{card.r}</div>
      <div>{card.s}</div>
    </div>
  );
}

// ─── BLACKJACK TABLE COMPONENT ────────────────────────────────────────────────

function BlackjackTable({ cash, onFinish }: { cash: number; onFinish: (newCash: number) => void }) {
  const [phase, setPhase] = useState<"bet" | "play" | "split2" | "done">("bet");
  const [deck, setDeck] = useState<BJCard[]>([]);
  const [player, setPlayer] = useState<BJCard[]>([]);
  const [dealer, setDealer] = useState<BJCard[]>([]);
  const [splitHand, setSplitHand] = useState<BJCard[] | null>(null);
  const [bet, setBet] = useState(Math.min(300, Math.floor(cash * 0.25 / 10) * 10));
  const [doubled, setDoubled] = useState(false);
  const [result, setResult] = useState<{ outcome: string; gain: number } | null>(null);
  const [splitResult, setSplitResult] = useState<{ outcome: string; gain: number } | null>(null);
  const [localCash, setLocalCash] = useState(cash);

  function runDealer(d0: BJCard[], dk: BJCard[]) {
    const nd = [...d0], ndk = [...dk];
    while (handScore(nd) < 17) nd.push(ndk.pop()!);
    return nd;
  }

  function resolveHand(p: BJCard[], d: BJCard[], b: number, dbl: boolean) {
    const ps = handScore(p), ds = handScore(d), nat = isNatural(p) && !dbl;
    if (ps > 21) return { outcome: "bust", gain: -b };
    if (ds > 21) return { outcome: "win",  gain: nat ? Math.round(b * 1.5) : b };
    if (ps > ds)  return { outcome: "win",  gain: nat ? Math.round(b * 1.5) : b };
    if (ps === ds) return { outcome: "push", gain: 0 };
    return { outcome: "lose", gain: -b };
  }

  function doResolve(p: BJCard[], d0: BJCard[], dk: BJCard[], b: number, dbl: boolean) {
    const fd = runDealer(d0, dk);
    setDealer(fd);
    setResult(resolveHand(p, fd, b, dbl));
    setPhase("done");
  }

  function deal() {
    const dk = makeDeck();
    const p = [dk.pop()!, dk.pop()!];
    const d0 = [dk.pop()!, dk.pop()!];
    setDeck(dk); setPlayer(p); setDealer(d0);
    setDoubled(false); setResult(null); setSplitResult(null); setSplitHand(null);
    setLocalCash(c => c - bet);
    if (isNatural(p)) { doResolve(p, d0, dk, bet, false); return; }
    setPhase("play");
  }

  function hit() {
    const nd = [...deck]; const np = [...player, nd.pop()!];
    setDeck(nd); setPlayer(np);
    if (handScore(np) >= 21) doResolve(np, dealer, nd, bet, doubled);
  }

  function stand() {
    if (splitHand && phase === "play") {
      setSplitResult(resolveHand(player, dealer, bet, doubled));
      const nd = [...deck]; const np = [...splitHand, nd.pop()!];
      setDeck(nd); setPlayer(np); setSplitHand(null); setPhase("split2");
    } else {
      doResolve(player, dealer, deck, bet, doubled);
    }
  }

  function doDouble() {
    if (localCash < bet) return;
    const nd = [...deck]; const np = [...player, nd.pop()!]; const nb = bet * 2;
    setLocalCash(c => c - bet); setBet(nb); setDeck(nd); setPlayer(np); setDoubled(true);
    doResolve(np, dealer, nd, nb, true);
  }

  function doSplit() {
    if (localCash < bet) return;
    setLocalCash(c => c - bet);
    const nd = [...deck]; const sp = [player[1]]; const np = [player[0], nd.pop()!];
    setDeck(nd); setPlayer(np); setSplitHand(sp);
  }

  function split2Hit() {
    const nd = [...deck]; const np = [...player, nd.pop()!];
    setDeck(nd); setPlayer(np);
    if (handScore(np) >= 21) split2Resolve(np, dealer, nd);
  }

  function split2Stand() { split2Resolve(player, dealer, deck); }

  function split2Resolve(p: BJCard[], d0: BJCard[], dk: BJCard[]) {
    const fd = runDealer(d0, dk);
    setDealer(fd); setResult(resolveHand(p, fd, bet, false)); setPhase("done");
  }

  const canSplit = player.length === 2 && cardVal(player[0]?.r) === cardVal(player[1]?.r) && localCash >= bet && !splitHand;
  const ps = handScore(player);
  const totalGain = (result?.gain ?? 0) + (splitResult?.gain ?? 0);
  const chips = [...new Set([
    Math.max(10, Math.round(cash * 0.10 / 10) * 10),
    Math.max(10, Math.round(cash * 0.25 / 10) * 10),
    Math.max(10, Math.round(cash * 0.50 / 10) * 10),
    Math.max(10, Math.round(cash / 10) * 10),
  ])].filter(v => v > 0 && v <= cash);

  const resultText = !result ? "" :
    result.outcome === "bust"  ? `Bust! -${fmt(Math.abs(result.gain))}` :
    result.outcome === "win"   ? (isNatural(player) && !doubled ? `BLACKJACK! +${fmt(result.gain)}` : `Win! +${fmt(result.gain)}`) :
    result.outcome === "push"  ? "Push — bet returned" :
    `Lost -${fmt(Math.abs(result.gain))}`;

  const resultCls = !result ? "" :
    result.outcome === "win"  ? "bg-emerald-900/60 text-emerald-300" :
    result.outcome === "push" ? "bg-zinc-800 text-white/60" :
    "bg-red-900/60 text-red-300";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h3 className="text-xl font-black">♠ Blackjack</h3>
        <span className="text-yellow-300 font-black text-sm">
          Bet: {fmt(bet)} &nbsp;|&nbsp; Cash: {fmt(localCash)}
        </span>
      </div>

      {phase === "bet" && (
        <div className="p-6">
          <p className="text-white/60 text-sm mb-4 leading-relaxed">
            Dealer stands soft 17. Blackjack pays 3:2. Double down and split available.
          </p>
          <div className="text-5xl font-black text-yellow-300 text-center mb-4">{fmt(bet)}</div>
          <input
            type="range" min={10} max={cash} step={10} value={bet}
            onChange={e => setBet(Number(e.target.value))}
            className="w-full mb-3 accent-yellow-300"
          />
          <div className="flex gap-2 flex-wrap mb-4">
            {chips.map(v => (
              <button key={v} onClick={() => setBet(v)}
                className={`px-4 py-2 rounded-2xl border font-bold text-sm transition hover:scale-105 ${bet === v ? "border-yellow-300 text-yellow-300 bg-yellow-300/10" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                {fmt(v)}
              </button>
            ))}
          </div>
          <button onClick={deal}
            className="w-full rounded-2xl bg-yellow-300 py-4 font-black text-zinc-950 text-lg transition hover:scale-105 hover:bg-yellow-200">
            Deal →
          </button>
        </div>
      )}

      {(phase === "play" || phase === "split2" || phase === "done") && (
        <>
          <div className="p-6" style={{ background: "rgba(6,78,59,0.4)" }}>
            <p className="text-xs uppercase tracking-widest text-white/30 mb-2">
              Dealer {phase === "done" ? `(${handScore(dealer)})` : "(?)"}
            </p>
            <div className="flex gap-2 flex-wrap mb-5 min-h-14">
              {dealer.map((c, i) => <PlayingCard key={i} card={c} faceDown={phase !== "done" && i > 0} />)}
            </div>
            {phase === "split2" && (
              <p className="text-xs text-purple-300 uppercase tracking-widest mb-2">↑ First hand done — playing split hand</p>
            )}
            <p className="text-xs uppercase tracking-widest text-white/30 mb-2">
              You ({ps}){ps > 21 ? " — BUST" : ps === 21 && player.length === 2 ? " — BLACKJACK" : ""}
            </p>
            <div className="flex gap-2 flex-wrap min-h-14">
              {player.map((c, i) => <PlayingCard key={i} card={c} />)}
            </div>
            {splitHand && phase === "play" && (
              <>
                <p className="text-xs uppercase tracking-widest text-purple-300 mt-4 mb-2">Split hand (plays next)</p>
                <div className="flex gap-2 flex-wrap">
                  {splitHand.map((c, i) => <PlayingCard key={i} card={c} />)}
                </div>
              </>
            )}
          </div>

          {result && (
            <div className={`px-6 py-3 text-center font-black text-lg ${resultCls}`}>
              {resultText}
              {splitResult && (
                <span className="text-sm ml-3 opacity-80">
                  | Split: {splitResult.gain >= 0 ? "+" : ""}{fmt(splitResult.gain)}
                </span>
              )}
            </div>
          )}

          {phase === "play" && (
            <div className="flex gap-3 p-4">
              <button onClick={hit}      className="flex-1 py-3 rounded-2xl bg-emerald-400 font-black text-zinc-950 transition hover:bg-emerald-300">Hit</button>
              <button onClick={stand}    className="flex-1 py-3 rounded-2xl bg-blue-500   font-black text-white    transition hover:bg-blue-400">Stand</button>
              {player.length === 2 && (
                <button onClick={doDouble} disabled={localCash < bet}
                  className="flex-1 py-3 rounded-2xl bg-yellow-400 font-black text-zinc-950 transition hover:bg-yellow-300 disabled:opacity-40">Double</button>
              )}
              {canSplit && (
                <button onClick={doSplit}
                  className="flex-1 py-3 rounded-2xl bg-purple-500 font-black text-white transition hover:bg-purple-400">Split</button>
              )}
            </div>
          )}

          {phase === "split2" && (
            <div className="flex gap-3 p-4">
              <button onClick={split2Hit}   className="flex-1 py-3 rounded-2xl bg-emerald-400 font-black text-zinc-950 transition hover:bg-emerald-300">Hit</button>
              <button onClick={split2Stand} className="flex-1 py-3 rounded-2xl bg-blue-500   font-black text-white    transition hover:bg-blue-400">Stand</button>
            </div>
          )}

          {phase === "done" && (
            <div className="p-4">
              <button onClick={() => onFinish(localCash + bet + totalGain)}
                className="w-full py-4 rounded-2xl bg-yellow-300 font-black text-zinc-950 text-lg transition hover:scale-105 hover:bg-yellow-200">
                Collect & continue →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── STOCK PANEL COMPONENT ────────────────────────────────────────────────────

function StockPanel({
  cash,
  holdings,
  prices,
  history,
  isFinance,
  onTrade,
}: {
  cash: number;
  holdings: Holding[];
  prices: Record<string, number>;
  history: Record<string, number[]>;
  isFinance: boolean;
  onTrade: (newCash: number, newHoldings: Holding[]) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [shares, setShares] = useState(1);
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  function trade() {
    if (!sel) return;
    const price = prices[sel] ?? 0;
    const newHoldings = holdings.map(h => ({ ...h }));

    if (mode === "buy") {
      const cost = Math.round(price * shares * (isFinance ? 0.5 : 1) * 100) / 100;
      if (cash < cost) return;
      const ex = newHoldings.find(h => h.id === sel);
      if (ex) {
        const ts = ex.shares + shares;
        ex.avgCost = Math.round(((ex.shares * ex.avgCost) + (shares * price)) / ts * 100) / 100;
        ex.shares = ts;
      } else {
        const def = STOCK_DEFS.find(s => s.id === sel)!;
        newHoldings.push({ id: sel, ticker: def.ticker, shares, avgCost: price });
      }
      onTrade(Math.round((cash - cost) * 100) / 100, newHoldings);
    } else {
      const ex = newHoldings.find(h => h.id === sel);
      if (!ex || ex.shares < shares) return;
      const proceeds = Math.round(price * shares * 100) / 100;
      ex.shares -= shares;
      const filtered = newHoldings.filter(h => h.shares > 0);
      onTrade(Math.round((cash + proceeds) * 100) / 100, filtered);
    }

    setSel(null);
    setShares(1);
  }

  const totalVal = holdings.reduce((sum, h) => sum + h.shares * (prices[h.id] ?? 0), 0);

  return (
    <div className="space-y-3">
      {isFinance && (
        <p className="text-xs text-emerald-300 bg-emerald-900/30 rounded-xl px-3 py-2">
          ⚡ Finance leverage: buy at 50% cost (2× exposure)
        </p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {STOCK_DEFS.map(def => {
          const price = prices[def.id] ?? def.base;
          const hist = history[def.id] ?? [price];
          const prev = hist[hist.length - 2] ?? price;
          const chgPct = prev > 0 ? ((price - prev) / prev * 100) : 0;
          const held = holdings.find(h => h.id === def.id);
          const pnl = held ? Math.round((price - held.avgCost) * held.shares * 100) / 100 : 0;
          const isSel = sel === def.id;

          return (
            <button key={def.id}
              onClick={() => { setSel(isSel ? null : def.id); setShares(1); setMode("buy"); }}
              className={`w-full text-left rounded-2xl border p-3 transition hover:scale-[1.01] ${isSel ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs w-10 text-yellow-300">{def.ticker}</span>
                  <span className="text-[10px] text-white/30 border border-white/10 rounded px-1">{def.sector}</span>
                </div>
                <div className="flex items-center gap-3">
                  {held && (
                    <span className="text-[10px] text-white/40">
                      {held.shares}sh &nbsp;
                      <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                      </span>
                    </span>
                  )}
                  <div className="text-right">
                    <div className="font-black text-sm">{fmtPrice(price)}</div>
                    <div className={`text-[10px] font-bold ${chgPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {chgPct >= 0 ? "+" : ""}{chgPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-0.5 h-4 mt-2">
                {hist.slice(-12).map((p, i, a) => {
                  const mx = Math.max(...a), mn = Math.min(...a);
                  const h = mx === mn ? 6 : Math.max(2, Math.round(((p - mn) / (mx - mn)) * 14));
                  return <div key={i} className="flex-1 rounded-sm" style={{ height: h, background: p >= (a[i - 1] ?? p) ? "#34d399" : "#f87171" }} />;
                })}
              </div>
            </button>
          );
        })}
      </div>

      {sel && (() => {
        const def = STOCK_DEFS.find(s => s.id === sel)!;
        const price = prices[sel] ?? def.base;
        const held = holdings.find(h => h.id === sel);
        const maxB = isFinance ? Math.floor(cash * 2 / price) : Math.floor(cash / price);
        const maxS = held?.shares ?? 0;
        const cost = Math.round(price * shares * (isFinance && mode === "buy" ? 0.5 : 1) * 100) / 100;

        return (
          <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-4">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode("buy")}
                className={`flex-1 py-2 rounded-xl font-black text-sm transition ${mode === "buy" ? "bg-emerald-400 text-zinc-950" : "border border-white/10 text-white/60 hover:border-white/30"}`}>
                Buy
              </button>
              <button onClick={() => setMode("sell")} disabled={!held}
                className={`flex-1 py-2 rounded-xl font-black text-sm transition disabled:opacity-30 ${mode === "sell" ? "bg-red-400 text-white" : "border border-white/10 text-white/60 hover:border-white/30"}`}>
                Sell
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setShares(Math.max(1, shares - 1))}
                className="w-8 h-8 rounded-full border border-white/10 font-black text-lg flex items-center justify-center hover:bg-white/10">−</button>
              <div className="flex-1 text-center">
                <div className="font-black text-2xl">{shares}</div>
                <div className="text-xs text-white/40">shares</div>
              </div>
              <button onClick={() => setShares(Math.min(mode === "buy" ? maxB : maxS, shares + 1))}
                className="w-8 h-8 rounded-full border border-white/10 font-black text-lg flex items-center justify-center hover:bg-white/10">+</button>
            </div>
            <div className="flex gap-2 mb-3">
              {[1, 5, 10].map(n => (
                <button key={n} onClick={() => setShares(Math.min(mode === "buy" ? maxB : maxS, n))}
                  className="flex-1 py-1 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/10">{n}</button>
              ))}
              <button onClick={() => setShares(mode === "buy" ? maxB : maxS)}
                className="flex-1 py-1 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/10">Max</button>
            </div>
            <div className="text-sm text-white/60 mb-3 text-center">
              {mode === "buy" ? `Cost: ${fmt(cost)}${isFinance ? " (leveraged)" : ""}` : `Proceeds: ${fmt(cost)}`}
            </div>
            <button onClick={trade}
              disabled={mode === "buy" ? (shares > maxB || shares < 1) : (shares > maxS || shares < 1)}
              className={`w-full py-3 rounded-2xl font-black text-sm transition hover:scale-105 disabled:opacity-30 disabled:scale-100 ${mode === "buy" ? "bg-emerald-400 text-zinc-950" : "bg-red-400 text-white"}`}>
              {mode === "buy" ? `Buy ${shares} share${shares !== 1 ? "s" : ""}` : `Sell ${shares} share${shares !== 1 ? "s" : ""}`}
            </button>
          </div>
        );
      })()}

      {totalVal > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Your Holdings</p>
          {holdings.map(h => {
            const price = prices[h.id] ?? h.avgCost;
            const pnl = Math.round((price - h.avgCost) * h.shares * 100) / 100;
            return (
              <div key={h.id} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                <span className="font-black text-yellow-300 w-10">{h.ticker}</span>
                <span className="text-white/40">{h.shares}sh @ {fmtPrice(h.avgCost)}</span>
                <span className={pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</span>
                <span className="font-black">{fmt(Math.round(price * h.shares))}</span>
              </div>
            );
          })}
          <div className="flex justify-between text-xs pt-2 font-black">
            <span className="text-white/40">Total value</span>
            <span className="text-blue-300">{fmt(Math.round(totalVal))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TheGrind() {
  const router = useRouter();
  const supabase = createClient();
  const savedRef = useRef(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("start");
  const [selCareer, setSelCareer] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selAction, setSelAction] = useState<string | null>(null);
  const [showBJ, setShowBJ] = useState(false);
  const [showStocks, setShowStocks] = useState(false);
  const [eventBanner, setEventBanner] = useState<{ type: string; icon: string; title: string; sub: string; result: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Auth check — same as WordRush
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setAuthLoading(false);
    }
    checkUser();
  }, [router, supabase]);

  // Save score — same pattern as WordRush
  useEffect(() => {
    if (screen !== "end" || !gameState) return;
    if (savedRef.current) return;
    savedRef.current = true;

    const stockVal = gameState.holdings.reduce((sum, h) => sum + h.shares * (gameState.stockPrices[h.id] ?? 0), 0);
    const score = Math.round(gameState.cash + gameState.bonds + stockVal);
    const accuracy = gameState.totalEarned > 0 ? Math.min(1, score / (gameState.totalEarned + 1)) : 0;

    saveScore({
      gameId: "the-grind",
      score,
      durationSeconds: TOTAL_TURNS * 15,
      accuracy,
      attemptNumber: 1,
    }).then(result => {
      console.log("THE GRIND SAVE RESULT:", result);
    });
  }, [screen, gameState]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [gameState?.log.length]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const career = gameState ? CAREERS.find(c => c.id === gameState.careerId)! : null;
  const tierIdx = gameState && career ? getTierIdx(career.tiers, gameState.xp) : 0;
  const tier = career ? career.tiers[tierIdx] : null;
  const bm = gameState && career ? getBurnoutMulti(career.special, tierIdx, gameState.burnout) : 1;
  const salary = tier ? Math.round(tier.income * bm) : 0;
  const mRate = gameState ? (MARKET[gameState.turn - 1] ?? 0) : 0;
  const ml = mktLabel(mRate);
  const stockVal = gameState ? gameState.holdings.reduce((sum, h) => sum + h.shares * (gameState.stockPrices[h.id] ?? 0), 0) : 0;
  const netWorth = gameState ? Math.round(gameState.cash + gameState.bonds + stockVal) : 0;
  const rentPerTurn = gameState ? gameState.properties * RENT_PER_PROPERTY : 0;
  const burnoutColor = gameState ? (gameState.burnout > 70 ? "text-red-300" : gameState.burnout > 45 ? "text-yellow-300" : "text-emerald-300") : "text-emerald-300";

  // ── Init game ───────────────────────────────────────────────────────────────

  function initGame(careerId: string): GameState {
    const c = CAREERS.find(x => x.id === careerId)!;
    const prices: Record<string, number> = {};
    const history: Record<string, number[]> = {};
    for (const s of STOCK_DEFS) { prices[s.id] = s.base; history[s.id] = [s.base]; }
    return {
      turn: 1, cash: c.startCash, bonds: 0, xp: 0, burnout: 0,
      passive: 0, properties: 0, marketHint: false,
      specialised: false, prodBoost: 1.0, casinoProfit: 0,
      totalEarned: 0, totalLost: 0, careerId,
      log: [], holdings: [], stockPrices: prices, stockHistory: history,
    };
  }

  function addLog(g: GameState, msg: string, type = ""): GameState {
    return { ...g, log: [{ turn: g.turn, msg, type }, ...g.log].slice(0, 80) };
  }

  // ── Apply market return to bonds ────────────────────────────────────────────

  function applyBondReturn(g: GameState): GameState {
    if (g.bonds <= 0) return g;
    let rate = MARKET[g.turn - 1] ?? 0;
    const noise = (Math.random() - 0.5) * 0.035;
    if (career?.special === "marketBonus" && tierIdx >= 3) rate += 0.025;
    const gain = g.bonds * (rate + noise);
    let ns = { ...g, bonds: Math.max(0, g.bonds + gain) };
    if (Math.abs(gain) > 20) {
      ns = addLog(ns, `Bonds ${gain > 0 ? "▲" : "▼"} ${fmt(Math.abs(Math.round(gain)))} (${((rate + noise) * 100).toFixed(1)}%)`, gain > 0 ? "pos" : "neg");
    }
    return ns;
  }

  // ── Advance turn ────────────────────────────────────────────────────────────

  function advanceTurn(g: GameState): GameState {
    // Tick stock prices
    const { newPrices, newHistory } = tickStocks(g.stockPrices, g.stockHistory, g.turn);
    let ns: GameState = { ...g, stockPrices: newPrices, stockHistory: newHistory };

    // Fire event
    const ev = EVENTS.find(e => e.turn === g.turn);
    if (ev) {
      if (ev.amount === -999) {
        // Special events
        if (ev.turn === 37) {
          const pct = 0.12 + Math.random() * 0.12;
          ns.bonds = Math.round(ns.bonds * (1 - pct));
          setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `-${Math.round(pct * 100)}% bonds` });
        } else if (ev.turn === 63) {
          const pct = 0.18 + Math.random() * 0.10;
          ns.bonds = Math.round(ns.bonds * (1 - pct));
          ns.cash = Math.max(0, Math.round(ns.cash * 0.88));
          setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `-${Math.round(pct * 100)}% bonds` });
        } else if (ev.turn === 25) {
          ns.marketHint = true;
          setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: "Forecast unlocked" });
        }
      } else {
        const amt = ev.amount > 0 ? ev.amount + Math.round(Math.random() * Math.abs(ev.amount) * 0.5) : ev.amount - Math.round(Math.random() * Math.abs(ev.amount) * 0.5);
        ns.cash = Math.max(0, ns.cash + amt);
        if (amt > 0) ns.totalEarned += amt; else ns.totalLost += Math.abs(amt);
        setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `${amt >= 0 ? "+" : ""}${fmt(amt)}` });
      }
    } else {
      setEventBanner(null);
    }

    // Passive income
    const passiveTotal = ns.passive + rentPerTurn;
    if (passiveTotal > 0) { ns.cash += passiveTotal; ns.totalEarned += passiveTotal; }

    // Property appreciation
    if (ns.properties > 0 && ns.turn % 5 === 0) {
      const gain = Math.round(ns.properties * 1000 * 0.03);
      ns.cash += gain;
      ns = addLog(ns, `Properties appreciated +3% (+${fmt(gain)})`, "special");
    }

    // Career specials
    if (career?.special === "caseBonus" && ns.specialised && getTierIdx(career.tiers, ns.xp) >= 3 && Math.random() < 0.15) {
      const b = Math.round(800 + Math.random() * 3700);
      ns.cash += b; ns.totalEarned += b;
      ns = addLog(ns, `Case win bonus — +${fmt(b)}`, "special");
    }
    if (career?.special === "leverage" && getTierIdx(career.tiers, ns.xp) >= 3 && Math.random() < 0.14) {
      const b = Math.round(400 + Math.random() * 1400);
      ns.cash += b; ns.totalEarned += b;
      ns = addLog(ns, `Quarterly bonus — +${fmt(b)}`, "special");
    }

    return { ...ns, turn: ns.turn + 1 };
  }

  // ── Confirm action ──────────────────────────────────────────────────────────

  function confirmAction() {
    if (!selAction || !gameState || !career) return;
    if (selAction === "casino") { setShowBJ(true); return; }
    if (selAction === "stocks") { setShowStocks(true); return; }

    let ns = applyBondReturn({ ...gameState });
    const prevTierIdx = getTierIdx(career.tiers, ns.xp);

    if (selAction === "work") {
      ns.cash += salary; ns.totalEarned += salary;
      ns.burnout = Math.min(100, ns.burnout + career.workBurnout);
      ns = addLog(ns, `${career.workName} — +${fmt(salary)}`, "pos");

    } else if (selAction === "rest") {
      const rec = Math.min(ns.burnout, 28);
      ns.burnout = Math.max(0, ns.burnout - 28);
      ns = addLog(ns, `Rested — burnout -${rec}%`);

    } else if (selAction === "bonds") {
      const amt = Math.round(ns.cash * 0.20);
      if (amt > 0) { ns.cash -= amt; ns.bonds += amt; ns = addLog(ns, `Invested ${fmt(amt)} in bonds/index`); }

    } else if (selAction === "hustle") {
      if (career.id === "finance") {
        // Prop trade
        const win = Math.random() < 0.48;
        if (win) { const g2 = Math.round(salary * (1.5 + Math.random())); ns.cash += g2; ns.totalEarned += g2; ns = addLog(ns, `Prop trade WIN — +${fmt(g2)}`, "pos"); }
        else { ns.cash = Math.max(0, ns.cash - salary); ns.totalLost += salary; ns = addLog(ns, `Prop trade LOSS — -${fmt(salary)}`, "neg"); }
      } else if (career.id === "realestate") {
        // Dev project
        if (ns.cash >= 1500) { ns.cash -= 1500; const gain = 2500 + Math.round(Math.random() * 4000); ns.cash += gain; ns.totalEarned += (gain - 1500); ns = addLog(ns, `Dev project — +${fmt(gain - 1500)} profit`, "pos"); }
      } else {
        const inc = Math.round(salary * career.hustleMulti * ns.prodBoost);
        ns.cash += inc; ns.totalEarned += inc;
        ns = addLog(ns, `${career.hustleName} — +${fmt(inc)}`, "pos");
      }
      ns.burnout = Math.min(100, ns.burnout + career.hustleBurnout);

    } else {
      // Study actions
      const sa = career.studyActions.find(a => a.id === selAction);
      if (sa) {
        // Handle specific study action effects
        if (sa.id === "oss" && Math.random() < 0.25) {
          const b = 300 + Math.round(Math.random() * 500); ns.cash += b; ns.totalEarned += b;
          ns = addLog(ns, `Recruiter spotted OSS work — +${fmt(b)}`, "special");
        } else if (sa.id === "net" && Math.random() < 0.20) {
          const b = 400 + Math.round(Math.random() * 900); ns.cash += b; ns.totalEarned += b;
          ns = addLog(ns, `Deal closed at network event — +${fmt(b)}`, "special");
        } else if (sa.id === "aud") {
          ns.passive += 100;
          ns = addLog(ns, `Audience built — passive now $${ns.passive}/mo`, "special");
        } else if (sa.id === "prod") {
          ns.prodBoost += 0.20;
          ns = addLog(ns, `Production mastered — hustle ×${ns.prodBoost.toFixed(2)}`, "special");
        } else if (sa.id === "col") {
          if (Math.random() < 0.40) { const g2 = 1000 + Math.round(Math.random() * 3000); ns.cash += g2; ns.totalEarned += g2; ns = addLog(ns, `Collab went VIRAL — +${fmt(g2)}`, "special"); }
          else ns = addLog(ns, `Collab flopped. No gain.`);
        } else if (sa.id === "moonlight") {
          const inc = Math.round(salary * 0.80); ns.cash += inc; ns.totalEarned += inc;
          ns = addLog(ns, `Moonlight shift — +${fmt(inc)}`, "pos");
        } else if (sa.id === "research" && Math.random() < 0.30) {
          const b = 800 + Math.round(Math.random() * 1200); ns.cash += b; ns.totalEarned += b;
          ns = addLog(ns, `Research grant — +${fmt(b)}`, "special");
        } else if (sa.id === "buyprop") {
          if (ns.cash >= 1000) { ns.cash -= 1000; ns.properties++; ns = addLog(ns, `Bought property #${ns.properties} — +$150/mo rent`, "special"); }
          else ns = addLog(ns, `Need $1000 to buy property.`);
        } else if (sa.id === "flip") {
          if (ns.cash >= 700) {
            ns.cash -= 700;
            if (Math.random() < 0.5) { const g2 = 1200 + Math.round(Math.random() * 1800); ns.cash += g2; ns.totalEarned += g2; ns = addLog(ns, `House flip SUCCESS — +${fmt(g2)}`, "pos"); }
            else { ns.totalLost += 700; ns = addLog(ns, `House flip FAILED — -$700`, "neg"); }
          } else ns = addLog(ns, `Need $700 to flip a house.`);
        } else if (sa.id === "spec") {
          ns.specialised = true;
          ns = addLog(ns, `Specialised — case bonuses now active`, "special");
        } else if (sa.id === "probono" && Math.random() < 0.30) {
          const b = 1000 + Math.round(Math.random() * 2500); ns.cash += b; ns.totalEarned += b;
          ns = addLog(ns, `Landmark case won — +${fmt(b)}`, "special");
        } else {
          ns = addLog(ns, `${sa.name} — studying`);
        }

        ns.xp = Math.round((ns.xp + sa.xp) * 10) / 10;
        ns.burnout = Math.min(100, ns.burnout + sa.burnout);
      }
    }

    // Promotion check
    const newTierIdx = getTierIdx(career.tiers, ns.xp);
    if (newTierIdx > prevTierIdx) {
      const nt = career.tiers[newTierIdx];
      ns = addLog(ns, `🎉 PROMOTED: ${nt.name}! Salary: ${fmt(nt.income)}/mo`, "special");
      setEventBanner({ type: "good", icon: "⭐", title: "Promotion!", sub: `You are now a ${nt.name}.`, result: `Salary: ${fmt(nt.income)}/mo` });
    }

    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setGameState(ns);
    setSelAction(null);
    setShowBJ(false);
    setShowStocks(false);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleBJFinish(newCash: number) {
    if (!gameState) return;
    const profit = newCash - gameState.cash;
    let ns: GameState = { ...gameState, cash: newCash, casinoProfit: gameState.casinoProfit + profit };
    if (profit > 0) { ns.totalEarned += profit; ns = addLog(ns, `Casino — Won ${fmt(profit)}`, "pos"); }
    else if (profit < 0) { ns.totalLost += Math.abs(profit); ns = addLog(ns, `Casino — Lost ${fmt(Math.abs(profit))}`, "neg"); }
    else ns = addLog(ns, `Casino — Push, bet returned`);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setGameState(ns);
    setShowBJ(false);
    setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleStockTrade(newCash: number, newHoldings: Holding[]) {
    if (!gameState) return;
    setGameState({ ...gameState, cash: newCash, holdings: newHoldings });
  }

  function finishStockTurn() {
    if (!gameState) return;
    let ns = applyBondReturn({ ...gameState });
    ns = addLog(ns, `Stock market: reviewed positions`);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setGameState(ns);
    setShowStocks(false);
    setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function startGame() {
    if (!selCareer) return;
    savedRef.current = false;
    setGameState(initGame(selCareer));
    setSelAction(null);
    setShowBJ(false);
    setShowStocks(false);
    setEventBanner(null);
    setScreen("game");
  }

  function fullReset() {
    setSelCareer(null);
    setGameState(null);
    setSelAction(null);
    setShowBJ(false);
    setShowStocks(false);
    setEventBanner(null);
    setScreen("start");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Checking login...
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // START SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
              <h1 className="text-5xl font-black">
                The <span className="text-yellow-300">Grind</span>
              </h1>
              <p className="mt-3 max-w-xl text-white/60">
                80 months. One shot. Build a career, pick stocks, time the bond market, survive the casino floor. Your net worth is your score.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black text-white transition hover:scale-105 hover:bg-white/15">
                Menu
              </Link>
              <button onClick={() => setScreen("career")}
                className="rounded-2xl bg-yellow-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">
                Choose Career →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[["80","Months"],["6","Careers"],["8","Stocks"],["1×","Attempt"]].map(([n, l]) => (
              <div key={l} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur">
                <p className="text-3xl font-black text-yellow-300">{n}</p>
                <p className="text-xs uppercase tracking-widest text-white/40 mt-1">{l}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-black mb-4">How it works</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["💼 Work",     "Earn salary. Income scales with career tier and XP."],
                ["📚 Study",    "3 unique study actions per career. Gain XP to unlock tiers."],
                ["📊 Stocks",   "Buy & sell 8 individual stocks with price histories."],
                ["💰 Bonds",    "Safe index fund. Auto-compounds with market cycle."],
                ["♠ Casino",   "Full blackjack — hit, stand, double, split. 3:2 naturals."],
                ["😴 Rest",     "High burnout tanks income. Rest recovers 28% per turn."],
              ].map(([t, d]) => (
                <div key={t as string} className="rounded-2xl bg-black/30 p-4">
                  <p className="font-black mb-1">{t}</p>
                  <p className="text-sm text-white/60">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CAREER PICK
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === "career") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
              <h1 className="text-4xl font-black">Choose Your Career</h1>
              <p className="mt-2 text-white/60">Each path has unique income, study actions, and a special ability. Permanent choice.</p>
            </div>
            <button onClick={() => setScreen("start")}
              className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:scale-105 hover:bg-white/15">
              ← Back
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {CAREERS.map(c => (
              <button key={c.id} onClick={() => setSelCareer(c.id)}
                className={`rounded-3xl border p-5 text-left transition hover:scale-[1.02] relative ${selCareer === c.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-white/5 hover:bg-white/10"} backdrop-blur`}>
                {selCareer === c.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-300 flex items-center justify-center text-zinc-950 font-black text-xs">✓</div>
                )}
                <div className="text-3xl mb-2">{c.icon}</div>
                <h3 className={`font-black text-lg mb-1 ${c.color}`}>{c.name}</h3>
                <p className="text-sm text-white/60 mb-3 leading-relaxed">{c.tagline}</p>
                <div className="space-y-1">
                  {c.perks.map((p, i) => <p key={i} className="text-xs text-yellow-300">✦ {p}</p>)}
                </div>
              </button>
            ))}
          </div>

          {selCareer && (() => {
            const sc = CAREERS.find(c => c.id === selCareer)!;
            return (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur mb-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Career Ladder</h3>
                    {sc.tiers.map((t, i) => (
                      <div key={i} className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className={i === 0 ? "text-white/60" : "text-white/30"}>{t.name}</span>
                        <span className="text-yellow-300 font-black">{fmt(t.income)}/mo</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Unique Study Actions</h3>
                    {sc.studyActions.map(sa => (
                      <div key={sa.id} className="py-2 border-b border-white/5">
                        <p className="font-bold text-sm">{sa.icon} {sa.name}</p>
                        <p className="text-xs text-white/50">{sa.desc} · +{sa.xp} XP · +{sa.burnout}% burnout</p>
                      </div>
                    ))}
                    <div className="mt-3 rounded-xl bg-yellow-300/10 border border-yellow-300/20 p-3">
                      <p className="text-xs text-yellow-300 font-black">✦ {sc.specialDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <button onClick={startGame} disabled={!selCareer}
            className="w-full rounded-2xl bg-yellow-300 py-5 font-black text-zinc-950 text-xl transition hover:scale-105 hover:bg-yellow-200 disabled:scale-100 disabled:opacity-40">
            {selCareer ? `Begin as ${CAREERS.find(c => c.id === selCareer)?.name} →` : "Select a career to begin"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GAME SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === "game" && gameState && career) {
    const hustleUnlocked = gameState.xp >= career.hustleXpReq;

    const actionList = [
      { id: "work",   icon: career.icon,  name: career.workName,    desc: `+${fmt(salary)} income`,                            badge: "Safe",      badgeCls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", disabled: false },
      ...career.studyActions.map(sa => ({
        id: sa.id, icon: sa.icon, name: sa.name, desc: sa.desc,
        badge: "+XP", badgeCls: "bg-blue-900/60 text-blue-300 border-blue-700",
        disabled: (sa.id === "buyprop" && gameState.cash < 1000) || (sa.id === "flip" && gameState.cash < 700),
      })),
      { id: "bonds",  icon: "💰", name: "Bonds / Index",  desc: `Invest 20% (${fmt(Math.round(gameState.cash * 0.2))}) safely`, badge: "Stable",   badgeCls: "bg-indigo-900/60 text-indigo-300 border-indigo-700", disabled: gameState.cash < 100 },
      { id: "stocks", icon: "📊", name: "Stock Market",   desc: "Buy & sell 8 individual stocks",                              badge: "Variable",  badgeCls: "bg-yellow-900/60 text-yellow-300 border-yellow-700", disabled: false },
      { id: "casino", icon: "♠️", name: "Casino",         desc: "Play blackjack — hit, stand, double, split",                  badge: "High Risk", badgeCls: "bg-red-900/60 text-red-300 border-red-700",          disabled: gameState.cash < 20 },
      { id: "rest",   icon: "😴", name: "Rest",           desc: `-${Math.min(gameState.burnout, 28)}% burnout`,               badge: "Recovery",  badgeCls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", disabled: false },
      { id: "hustle", icon: "🚀", name: career.hustleName, desc: hustleUnlocked ? `+${fmt(Math.round(salary * career.hustleMulti * gameState.prodBoost))} income` : `Needs ${career.hustleXpReq} XP`, badge: hustleUnlocked ? "High Reward" : "Locked", badgeCls: hustleUnlocked ? "bg-yellow-900/60 text-yellow-300 border-yellow-700" : "bg-zinc-800 text-white/30 border-zinc-700", disabled: !hustleUnlocked },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">

          {/* Header */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
              <h1 className="text-3xl font-black">The <span className="text-yellow-300">Grind</span></h1>
            </div>
            <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-black transition hover:scale-105 hover:bg-white/15 text-sm w-fit">
              Menu
            </Link>
          </div>

          {/* HUD */}
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6 mb-4">
            {[
              { label: "Net Worth", value: fmt(netWorth),             color: "text-yellow-300" },
              { label: "Cash",      value: fmt(gameState.cash),       color: "text-white"      },
              { label: "Bonds",     value: fmt(gameState.bonds),      color: "text-indigo-300" },
              { label: "Stocks",    value: fmt(stockVal),             color: "text-blue-300"   },
              { label: "Salary/mo", value: fmt(salary),               color: "text-emerald-300"},
              { label: "Month",     value: `${gameState.turn}/${TOTAL_TURNS}`, color: "text-white" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-1">{label}</p>
                <p className={`text-base font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-black text-yellow-300">{getPhase(gameState.turn)}</span>
              <span className="text-white/40">{tier?.name} · {career.name}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full transition-all duration-500"
                style={{ width: `${(gameState.turn / TOTAL_TURNS) * 100}%` }} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">

              {/* Event banner */}
              {eventBanner && (
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  eventBanner.type === "good"    ? "border-emerald-500/30 bg-emerald-900/30 text-emerald-300" :
                  eventBanner.type === "bad"     ? "border-red-500/30 bg-red-900/30 text-red-300" :
                  "border-blue-500/30 bg-blue-900/30 text-blue-300"
                }`}>
                  <span className="text-2xl">{eventBanner.icon}</span>
                  <div>
                    <p className="font-black">{eventBanner.title}</p>
                    <p className="text-sm opacity-80">{eventBanner.sub} {eventBanner.result && `(${eventBanner.result})`}</p>
                  </div>
                </div>
              )}

              {/* Action grid */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-2xl">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-4">This Month&apos;s Action</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {actionList.map(a => (
                    <button key={a.id}
                      onClick={() => !a.disabled && setSelAction(a.id)}
                      disabled={a.disabled}
                      className={`rounded-2xl border p-3 text-left transition relative ${
                        selAction === a.id
                          ? "border-yellow-300 bg-yellow-300/10"
                          : "border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20"
                      } disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02]`}>
                      {selAction === a.id && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-300 rounded-t-2xl" />
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${a.badgeCls}`}>
                          {a.badge}
                        </span>
                      </div>
                      <div className="text-xl mb-2">{a.icon}</div>
                      <p className="font-black text-xs mb-1">{a.name}</p>
                      <p className="text-[10px] text-white/50 leading-relaxed">{a.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Bonds panel */}
                {selAction === "bonds" && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <h3 className="font-black mb-2">Bonds & Index Funds</h3>
                    <p className="text-sm text-white/60 mb-3">
                      Invest 20% of cash ({fmt(Math.round(gameState.cash * 0.20))}) into a diversified bond portfolio. Returns auto-compound with the market cycle.
                    </p>
                    <div className="flex items-center gap-3 text-sm mb-2">
                      <span className="text-white/40">Current trend:</span>
                      <span className={`font-black ${ml.color}`}>{ml.text} ({mRate >= 0 ? "+" : ""}{Math.round(mRate * 100)}%)</span>
                    </div>
                    {gameState.marketHint && gameState.turn < TOTAL_TURNS && (
                      <div className="rounded-xl bg-black/40 p-3 mb-2">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Insider forecast</p>
                        {Array.from({ length: 5 }, (_, i) => i + 1).map(i => {
                          const fr = MARKET[gameState.turn + i - 1] ?? 0;
                          const fl = mktLabel(fr);
                          return (
                            <div key={i} className="flex justify-between text-xs mb-1">
                              <span className="text-white/40">Month +{i}</span>
                              <span className={fl.color}>{fr >= 0 ? "▲" : "▼"} {Math.abs(Math.round(fr * 100))}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {career.special === "marketBonus" && tierIdx >= 3 && (
                      <p className="text-xs text-yellow-300">✦ Engineer bonus: +2.5% extra return active</p>
                    )}
                    {gameState.bonds > 0 && (
                      <p className="text-xs text-white/40 mt-1">Current bond portfolio: {fmt(gameState.bonds)}</p>
                    )}
                  </div>
                )}

                {/* Stock panel */}
                {selAction === "stocks" && showStocks && (
                  <div className="mt-4">
                    <StockPanel
                      cash={gameState.cash}
                      holdings={gameState.holdings}
                      prices={gameState.stockPrices}
                      history={gameState.stockHistory}
                      isFinance={career.special === "leverage"}
                      onTrade={handleStockTrade}
                    />
                    <button onClick={finishStockTurn}
                      className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 text-base transition hover:scale-105 hover:bg-yellow-200">
                      Done trading — end month →
                    </button>
                  </div>
                )}

                {/* Blackjack */}
                {selAction === "casino" && showBJ && (
                  <div className="mt-4">
                    <BlackjackTable cash={gameState.cash} onFinish={handleBJFinish} />
                  </div>
                )}

                {/* Confirm button */}
                {!showBJ && !showStocks && (
                  <button
                    onClick={
                      selAction === "casino" ? () => setShowBJ(true) :
                      selAction === "stocks"  ? () => setShowStocks(true) :
                      confirmAction
                    }
                    disabled={!selAction}
                    className="w-full mt-4 rounded-2xl bg-yellow-300 py-4 font-black text-zinc-950 text-lg transition hover:scale-105 hover:bg-yellow-200 disabled:scale-100 disabled:opacity-30">
                    {selAction
                      ? selAction === "casino" ? "Go to casino →"
                      : selAction === "stocks"  ? "Open stock market →"
                      : "Confirm action →"
                      : "Choose an action above"}
                  </button>
                )}
              </section>

              {/* Log */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest">Activity Log</h2>
                  <span className="text-xs text-white/20">{gameState.log.length} entries</span>
                </div>
                <div ref={logRef} className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {gameState.log.length === 0 && <p className="text-white/30 text-sm">No activity yet.</p>}
                  {gameState.log.slice(0, 14).map((e, i) => (
                    <div key={i} className={`flex gap-2 text-xs py-1 border-b border-white/5 ${
                      e.type === "pos"     ? "text-emerald-300" :
                      e.type === "neg"     ? "text-red-300"     :
                      e.type === "special" ? "text-yellow-300"  :
                      "text-white/50"}`}>
                      <span className="text-white/20 flex-shrink-0">T{e.turn}</span>
                      {e.msg}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="flex flex-col gap-4">

              {/* Stats */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-4">Stats</h2>
                {[
                  { label: "Job",    value: tier?.name ?? "", color: "text-blue-300"    },
                  { label: "XP",     value: gameState.xp.toFixed(1) + " XP", color: "text-white" },
                  ...(gameState.passive > 0 || gameState.properties > 0 ? [{ label: "Passive/mo", value: fmt(gameState.passive + rentPerTurn), color: "text-emerald-300" }] : []),
                  ...(gameState.properties > 0 ? [{ label: "Properties", value: String(gameState.properties) + " owned", color: "text-white" }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-baseline mb-3">
                    <span className="text-xs uppercase tracking-widest text-white/30">{label}</span>
                    <span className={`font-black text-sm ${color}`}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs uppercase tracking-widest text-white/30">Burnout</span>
                  <span className={`font-black text-sm ${burnoutColor}`}>{Math.round(gameState.burnout)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${gameState.burnout > 70 ? "bg-red-400" : gameState.burnout > 45 ? "bg-yellow-300" : "bg-emerald-400"}`}
                    style={{ width: `${gameState.burnout}%` }} />
                </div>
                {gameState.burnout > 45 && (
                  <p className="text-xs text-yellow-300 mt-2">⚠ -{Math.round((1 - bm) * 100)}% income penalty</p>
                )}
              </div>

              {/* Market */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Market</h2>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-black text-sm ${ml.color}`}>{ml.text}</span>
                  <span className={`font-black text-sm ${ml.color}`}>{mRate >= 0 ? "+" : ""}{Math.round(mRate * 100)}%</span>
                </div>
                <div className="flex items-end gap-0.5 h-8 mb-2">
                  {Array.from({ length: 10 }, (_, i) => gameState.turn - 10 + i)
                    .filter(t => t >= 1 && t <= TOTAL_TURNS)
                    .map(t => {
                      const r = MARKET[t - 1] ?? 0;
                      const h = Math.max(3, Math.round(Math.abs(r) * 160));
                      return <div key={t} className="flex-1 rounded-sm" style={{ height: h, background: r >= 0 ? "#34d399" : "#f87171" }} />;
                    })}
                </div>
                {gameState.marketHint && gameState.turn < TOTAL_TURNS && (
                  <p className="text-xs text-yellow-300">Insider: next {mktLabel(MARKET[gameState.turn] ?? 0).text}</p>
                )}
                {gameState.bonds > 0 && <p className="text-xs text-white/40 mt-1">Bonds: {fmt(gameState.bonds)}</p>}
                {stockVal > 0 && <p className="text-xs text-blue-300 mt-0.5">Stocks: {fmt(Math.round(stockVal))}</p>}
              </div>

              {/* Career path */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Career Path</h2>
                {career.tiers.map((t, i) => {
                  const done = i < tierIdx, active = i === tierIdx, next = i === tierIdx + 1;
                  return (
                    <div key={i} className={`flex items-center gap-2 py-1.5 border-b border-white/5 text-xs ${active ? "text-white" : done ? "text-white/40" : "text-white/15"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-yellow-300" : done ? "bg-emerald-500" : "bg-white/10"}`} />
                      <span className={`flex-1 ${active ? "font-black" : ""}`}>{t.name}</span>
                      {active && <span className="text-yellow-300">now</span>}
                      {next && <span className="text-white/30">{(t.req - gameState.xp).toFixed(1)} XP</span>}
                    </div>
                  );
                })}
              </div>

              {/* Holdings summary */}
              {gameState.holdings.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Holdings</h2>
                  {gameState.holdings.map(h => {
                    const price = gameState.stockPrices[h.id] ?? h.avgCost;
                    const pnl = Math.round((price - h.avgCost) * h.shares * 100) / 100;
                    return (
                      <div key={h.id} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                        <span className="font-black text-yellow-300 w-10">{h.ticker}</span>
                        <span className="text-white/40">{h.shares}sh</span>
                        <span className={pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-xs pt-2 font-black">
                    <span className="text-white/40">Total</span>
                    <span className="text-blue-300">{fmt(Math.round(stockVal))}</span>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // END SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === "end" && gameState && career) {
    const finalStockVal = gameState.holdings.reduce((sum, h) => sum + h.shares * (gameState.stockPrices[h.id] ?? 0), 0);
    const score = Math.round(gameState.cash + gameState.bonds + finalStockVal);
    const finalTierIdx = getTierIdx(career.tiers, gameState.xp);
    const all = [...LEADERBOARD, { name: "You", score }].sort((a, b) => b.score - a.score);
    const rank = all.findIndex(p => p.name === "You") + 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event — Complete</p>
              <h1 className="text-5xl font-black text-yellow-300">{fmt(score)}</h1>
              <p className="mt-2 text-white/60">
                {career.tiers[finalTierIdx].name} · {career.name} · 80-month career
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:scale-105 hover:bg-white/15">
                Menu
              </Link>
              <button onClick={fullReset}
                className="rounded-2xl bg-yellow-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">
                Play Again
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 mb-6">
            {[
              ["Peak Title",     career.tiers[finalTierIdx].name],
              ["Skill XP",       gameState.xp.toFixed(1) + " XP"],
              ["Bond Portfolio", fmt(gameState.bonds)],
              ["Stock Portfolio",fmt(finalStockVal)],
              ["Casino P/L",     (gameState.casinoProfit >= 0 ? "+" : "") + fmt(gameState.casinoProfit)],
              ["Properties",     String(gameState.properties) + " owned"],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-1">{l}</p>
                <p className="text-lg font-black">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl mb-6">
            <h2 className="text-2xl font-black mb-4">How you built your wealth</h2>
            {[
              ["Salary & wages",   gameState.totalEarned - Math.max(0, gameState.casinoProfit), true ],
              ["Casino net",       gameState.casinoProfit,                                      gameState.casinoProfit >= 0],
              ["Bond portfolio",   Math.round(gameState.bonds),                                 true ],
              ["Stock portfolio",  Math.round(finalStockVal),                                   true ],
              ["Total losses",     -gameState.totalLost,                                        false],
            ].map(([l, v, pos]) => (
              <div key={l as string} className="flex justify-between py-2 border-b border-white/10 text-sm">
                <span className="text-white/60">{l}</span>
                <span className={`font-black ${(v as number) >= 0 && pos ? "text-emerald-300" : "text-red-300"}`}>
                  {(v as number) >= 0 ? "+" : ""}{fmt(Math.abs(v as number))}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black">Leaderboard</h2>
              <span className="rounded-full bg-yellow-300/20 px-3 py-1 text-sm font-black text-yellow-300">
                Rank #{rank}
              </span>
            </div>
            <div className="space-y-2">
              {all.map((p, i) => (
                <div key={p.name} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${p.name === "You" ? "bg-yellow-300/10 border border-yellow-300/30" : "bg-black/25"}`}>
                  <span className={`font-black w-8 text-sm ${i === 0 ? "text-yellow-300" : i === 1 ? "text-white/60" : i === 2 ? "text-amber-600" : "text-white/30"}`}>
                    #{i + 1}
                  </span>
                  <span className={`flex-1 font-bold ${p.name === "You" ? "text-yellow-300" : "text-white/60"}`}>
                    {p.name === "You" ? "⭐ You" : p.name}
                  </span>
                  <span className="font-black">{fmt(p.score)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}