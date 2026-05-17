"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveScore } from "@/lib/saveScore";

const TOTAL_TURNS = 80;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Screen = "start" | "career" | "game" | "end";
type LogEntry = { turn: number; msg: string; type: string };
type Holding = { id: string; ticker: string; shares: number; avgCost: number };
type Property = { id: string; address: string; type: "starter" | "mid" | "luxury" | "commercial"; purchasePrice: number; currentValue: number; rentPerTurn: number; isFlipping: boolean; flipTurnsLeft: number };
type Business = { id: string; careerId: string; name: string; level: number; incomePerTurn: number; upgradeCost: number };

type GameState = {
  turn: number; cash: number; bonds: number; xp: number; burnout: number;
  passive: number; marketHint: boolean; specialised: boolean; prodBoost: number;
  casinoProfit: number; totalEarned: number; totalLost: number; careerId: string;
  log: LogEntry[]; holdings: Holding[]; stockPrices: Record<string, number>;
  stockHistory: Record<string, number[]>; properties: Property[];
  businesses: Business[]; patentTurnsLeft: number; patentIncome: number;
  sponsorshipTurnsLeft: number; sponsorshipIncome: number;
  shortTermRentalTurnsLeft: number; shortTermRentalIncome: number;
  pharmaPassive: number; hospitalPassive: number;
  followers: number; caseWins: number;
};

// ─── CAREERS ─────────────────────────────────────────────────────────────────
const CAREERS = [
  {
    id: "tech", icon: "💻", name: "Software Engineer", color: "text-blue-300",
    tagline: "High ceiling, slow start. Study hard, compound gains.",
    startCash: 600, special: "marketBonus",
    specialDesc: "Senior+ get +2.5% on all bond returns.",
    perks: ["Senior+: +2.5% bond returns", "Open source recruiter bonuses", "SaaS business unlocks at Senior"],
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
      { id: "cs",    icon: "📚", name: "Study CS",          desc: "+1.0 XP. Core algorithms, low burnout.",   xp: 1.0, burnout: 5  },
      { id: "sys",   icon: "🏗️", name: "System Design",     desc: "+1.7 XP. Architect at scale.",             xp: 1.7, burnout: 9  },
      { id: "oss",   icon: "🌐", name: "Open Source",       desc: "+0.6 XP. 25% chance recruiter bonus.",     xp: 0.6, burnout: 3  },
      { id: "ai",    icon: "🤖", name: "AI/ML Specialise",  desc: "+2.0 XP. Very high burnout.",              xp: 2.0, burnout: 12 },
      { id: "cert",  icon: "🎓", name: "Get Certified",     desc: "+0.8 XP. 40% chance $500 bonus.",          xp: 0.8, burnout: 4  },
    ],
    workName: "Ship Features", workBurnout: 8,
    hustleName: "Freelance Gig", hustleBurnout: 20, hustleMulti: 1.9, hustleXpReq: 6,
    businessName: "SaaS Product", businessBase: 250, businessUpgradeCost: 2000, businessUnlockTier: 3,
    uniqueActions: [
      { id: "ipo",    icon: "🚀", name: "IPO Planning",   desc: "Costs $2000. 60% chance +$6000–18000.", cost: 2000, xp: 0.5 },
      { id: "patent", icon: "⚡", name: "File a Patent",  desc: "Costs $800. +$300/turn for 6 turns.",   cost: 800,  xp: 0.3 },
      { id: "acqui",  icon: "🏢", name: "Acqui-hire",     desc: "+1.5 XP. 30% chance of $3000 bonus.",  cost: 0,    xp: 1.5 },
    ],
  },
  {
    id: "finance", icon: "📈", name: "Finance & Trading", color: "text-emerald-300",
    tagline: "Lives by the market. Highest ceiling if you time it right.",
    startCash: 700, special: "leverage",
    specialDesc: "Buy stocks at 50% cost (2x leverage).",
    perks: ["2x stock leverage", "Quarterly bonus events", "Hedge fund business"],
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
      { id: "cfa",    icon: "📊", name: "CFA Studies",     desc: "+1.2 XP. Finance credential.",          xp: 1.2, burnout: 7  },
      { id: "quant",  icon: "🧮", name: "Quant Methods",   desc: "+2.0 XP. Very high burnout.",           xp: 2.0, burnout: 13 },
      { id: "net",    icon: "🤝", name: "Network",         desc: "+0.5 XP. 20% chance deal $400–1300.",   xp: 0.5, burnout: 3  },
      { id: "hedge",  icon: "🏦", name: "Hedge Strategy",  desc: "+1.5 XP. 30% chance $1000 bonus.",      xp: 1.5, burnout: 8  },
      { id: "crypto", icon: "🪙", name: "Crypto Trading",  desc: "+0.7 XP. 50% chance ±$2500.",           xp: 0.7, burnout: 5  },
    ],
    workName: "Analyze & Trade", workBurnout: 9,
    hustleName: "Prop Trade", hustleBurnout: 6, hustleMulti: 0, hustleXpReq: 5,
    businessName: "Investment Fund", businessBase: 400, businessUpgradeCost: 2500, businessUnlockTier: 2,
    uniqueActions: [
      { id: "short",   icon: "📉", name: "Short a Stock",    desc: "Costs $1000. 45% +$3500. 55% lose bet.", cost: 1000, xp: 0.3 },
      { id: "merger",  icon: "🤝", name: "M&A Advisory",     desc: "Costs $500. Guaranteed $800–2500.",       cost: 500,  xp: 0.4 },
      { id: "options", icon: "📋", name: "Options Strategy", desc: "+1.0 XP. 40% chance 3× your bet.",       cost: 0,    xp: 1.0 },
    ],
  },
  {
    id: "creative", icon: "🎨", name: "Creative Entrepreneur", color: "text-pink-300",
    tagline: "Feast or famine. Build an audience — money flows to you.",
    startCash: 450, special: "passive",
    specialDesc: "Each 'Build Audience' adds $100/mo passive income forever.",
    perks: ["Passive income stacks permanently", "Viral collab events", "Media studio business"],
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
      { id: "aud",     icon: "📣", name: "Build Audience",   desc: "+0.8 XP. +$100/mo passive forever.",   xp: 0.8, burnout: 4  },
      { id: "prod",    icon: "🎬", name: "Learn Production", desc: "+1.1 XP. +20% hustle income forever.", xp: 1.1, burnout: 6  },
      { id: "col",     icon: "🎭", name: "Brand Collab",     desc: "+0.7 XP. 40% viral $1000–4000.",       xp: 0.7, burnout: 5  },
      { id: "merch",   icon: "👕", name: "Launch Merch",     desc: "+0.5 XP. Costs $400. +$200/turn.",     xp: 0.5, burnout: 3  },
      { id: "course",  icon: "📖", name: "Sell a Course",    desc: "+0.9 XP. Costs $200. 70% $800–3000.",  xp: 0.9, burnout: 6  },
    ],
    workName: "Client Projects", workBurnout: 6,
    hustleName: "Launch a Product", hustleBurnout: 14, hustleMulti: 2.5, hustleXpReq: 5,
    businessName: "Media Studio", businessBase: 200, businessUpgradeCost: 1500, businessUnlockTier: 2,
    uniqueActions: [
      { id: "viral",       icon: "🔥", name: "Go Viral",         desc: "50% chance +$4000–10000 windfall.",   cost: 0,   xp: 0.3 },
      { id: "sponsorship", icon: "💰", name: "Sponsorship Deal", desc: "+$400–1200/turn for 4 turns.",        cost: 0,   xp: 0.4 },
      { id: "nft",         icon: "🖼️", name: "Launch NFT Drop",  desc: "Costs $300. 35% chance +$5000.",      cost: 300, xp: 0.5 },
    ],
  },
  {
    id: "medicine", icon: "🩺", name: "Medicine", color: "text-red-300",
    tagline: "Zero income for years. Brutal grind. Astronomical endgame.",
    startCash: 200, special: "burnoutImmunity",
    specialDesc: "Fellow+ rank: burnout penalties halved.",
    perks: ["Burnout halved at Fellow+", "Research grants", "Private clinic business"],
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
      { id: "medstudy",  icon: "🧬", name: "Medical Studies",   desc: "+1.4 XP. Required to advance.",         xp: 1.4, burnout: 9  },
      { id: "research",  icon: "🔬", name: "Publish Research",  desc: "+2.0 XP. 30% chance $800–2000 grant.",  xp: 2.0, burnout: 6  },
      { id: "moonlight", icon: "🌙", name: "Moonlight Shift",   desc: "+0 XP. 80% salary extra. +17% burnout.", xp: 0,   burnout: 17 },
      { id: "surgery",   icon: "🔪", name: "Surgical Training", desc: "+1.8 XP. 20% chance +$1500 bonus.",     xp: 1.8, burnout: 10 },
      { id: "pharma",    icon: "💊", name: "Pharma Partnership",desc: "+0.5 XP. One-time: $2000 + passive.",   xp: 0.5, burnout: 3  },
    ],
    workName: "See Patients", workBurnout: 10,
    hustleName: "Pharma Consult", hustleBurnout: 8, hustleMulti: 1.7, hustleXpReq: 17,
    businessName: "Private Clinic", businessBase: 350, businessUpgradeCost: 3000, businessUnlockTier: 4,
    uniqueActions: [
      { id: "trial",    icon: "🧪", name: "Clinical Trial",   desc: "Costs $1000. 70% chance $5000–12000.",  cost: 1000, xp: 0.5 },
      { id: "hospital", icon: "🏥", name: "Hospital Equity",  desc: "Costs $3000. +$600/turn forever.",       cost: 3000, xp: 0.3 },
      { id: "patent2",  icon: "💡", name: "Medical Patent",   desc: "Costs $600. +$250/turn for 8 turns.",   cost: 600,  xp: 0.4 },
    ],
  },
  {
    id: "realestate", icon: "🏠", name: "Real Estate", color: "text-yellow-300",
    tagline: "Buy properties. Rent compounds forever. Mortgage your way up.",
    startCash: 700, special: "rent",
    specialDesc: "Properties appreciate 3% every 5 months. Flip for big profits.",
    perks: ["$150/mo rent per property", "3% appreciation every 5 months", "Property management business"],
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
      { id: "license", icon: "📋", name: "Get Licensed",    desc: "+1.1 XP. Tier unlock credential.",       xp: 1.1, burnout: 5  },
      { id: "reit",    icon: "📊", name: "Buy a REIT",      desc: "+0.6 XP. Costs $600. +$120/turn.",       xp: 0.6, burnout: 1  },
      { id: "zoning",  icon: "🗺️", name: "Zoning Research", desc: "+1.0 XP. 35% chance: next property 20% cheaper.", xp: 1.0, burnout: 4 },
      { id: "network2",icon: "🤝", name: "Broker Network",  desc: "+0.5 XP. 25% chance: free deal $500–1500.", xp: 0.5, burnout: 2 },
      { id: "staging", icon: "🛋️", name: "Home Staging",    desc: "+0.4 XP. Next flip sells for 30% more.", xp: 0.4, burnout: 2  },
    ],
    workName: "Close Deals", workBurnout: 7,
    hustleName: "Development Project", hustleBurnout: 18, hustleMulti: 0, hustleXpReq: 10,
    businessName: "Property Mgmt Co.", businessBase: 280, businessUpgradeCost: 2000, businessUnlockTier: 3,
    uniqueActions: [
      { id: "luxury",     icon: "🏰", name: "Buy Luxury Property", desc: "Costs $5000. +$500/turn + appreciation.", cost: 5000, xp: 0.5 },
      { id: "commercial", icon: "🏢", name: "Commercial Lease",    desc: "Costs $2000. +$400/turn for 12 turns.",   cost: 2000, xp: 0.4 },
      { id: "auct",       icon: "🔨", name: "Auction Flip",        desc: "Costs $800. 55% chance: +$3000–7000.",    cost: 800,  xp: 0.6 },
    ],
  },
  {
    id: "law", icon: "⚖️", name: "Law", color: "text-purple-300",
    tagline: "Longest grind. Extraordinary ceiling. Cases change everything.",
    startCash: 350, special: "caseBonus",
    specialDesc: "Specialised Senior+: 15% chance $800–4500 case bonus per turn.",
    perks: ["15% case bonus when specialised", "Landmark pro bono windfalls", "Law firm business"],
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
      { id: "lawstudy", icon: "📖", name: "Law Studies",    desc: "+1.4 XP. Core legal education.",         xp: 1.4, burnout: 8  },
      { id: "spec",     icon: "🎓", name: "Specialise",     desc: "+1.9 XP. Unlocks passive case bonuses.", xp: 1.9, burnout: 7  },
      { id: "probono",  icon: "🕊️", name: "Pro Bono Case",  desc: "+0.7 XP. 30% chance $1000–3500.",       xp: 0.7, burnout: 4  },
      { id: "bigcase",  icon: "🔥", name: "Take Big Case",  desc: "+1.2 XP. 60% win $2000–8000. 40% -$1000.", xp: 1.2, burnout: 10 },
      { id: "retainer", icon: "💼", name: "Get Retainer",   desc: "+0.5 XP. Costs $200. +$300/turn for 5 turns.", xp: 0.5, burnout: 3 },
    ],
    workName: "Bill Hours", workBurnout: 9,
    hustleName: "Major Litigation", hustleBurnout: 16, hustleMulti: 2.2, hustleXpReq: 10,
    businessName: "Law Firm", businessBase: 450, businessUpgradeCost: 2500, businessUnlockTier: 3,
    uniqueActions: [
      { id: "settlement", icon: "💰", name: "Negotiate Settlement", desc: "Guaranteed $1000–5000 payout.",         cost: 0,   xp: 0.4 },
      { id: "classact",   icon: "⚡", name: "Class Action Suit",    desc: "Costs $500. 50% chance +$10000–20000.", cost: 500, xp: 0.6 },
      { id: "arbitra",    icon: "🏛️", name: "Arbitration Win",      desc: "+1.0 XP. 70% chance +$2000.",          cost: 0,   xp: 1.0 },
    ],
  },
];

// ─── PROPERTY MARKET ─────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { type: "starter",    icon: "🏠", name: "Starter Home",      buyPrice: 800,   rentPerTurn: 120, flipGain: [1200, 2500],  flipTurns: 3 },
  { type: "mid",        icon: "🏡", name: "Mid-Range House",   buyPrice: 1500,  rentPerTurn: 220, flipGain: [2200, 4500],  flipTurns: 4 },
  { type: "luxury",     icon: "🏰", name: "Luxury Property",   buyPrice: 4000,  rentPerTurn: 500, flipGain: [5500, 12000], flipTurns: 5 },
  { type: "commercial", icon: "🏢", name: "Commercial Space",  buyPrice: 3000,  rentPerTurn: 400, flipGain: [4000, 9000],  flipTurns: 5 },
] as const;

// ─── STOCKS ───────────────────────────────────────────────────────────────────
const STOCK_DEFS = [
  { id: "nvt", ticker: "NVT", name: "NovaTech",       sector: "Tech",    base: 120,  vol: 0.08, trend: 0.006 },
  { id: "dfi", ticker: "DFI", name: "DataFlow",        sector: "Tech",    base: 85,   vol: 0.10, trend: 0.008 },
  { id: "atb", ticker: "ATB", name: "Atlas Bank",      sector: "Finance", base: 200,  vol: 0.05, trend: 0.003 },
  { id: "mrc", ticker: "MRC", name: "Meridian Cap",    sector: "Finance", base: 150,  vol: 0.06, trend: 0.004 },
  { id: "spc", ticker: "SPC", name: "SolarPeak",       sector: "Energy",  base: 60,   vol: 0.12, trend: 0.010 },
  { id: "gml", ticker: "GML", name: "GenMed Labs",     sector: "Health",  base: 180,  vol: 0.07, trend: 0.005 },
  { id: "omt", ticker: "OMT", name: "OmniMart",        sector: "Retail",  base: 45,   vol: 0.09, trend: 0.002 },
  { id: "cph", ticker: "CPH", name: "CipherCoin",      sector: "Crypto",  base: 30,   vol: 0.28, trend: 0.015 },
  { id: "bld", ticker: "BLD", name: "BuildCorp",       sector: "RE",      base: 95,   vol: 0.07, trend: 0.004 },
  { id: "rxp", ticker: "RXP", name: "RxPharma",        sector: "Health",  base: 140,  vol: 0.09, trend: 0.006 },
];

// ─── EVENTS ───────────────────────────────────────────────────────────────────
const EVENTS = [
  { turn: 6,  type: "bad",     icon: "🚗", title: "Car Breakdown",         sub: "Repair bill.",              amount: -300  },
  { turn: 11, type: "good",    icon: "💰", title: "Tax Refund",             sub: "Government owes you.",      amount: 550   },
  { turn: 16, type: "bad",     icon: "🏥", title: "Medical Bill",           sub: "Unexpected expense.",       amount: -500  },
  { turn: 21, type: "neutral", icon: "📰", title: "Market Analysts Speak",  sub: "Insider tip unlocked.",     amount: 0     },
  { turn: 26, type: "good",    icon: "🤑", title: "Old Debt Repaid",        sub: "A friend paid you back.",   amount: 800   },
  { turn: 31, type: "bad",     icon: "📉", title: "Market Shock",           sub: "Portfolio hit hard.",       amount: -999  },
  { turn: 36, type: "good",    icon: "🎁", title: "Inheritance",            sub: "Distant relative.",         amount: 1200  },
  { turn: 41, type: "bad",     icon: "💸", title: "Lifestyle Creep",        sub: "Spending caught up.",       amount: -900  },
  { turn: 46, type: "good",    icon: "🏆", title: "Industry Award",         sub: "Cash prize attached.",      amount: 1400  },
  { turn: 51, type: "bad",     icon: "🌊", title: "Recession",              sub: "Economy contracts.",        amount: -999  },
  { turn: 56, type: "good",    icon: "🎉", title: "Year-End Bonus",         sub: "Best performance yet.",     amount: 2000  },
  { turn: 61, type: "bad",     icon: "⚠️", title: "Emergency Fund Hit",     sub: "Family expense.",           amount: -1100 },
  { turn: 66, type: "good",    icon: "📈", title: "Bull Market Surge",      sub: "Everything up 15%.",        amount: 999   },
  { turn: 71, type: "bad",     icon: "🔥", title: "Property Damage",        sub: "Insurance didn't cover.",   amount: -800  },
  { turn: 76, type: "good",    icon: "💎", title: "Windfall Investment",     sub: "Early bet paid off big.",   amount: 2500  },
];

const LEADERBOARD = [
  { name: "Alex M.",   score: 145840 },
  { name: "Jordan K.", score: 118120 },
  { name: "Sam T.",    score: 95800  },
  { name: "Riley P.",  score: 78500  },
  { name: "Casey L.",  score: 62200  },
  { name: "Morgan F.", score: 47800  },
  { name: "Drew N.",   score: 31400  },
  { name: "Quinn B.",  score: 19600  },
];

// ─── BJ SIDE BETS ────────────────────────────────────────────────────────────
const SIDE_BETS = [
  { id: "lucky7",    name: "Lucky 7s",        desc: "Win if your first card is a 7",              payout: 3,   icon: "7️⃣"  },
  { id: "suited",    name: "Suited Pair",      desc: "Win if first 2 cards same suit",             payout: 5,   icon: "🃏"  },
  { id: "natural21", name: "Natural Blackjack",desc: "Win if you get 21 on first 2 cards",         payout: 8,   icon: "🃏"  },
  { id: "bust",      name: "Dealer Bust",      desc: "Win if dealer busts",                        payout: 2,   icon: "💥"  },
  { id: "perfect",   name: "Perfect Pair",     desc: "Win if first 2 cards identical rank & suit", payout: 25,  icon: "👑"  },
  { id: "triple7",   name: "Triple 7s",        desc: "Win if all 3 cards are 7s",                  payout: 100, icon: "🎰"  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(n: number) { return "$" + Math.round(n).toLocaleString(); }
function fmtP(n: number) { return "$" + n.toFixed(2); }

function getTierIdx(tiers: { req: number }[], xp: number) {
  let t = 0;
  for (let i = tiers.length - 1; i >= 0; i--) { if (xp >= tiers[i].req) { t = i; break; } }
  return t;
}

function getBurnoutMulti(special: string, tierIdx: number, burnout: number) {
  let b = burnout;
  if (special === "burnoutImmunity" && tierIdx >= 3) b = Math.min(b, 35);
  if (b < 30) return 1.0; if (b < 50) return 0.82; if (b < 70) return 0.60; if (b < 90) return 0.42;
  return 0.25;
}

function mktLabel(rate: number) {
  if (rate > .10)   return { text: "🚀 Bull Run",  color: "text-emerald-300" };
  if (rate > .03)   return { text: "📈 Growing",   color: "text-emerald-400" };
  if (rate >= -.03) return { text: "➡ Flat",       color: "text-white/60"    };
  if (rate >= -.08) return { text: "📉 Dipping",   color: "text-yellow-300"  };
  return                   { text: "💀 Crash",      color: "text-red-300"     };
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

// ─── BJ HELPERS ──────────────────────────────────────────────────────────────
const BJ_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const BJ_SUITS = ["♠","♣","♥","♦"];
type BJCard = { r: string; s: string; red: boolean };

function makeDeck(): BJCard[] {
  const d: BJCard[] = [];
  for (const r of BJ_RANKS) for (const s of BJ_SUITS) d.push({ r, s, red: s === "♥" || s === "♦" });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

function cv(r: string) { if (r === "A") return 11; if (["J","Q","K"].includes(r)) return 10; return parseInt(r); }

function hs(hand: BJCard[]) {
  let s = 0, a = 0;
  for (const c of hand) { s += cv(c.r); if (c.r === "A") a++; }
  while (s > 21 && a > 0) { s -= 10; a--; }
  return s;
}

function isNat(hand: BJCard[]) { return hand.length === 2 && hs(hand) === 21; }

// ─── ANIMATED PLAYING CARD ────────────────────────────────────────────────────
function AnimatedCard({ card, faceDown, delay = 0 }: { card: BJCard; faceDown?: boolean; delay?: number }) {
  const [flipped, setFlipped] = useState(faceDown);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = faceDown ? null : setTimeout(() => setFlipped(false), delay + 150);
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [delay, faceDown]);

  if (!visible) return <div className="w-14 h-20 opacity-0" />;

  if (flipped) return (
    <div className="w-14 h-20 rounded-xl flex-shrink-0 shadow-xl transition-all duration-300"
      style={{ background: "linear-gradient(135deg,#1e3a8a,#312e81)", border: "2px solid rgba(255,255,255,0.2)" }}>
      <div className="w-full h-full rounded-xl flex items-center justify-center text-white/20 text-2xl">🂠</div>
    </div>
  );

  return (
    <div
      className={`w-14 h-20 rounded-xl flex-shrink-0 shadow-xl flex flex-col items-start justify-between p-1.5 bg-white transition-all duration-300 ${card.red ? "text-red-600" : "text-zinc-900"}`}
      style={{ animation: `cardSlide 0.3s ease ${delay}ms both` }}
    >
      <div className="text-sm font-black leading-none">{card.r}</div>
      <div className="text-lg font-black leading-none self-center">{card.s}</div>
      <div className="text-sm font-black leading-none self-end rotate-180">{card.r}</div>
    </div>
  );
}

// ─── EPIC BLACKJACK ───────────────────────────────────────────────────────────
const MAX_HANDS = 3;

function EpicBlackjack({ cash, onFinish }: { cash: number; onFinish: (newCash: number, profit: number) => void }) {
  type BJPhase = "bet" | "sidebet" | "dealing" | "play" | "splitPlay" | "done";
  const [phase, setPhase] = useState<BJPhase>("bet");
  const [deck, setDeck] = useState<BJCard[]>([]);
  const [player, setPlayer] = useState<BJCard[]>([]);
  const [dealer, setDealer] = useState<BJCard[]>([]);
  const [splitHand, setSplitHand] = useState<BJCard[] | null>(null);
  const [bet, setBet] = useState(Math.min(300, Math.floor(cash * 0.2 / 10) * 10));
  const [doubled, setDoubled] = useState(false);
  const [result, setResult] = useState<{ outcome: string; gain: number } | null>(null);
  const [splitResult, setSplitResult] = useState<{ outcome: string; gain: number } | null>(null);
  const [localCash, setLocalCash] = useState(cash);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [sideBets, setSideBets] = useState<Record<string, number>>({});
  const [sideBetResults, setSideBetResults] = useState<{ name: string; win: boolean; payout: number }[]>([]);
  const [dealAnimDone, setDealAnimDone] = useState(false);
  const [showDealerCard, setShowDealerCard] = useState(false);
  const [bigWin, setBigWin] = useState(false);

  const totalSideBets = Object.values(sideBets).reduce((a, b) => a + b, 0);
  const canPlayMore = handsPlayed < MAX_HANDS;

  function runDealer(d0: BJCard[], dk: BJCard[]) {
    const nd = [...d0], ndk = [...dk];
    while (hs(nd) < 17) nd.push(ndk.pop()!);
    return nd;
  }

  function resolveHand(p: BJCard[], d: BJCard[], b: number, dbl: boolean) {
    const ps = hs(p), ds = hs(d), nat = isNat(p) && !dbl;
    if (ps > 21) return { outcome: "bust", gain: -b };
    if (ds > 21) return { outcome: "win", gain: nat ? Math.round(b * 1.5) : b };
    if (ps > ds)  return { outcome: "win", gain: nat ? Math.round(b * 1.5) : b };
    if (ps === ds) return { outcome: "push", gain: 0 };
    return { outcome: "lose", gain: -b };
  }

  function resolveSideBets(playerCards: BJCard[], dealerFinal: BJCard[]) {
    const results: { name: string; win: boolean; payout: number }[] = [];
    let gain = 0;
    for (const [betId, betAmt] of Object.entries(sideBets)) {
      if (betAmt <= 0) continue;
      const sb = SIDE_BETS.find(s => s.id === betId)!;
      let win = false;
      if (betId === "lucky7" && playerCards[0]?.r === "7") win = true;
      if (betId === "suited" && playerCards[0]?.s === playerCards[1]?.s) win = true;
      if (betId === "natural21" && isNat(playerCards)) win = true;
      if (betId === "bust" && hs(dealerFinal) > 21) win = true;
      if (betId === "perfect" && playerCards[0]?.r === playerCards[1]?.r && playerCards[0]?.s === playerCards[1]?.s) win = true;
      if (betId === "triple7" && playerCards.slice(0, 3).every(c => c.r === "7")) win = true;
      const payout = win ? betAmt * sb.payout : -betAmt;
      gain += payout;
      results.push({ name: sb.name, win, payout });
    }
    return { results, gain };
  }

  function deal() {
    if (localCash < bet + totalSideBets) return;
    const dk = makeDeck();
    const p = [dk.pop()!, dk.pop()!];
    const d0 = [dk.pop()!, dk.pop()!];
    setDeck(dk); setPlayer(p); setDealer(d0);
    setDoubled(false); setResult(null); setSplitResult(null); setSplitHand(null);
    setSideBetResults([]); setBigWin(false); setShowDealerCard(false);
    setLocalCash(c => c - bet - totalSideBets);
    setDealAnimDone(false);
    setPhase("dealing");
    setTimeout(() => {
      setDealAnimDone(true);
      if (isNat(p)) { doResolve(p, d0, dk, bet, false); return; }
      setPhase("play");
    }, 800);
  }

  function doResolve(p: BJCard[], d0: BJCard[], dk: BJCard[], b: number, dbl: boolean) {
    const fd = runDealer(d0, dk);
    setShowDealerCard(true);
    setTimeout(() => setDealer(fd), 400);
    const r = resolveHand(p, fd, b, dbl);
    const { results: sbResults, gain: sbGain } = resolveSideBets(p, fd);
    setSideBetResults(sbResults);
    setResult(r);
    if (r.outcome === "win" && (r.gain > bet * 2 || sbGain > 500)) setBigWin(true);
    setLocalCash(c => c + bet + r.gain + sbGain);
    setHandsPlayed(h => h + 1);
    setPhase("done");
  }

  function hit() {
    const nd = [...deck]; const np = [...player, nd.pop()!];
    setDeck(nd); setPlayer(np);
    if (hs(np) >= 21) doResolve(np, dealer, nd, bet, doubled);
  }

  function stand() {
    if (splitHand && phase === "play") {
      setSplitResult(resolveHand(player, dealer, bet, doubled));
      const nd = [...deck]; const np = [...splitHand, nd.pop()!];
      setDeck(nd); setPlayer(np); setSplitHand(null); setPhase("splitPlay");
    } else doResolve(player, dealer, deck, bet, doubled);
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
    if (hs(np) >= 21) { const fd = runDealer(dealer, nd); setDealer(fd); setResult(resolveHand(np, fd, bet, false)); setHandsPlayed(h => h + 1); setPhase("done"); }
  }

  function split2Stand() {
    const fd = runDealer(dealer, deck);
    setDealer(fd); setShowDealerCard(true);
    setResult(resolveHand(player, fd, bet, false));
    setHandsPlayed(h => h + 1); setPhase("done");
  }

  function playAgain() {
    setSideBets({}); setSideBetResults([]); setResult(null); setSplitResult(null);
    setBigWin(false); setShowDealerCard(false); setPhase("bet");
  }

  function collect() {
    const profit = localCash - cash;
    onFinish(localCash, profit);
  }

  const canSplit = player.length === 2 && cv(player[0]?.r) === cv(player[1]?.r) && localCash >= bet && !splitHand;
  const ps = hs(player);
  const totalGain = (result?.gain ?? 0) + (splitResult?.gain ?? 0);

  const chips = [...new Set([
    Math.max(10, Math.round(cash * 0.05 / 10) * 10),
    Math.max(10, Math.round(cash * 0.15 / 10) * 10),
    Math.max(10, Math.round(cash * 0.30 / 10) * 10),
    Math.max(10, Math.round(cash * 0.50 / 10) * 10),
    Math.max(10, Math.round(cash / 10) * 10),
  ])].filter(v => v > 0 && v <= cash).slice(0, 5);

  const resultText = !result ? "" :
    result.outcome === "bust"  ? `Bust! ${fmt(Math.abs(result.gain))} lost` :
    result.outcome === "win"   ? (isNat(player) && !doubled ? `🎰 BLACKJACK! +${fmt(result.gain)}` : `✅ WIN! +${fmt(result.gain)}`) :
    result.outcome === "push"  ? "↩ Push — bet returned" :
    `❌ Lost ${fmt(Math.abs(result.gain))}`;

  const resultBg = !result ? "" :
    result.outcome === "win"  ? "bg-emerald-900/80 text-emerald-200 border-emerald-400" :
    result.outcome === "push" ? "bg-zinc-800 text-white/70 border-zinc-600" :
    "bg-red-900/80 text-red-200 border-red-400";

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur overflow-hidden">
      <style>{`
        @keyframes cardSlide { from { opacity:0; transform: translateY(-20px) rotate(-5deg); } to { opacity:1; transform: translateY(0) rotate(0deg); } }
        @keyframes bigWinPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <div>
            <h3 className="font-black text-lg">Epic Blackjack</h3>
            <p className="text-xs text-white/40">Hand {handsPlayed + 1} of {MAX_HANDS} • Dealer stands soft 17 • BJ pays 3:2</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-yellow-300 font-black">{fmt(localCash)}</div>
          <div className="text-xs text-white/40">available</div>
        </div>
      </div>

      {/* Bet setup */}
      {(phase === "bet" || phase === "sidebet") && (
        <div className="p-5">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setPhase("bet")} className={`flex-1 py-2 rounded-xl font-black text-sm transition ${phase === "bet" ? "bg-yellow-300 text-zinc-950" : "border border-white/10 text-white/50 hover:border-white/30"}`}>Main Bet</button>
            <button onClick={() => setPhase("sidebet")} className={`flex-1 py-2 rounded-xl font-black text-sm transition ${phase === "sidebet" ? "bg-purple-400 text-white" : "border border-white/10 text-white/50 hover:border-white/30"}`}>Side Bets 🎰</button>
          </div>

          {phase === "bet" && (
            <>
              <div className="text-4xl font-black text-yellow-300 text-center my-4">{fmt(bet)}</div>
              <input type="range" min={10} max={Math.min(cash, 50000)} step={10} value={bet}
                onChange={e => setBet(Number(e.target.value))} className="w-full mb-3 accent-yellow-300" />
              <div className="flex gap-2 flex-wrap mb-4">
                {chips.map(v => (
                  <button key={v} onClick={() => setBet(Math.min(v, cash))}
                    className={`px-3 py-2 rounded-2xl border font-bold text-sm transition hover:scale-105 ${bet === v ? "border-yellow-300 text-yellow-300 bg-yellow-300/10" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                    {fmt(v)}
                  </button>
                ))}
              </div>
              {totalSideBets > 0 && <p className="text-xs text-purple-300 mb-3">+ {fmt(totalSideBets)} in side bets</p>}
              <button onClick={deal} disabled={localCash < bet + totalSideBets}
                className="w-full rounded-2xl bg-yellow-300 py-4 font-black text-zinc-950 text-lg transition hover:scale-105 hover:bg-yellow-200 disabled:opacity-40">
                Deal Cards →
              </button>
            </>
          )}

          {phase === "sidebet" && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-white/50 mb-3">Place side bets before dealing. Max $500 per side bet. Huge payouts!</p>
              {SIDE_BETS.map(sb => {
                const current = sideBets[sb.id] || 0;
                return (
                  <div key={sb.id} className={`rounded-2xl border p-3 transition ${current > 0 ? "border-purple-400 bg-purple-900/30" : "border-white/10 bg-black/20"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{sb.icon}</span>
                        <div>
                          <p className="font-black text-sm">{sb.name}</p>
                          <p className="text-[10px] text-white/40">{sb.desc}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-purple-300 font-black text-sm">{sb.payout}× payout</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {[0, 25, 50, 100, 250, 500].map(amt => (
                        <button key={amt} onClick={() => setSideBets(prev => ({ ...prev, [sb.id]: amt }))}
                          disabled={amt > localCash - bet}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition disabled:opacity-20 ${current === amt ? "bg-purple-400 text-white" : "border border-white/10 text-white/50 hover:bg-white/10"}`}>
                          {amt === 0 ? "OFF" : fmt(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setPhase("bet")} className="w-full rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 mt-2 transition hover:bg-yellow-200">
                Back to Main Bet →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Game table */}
      {(phase === "dealing" || phase === "play" || phase === "splitPlay" || phase === "done") && (
        <div>
          <div className="p-5" style={{ background: "linear-gradient(180deg, rgba(5,46,22,0.8) 0%, rgba(2,20,10,0.9) 100%)" }}>
            {/* Dealer */}
            <p className="text-xs uppercase tracking-widest text-white/30 mb-2 font-black">
              Dealer {phase === "done" && showDealerCard ? `— ${hs(dealer)}` : "— ?"}
            </p>
            <div className="flex gap-2 flex-wrap mb-5 min-h-20">
              {dealer.map((c, i) => (
                <AnimatedCard key={i} card={c} faceDown={phase !== "done" && i > 0} delay={i * 200} />
              ))}
            </div>

            {phase === "splitPlay" && <p className="text-xs text-purple-300 uppercase tracking-widest mb-2 font-black">↑ Split hand — playing now</p>}

            {/* Player */}
            <p className="text-xs uppercase tracking-widest text-white/30 mb-2 font-black">
              You — {ps}{ps > 21 ? " 💥 BUST" : ps === 21 && player.length === 2 ? " ⭐ BLACKJACK" : ""}
            </p>
            <div className="flex gap-2 flex-wrap min-h-20">
              {player.map((c, i) => <AnimatedCard key={i} card={c} delay={i * 200 + 400} />)}
            </div>

            {splitHand && phase === "play" && (
              <>
                <p className="text-xs uppercase tracking-widest text-purple-300 mt-4 mb-2 font-black">Split hand (plays next)</p>
                <div className="flex gap-2 flex-wrap">
                  {splitHand.map((c, i) => <AnimatedCard key={i} card={c} delay={i * 150} />)}
                </div>
              </>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`px-5 py-3 text-center font-black text-xl border-b ${resultBg} ${bigWin ? "animate-pulse" : ""}`}>
              {resultText}
              {splitResult && <span className="text-sm ml-3 opacity-80">| Split: {splitResult.gain >= 0 ? "+" : ""}{fmt(splitResult.gain)}</span>}
            </div>
          )}

          {/* Side bet results */}
          {sideBetResults.length > 0 && (
            <div className="px-5 py-3 border-b border-white/10 bg-purple-900/20">
              <p className="text-xs text-purple-300 font-black uppercase tracking-widest mb-2">Side Bet Results</p>
              <div className="flex flex-wrap gap-2">
                {sideBetResults.map((r, i) => (
                  <div key={i} className={`px-3 py-1 rounded-xl text-xs font-black ${r.win ? "bg-emerald-900/60 text-emerald-300 border border-emerald-600" : "bg-red-900/60 text-red-300 border border-red-700"}`}>
                    {r.name}: {r.win ? `+${fmt(r.payout)}` : fmt(r.payout)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          {phase === "play" && dealAnimDone && (
            <div className="flex gap-2 p-4 flex-wrap">
              <button onClick={hit}      className="flex-1 py-3 rounded-2xl bg-emerald-400 font-black text-zinc-950 transition hover:bg-emerald-300 active:scale-95">Hit</button>
              <button onClick={stand}    className="flex-1 py-3 rounded-2xl bg-blue-500   font-black text-white    transition hover:bg-blue-400    active:scale-95">Stand</button>
              {player.length === 2 && (
                <button onClick={doDouble} disabled={localCash < bet}
                  className="flex-1 py-3 rounded-2xl bg-yellow-400 font-black text-zinc-950 transition hover:bg-yellow-300 disabled:opacity-40 active:scale-95">Double</button>
              )}
              {canSplit && (
                <button onClick={doSplit}
                  className="flex-1 py-3 rounded-2xl bg-purple-500 font-black text-white transition hover:bg-purple-400 active:scale-95">Split</button>
              )}
            </div>
          )}

          {phase === "splitPlay" && (
            <div className="flex gap-2 p-4">
              <button onClick={split2Hit}   className="flex-1 py-3 rounded-2xl bg-emerald-400 font-black text-zinc-950 transition hover:bg-emerald-300">Hit</button>
              <button onClick={split2Stand} className="flex-1 py-3 rounded-2xl bg-blue-500   font-black text-white    transition hover:bg-blue-400">Stand</button>
            </div>
          )}

          {phase === "done" && (
            <div className="p-4 flex flex-col gap-2">
              {canPlayMore && (
                <button onClick={playAgain}
                  className="w-full py-3 rounded-2xl border border-yellow-300 text-yellow-300 font-black text-base transition hover:bg-yellow-300/10">
                  Play Another Hand ({MAX_HANDS - handsPlayed} left) →
                </button>
              )}
              <button onClick={collect}
                className="w-full py-4 rounded-2xl bg-yellow-300 font-black text-zinc-950 text-lg transition hover:scale-105 hover:bg-yellow-200">
                Collect {fmt(localCash)} & Continue →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REAL ESTATE MARKET ───────────────────────────────────────────────────────
function RealEstateMarket({
  cash, properties, onBuy, onFlip, onSell
}: {
  cash: number;
  properties: Property[];
  onBuy: (type: typeof PROPERTY_TYPES[number]) => void;
  onFlip: (id: string) => void;
  onSell: (id: string) => void;
}) {
  const [tab, setTab] = useState<"buy" | "portfolio">("buy");

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur overflow-hidden">
      <div className="flex border-b border-white/10">
        <button onClick={() => setTab("buy")} className={`flex-1 py-3 font-black text-sm transition ${tab === "buy" ? "bg-yellow-300 text-zinc-950" : "text-white/50 hover:text-white"}`}>Buy Property</button>
        <button onClick={() => setTab("portfolio")} className={`flex-1 py-3 font-black text-sm transition ${tab === "portfolio" ? "bg-yellow-300 text-zinc-950" : "text-white/50 hover:text-white"}`}>My Portfolio ({properties.length})</button>
      </div>

      {tab === "buy" && (
        <div className="p-4 space-y-3">
          {PROPERTY_TYPES.map(pt => {
            const canAfford = cash >= pt.buyPrice;
            return (
              <div key={pt.type} className={`rounded-2xl border p-4 ${canAfford ? "border-white/10 bg-black/20" : "border-white/5 opacity-40"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{pt.icon}</span>
                    <div>
                      <p className="font-black text-sm">{pt.name}</p>
                      <p className="text-xs text-white/40">+{fmt(pt.rentPerTurn)}/turn rent</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-yellow-300">{fmt(pt.buyPrice)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onBuy(pt)} disabled={!canAfford}
                    className="flex-1 py-2 rounded-xl bg-emerald-400 text-zinc-950 font-black text-xs transition hover:bg-emerald-300 disabled:opacity-40">
                    Buy & Rent
                  </button>
                  <div className="flex-1 rounded-xl border border-white/10 px-2 py-2 text-center text-xs text-white/40">
                    Flip: {fmt(pt.flipGain[0])}–{fmt(pt.flipGain[1])} ({pt.flipTurns} turns)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "portfolio" && (
        <div className="p-4 space-y-3">
          {properties.length === 0 && <p className="text-white/40 text-sm text-center py-4">No properties yet. Buy some!</p>}
          {properties.map(p => {
            const def = PROPERTY_TYPES.find(pt => pt.type === p.type)!;
            const appreciation = Math.round(p.currentValue - p.purchasePrice);
            return (
              <div key={p.id} className={`rounded-2xl border p-4 ${p.isFlipping ? "border-orange-400/50 bg-orange-900/20" : "border-white/10 bg-black/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-black text-sm">{def.icon} {p.address}</p>
                    <p className="text-xs text-white/40">Bought: {fmt(p.purchasePrice)} · Now: {fmt(p.currentValue)}</p>
                    {appreciation > 0 && <p className="text-xs text-emerald-400">+{fmt(appreciation)} appreciation</p>}
                  </div>
                  {p.isFlipping ? (
                    <div className="text-right">
                      <p className="text-orange-300 font-black text-sm">🔨 Flipping</p>
                      <p className="text-xs text-white/40">{p.flipTurnsLeft} turns left</p>
                    </div>
                  ) : (
                    <p className="text-emerald-300 font-black text-sm">+{fmt(p.rentPerTurn)}/turn</p>
                  )}
                </div>
                {!p.isFlipping && (
                  <div className="flex gap-2">
                    <button onClick={() => onFlip(p.id)}
                      className="flex-1 py-2 rounded-xl bg-orange-400 text-zinc-950 font-black text-xs transition hover:bg-orange-300">
                      🔨 Start Flip
                    </button>
                    <button onClick={() => onSell(p.id)}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white font-black text-xs transition hover:bg-red-400">
                      Sell {fmt(p.currentValue)}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── STOCK PANEL ─────────────────────────────────────────────────────────────
function StockPanel({ cash, holdings, prices, history, isFinance, onTrade }: {
  cash: number; holdings: Holding[]; prices: Record<string, number>;
  history: Record<string, number[]>; isFinance: boolean;
  onTrade: (newCash: number, newHoldings: Holding[]) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [shares, setShares] = useState(10);
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  function trade() {
    if (!sel) return;
    const price = prices[sel] ?? 0;
    const newH = holdings.map(h => ({ ...h }));
    if (mode === "buy") {
      const cost = Math.round(price * shares * (isFinance ? 0.5 : 1) * 100) / 100;
      if (cash < cost) return;
      const ex = newH.find(h => h.id === sel);
      if (ex) { const ts = ex.shares + shares; ex.avgCost = Math.round(((ex.shares * ex.avgCost) + (shares * price)) / ts * 100) / 100; ex.shares = ts; }
      else { const d = STOCK_DEFS.find(s => s.id === sel)!; newH.push({ id: sel, ticker: d.ticker, shares, avgCost: price }); }
      onTrade(Math.round((cash - cost) * 100) / 100, newH);
    } else {
      const ex = newH.find(h => h.id === sel);
      if (!ex || ex.shares < shares) return;
      const proceeds = Math.round(price * shares * 100) / 100;
      ex.shares -= shares;
      onTrade(Math.round((cash + proceeds) * 100) / 100, newH.filter(h => h.shares > 0));
    }
    setSel(null); setShares(10);
  }

  return (
    <div className="space-y-2">
      {isFinance && <p className="text-xs text-emerald-300 bg-emerald-900/30 rounded-xl px-3 py-2">⚡ 2× leverage: buy at 50% cost</p>}
      <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
        {STOCK_DEFS.map(def => {
          const price = prices[def.id] ?? def.base;
          const hist = history[def.id] ?? [price];
          const prev = hist[hist.length - 2] ?? price;
          const chgPct = prev > 0 ? ((price - prev) / prev * 100) : 0;
          const held = holdings.find(h => h.id === def.id);
          const isSel = sel === def.id;
          return (
            <button key={def.id} onClick={() => { setSel(isSel ? null : def.id); setShares(10); setMode("buy"); }}
              className={`w-full text-left rounded-2xl border p-3 transition ${isSel ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs w-10 text-yellow-300">{def.ticker}</span>
                  <span className="text-[10px] text-white/30 border border-white/10 rounded px-1">{def.sector}</span>
                  {held && <span className="text-[10px] text-blue-300">{held.shares}sh</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-end gap-0.5 h-5">
                    {hist.slice(-8).map((p, i, a) => { const mx=Math.max(...a),mn=Math.min(...a); const h=mx===mn?4:Math.max(2,Math.round(((p-mn)/(mx-mn))*16)); return <div key={i} className="w-1.5 rounded-sm" style={{height:h,background:p>=(a[i-1]??p)?"#34d399":"#f87171"}}/>; })}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm">{fmtP(price)}</div>
                    <div className={`text-[10px] font-bold ${chgPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{chgPct >= 0 ? "+" : ""}{chgPct.toFixed(1)}%</div>
                  </div>
                </div>
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
              <button onClick={() => setMode("buy")}  className={`flex-1 py-2 rounded-xl font-black text-sm ${mode==="buy"?"bg-emerald-400 text-zinc-950":"border border-white/10 text-white/60"}`}>Buy</button>
              <button onClick={() => setMode("sell")} disabled={!held} className={`flex-1 py-2 rounded-xl font-black text-sm disabled:opacity-30 ${mode==="sell"?"bg-red-400 text-white":"border border-white/10 text-white/60"}`}>Sell</button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setShares(Math.max(1, shares - 10))} className="w-9 h-9 rounded-full border border-white/10 font-black text-lg flex items-center justify-center hover:bg-white/10">−</button>
              <div className="flex-1 text-center"><div className="font-black text-2xl">{shares}</div><div className="text-xs text-white/40">shares</div></div>
              <button onClick={() => setShares(Math.min(mode==="buy"?maxB:maxS, shares+10))} className="w-9 h-9 rounded-full border border-white/10 font-black text-lg flex items-center justify-center hover:bg-white/10">+</button>
            </div>
            <div className="flex gap-2 mb-3">
              {[10,50,100,500].map(n => <button key={n} onClick={() => setShares(Math.min(mode==="buy"?maxB:maxS,n))} className="flex-1 py-1 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/10">{n}</button>)}
              <button onClick={() => setShares(mode==="buy"?maxB:maxS)} className="flex-1 py-1 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/10">Max</button>
            </div>
            <div className="text-sm text-white/60 mb-3 text-center">{mode==="buy"?`Cost: ${fmt(cost)}${isFinance?" (2× leverage)":""}`:  `Proceeds: ${fmt(cost)}`}</div>
            <button onClick={trade} disabled={mode==="buy"?(shares>maxB||shares<1):(shares>maxS||shares<1)} className={`w-full py-3 rounded-2xl font-black text-sm transition hover:scale-105 disabled:opacity-30 ${mode==="buy"?"bg-emerald-400 text-zinc-950":"bg-red-400 text-white"}`}>
              {mode==="buy"?`Buy ${shares} shares`:`Sell ${shares} shares`}
            </button>
          </div>
        );
      })()}
      {holdings.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          {holdings.map(h => {
            const price = prices[h.id] ?? h.avgCost;
            const pnl = Math.round((price-h.avgCost)*h.shares*100)/100;
            return (
              <div key={h.id} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                <span className="font-black text-yellow-300 w-10">{h.ticker}</span>
                <span className="text-white/40">{h.shares}sh</span>
                <span className={pnl>=0?"text-emerald-300":"text-red-300"}>{pnl>=0?"+":""}{fmt(pnl)}</span>
                <span className="font-black">{fmt(Math.round(price*h.shares))}</span>
              </div>
            );
          })}
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
  const [g, setG] = useState<GameState | null>(null);
  const [selAction, setSelAction] = useState<string | null>(null);
  const [showBJ, setShowBJ] = useState(false);
  const [showStocks, setShowStocks] = useState(false);
  const [showRE, setShowRE] = useState(false);
  const [eventBanner, setEventBanner] = useState<{ type: string; icon: string; title: string; sub: string; result: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setAuthLoading(false);
    }
    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    if (screen !== "end" || !g || savedRef.current) return;
    savedRef.current = true;
    const sv = g.holdings.reduce((sum, h) => sum + h.shares * (g.stockPrices[h.id] ?? 0), 0);
    const pv = g.properties.reduce((sum, p) => sum + p.currentValue, 0);
    const score = Math.round(g.cash + g.bonds + sv + pv);
    const accuracy = g.totalEarned > 0 ? Math.min(1, score / (g.totalEarned + 1)) : 0;
    saveScore({ gameId: "the-grind", score, durationSeconds: TOTAL_TURNS * 15, accuracy, attemptNumber: 1 })
      .then(r => console.log("SAVE:", r));
  }, [screen, g]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0; }, [g?.log.length]);

  const career = g ? CAREERS.find(c => c.id === g.careerId)! : null;
  const tierIdx = g && career ? getTierIdx(career.tiers, g.xp) : 0;
  const tier = career ? career.tiers[tierIdx] : null;
  const bm = g && career ? getBurnoutMulti(career.special, tierIdx, g.burnout) : 1;
  const salary = tier ? Math.round(tier.income * bm) : 0;
  const mRate = g ? (MARKET[g.turn - 1] ?? 0) : 0;
  const ml = mktLabel(mRate);
  const stockVal = g ? g.holdings.reduce((sum, h) => sum + h.shares * (g.stockPrices[h.id] ?? 0), 0) : 0;
  const propVal = g ? g.properties.reduce((sum, p) => sum + p.currentValue, 0) : 0;
  const netWorth = g ? Math.round(g.cash + g.bonds + stockVal + propVal) : 0;
  const rentPerTurn = g ? g.properties.filter(p => !p.isFlipping).reduce((sum, p) => sum + p.rentPerTurn, 0) : 0;
  const businessIncome = g ? g.businesses.reduce((sum, b) => sum + b.incomePerTurn, 0) : 0;
  const burnoutColor = g ? (g.burnout > 70 ? "text-red-300" : g.burnout > 45 ? "text-yellow-300" : "text-emerald-300") : "text-emerald-300";

  function initGame(careerId: string): GameState {
    const c = CAREERS.find(x => x.id === careerId)!;
    const prices: Record<string, number> = {};
    const history: Record<string, number[]> = {};
    for (const s of STOCK_DEFS) { prices[s.id] = s.base; history[s.id] = [s.base]; }
    return {
      turn: 1, cash: c.startCash, bonds: 0, xp: 0, burnout: 0,
      passive: 0, marketHint: false, specialised: false, prodBoost: 1.0,
      casinoProfit: 0, totalEarned: 0, totalLost: 0, careerId,
      log: [], holdings: [], stockPrices: prices, stockHistory: history,
      properties: [], businesses: [],
      patentTurnsLeft: 0, patentIncome: 0,
      sponsorshipTurnsLeft: 0, sponsorshipIncome: 0,
      shortTermRentalTurnsLeft: 0, shortTermRentalIncome: 0,
      pharmaPassive: 0, hospitalPassive: 0,
      followers: 0, caseWins: 0,
    };
  }

  function lg(state: GameState, msg: string, type = ""): GameState {
    return { ...state, log: [{ turn: state.turn, msg, type }, ...state.log].slice(0, 80) };
  }

  function applyBondReturn(state: GameState): GameState {
    if (state.bonds <= 0) return state;
    let rate = MARKET[state.turn - 1] ?? 0;
    const noise = (Math.random() - 0.5) * 0.035;
    if (career?.special === "marketBonus" && tierIdx >= 3) rate += 0.025;
    const gain = state.bonds * (rate + noise);
    let ns = { ...state, bonds: Math.max(0, state.bonds + gain) };
    if (Math.abs(gain) > 20) ns = lg(ns, `Bonds ${gain > 0 ? "▲" : "▼"} ${fmt(Math.abs(Math.round(gain)))}`, gain > 0 ? "pos" : "neg");
    return ns;
  }

  function advanceTurn(state: GameState): GameState {
    const { newPrices, newHistory } = tickStocks(state.stockPrices, state.stockHistory, state.turn);
    let ns: GameState = { ...state, stockPrices: newPrices, stockHistory: newHistory };

    // Fire event
    const ev = EVENTS.find(e => e.turn === ns.turn);
    if (ev) {
      if (ev.amount === -999) {
        if (ev.turn === 31) { const pct = 0.12 + Math.random() * 0.12; ns.bonds = Math.round(ns.bonds * (1 - pct)); setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `-${Math.round(pct * 100)}% bonds` }); }
        else if (ev.turn === 51) { const pct = 0.18 + Math.random() * 0.1; ns.bonds = Math.round(ns.bonds * (1 - pct)); ns.cash = Math.max(0, Math.round(ns.cash * 0.88)); setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `-${Math.round(pct * 100)}% portfolio` }); }
        else if (ev.turn === 21) { ns.marketHint = true; setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: "Forecast unlocked" }); }
        else if (ev.turn === 66) { const boost = Math.round(ns.bonds * 0.15); ns.bonds += boost; ns.cash += Math.round(ns.cash * 0.1); setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `+${fmt(boost)} bonds` }); }
      } else {
        const amt = ev.amount > 0 ? ev.amount + Math.round(Math.random() * ev.amount * 0.5) : ev.amount - Math.round(Math.random() * Math.abs(ev.amount) * 0.5);
        ns.cash = Math.max(0, ns.cash + amt);
        if (amt > 0) ns.totalEarned += amt; else ns.totalLost += Math.abs(amt);
        setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `${amt >= 0 ? "+" : ""}${fmt(amt)}` });
      }
    } else setEventBanner(null);

    // Passive income
    const passiveTotal = ns.passive + rentPerTurn + businessIncome +
      (ns.patentTurnsLeft > 0 ? ns.patentIncome : 0) +
      (ns.sponsorshipTurnsLeft > 0 ? ns.sponsorshipIncome : 0) +
      (ns.shortTermRentalTurnsLeft > 0 ? ns.shortTermRentalIncome : 0) +
      ns.pharmaPassive + ns.hospitalPassive;
    if (passiveTotal > 0) { ns.cash += passiveTotal; ns.totalEarned += passiveTotal; }

    // Tick timers
    if (ns.patentTurnsLeft > 0) ns.patentTurnsLeft--;
    if (ns.sponsorshipTurnsLeft > 0) ns.sponsorshipTurnsLeft--;
    if (ns.shortTermRentalTurnsLeft > 0) ns.shortTermRentalTurnsLeft--;

    // Property appreciation every 5 turns
    if (ns.turn % 5 === 0 && ns.properties.length > 0) {
      ns.properties = ns.properties.map(p => ({ ...p, currentValue: Math.round(p.currentValue * 1.03) }));
      ns = lg(ns, `Properties appreciated +3%`, "special");
    }

    // Flip resolution
    ns.properties = ns.properties.map(p => {
      if (!p.isFlipping) return p;
      if (p.flipTurnsLeft <= 1) {
        const def = PROPERTY_TYPES.find(pt => pt.type === p.type)!;
        const gain = Math.round(def.flipGain[0] + Math.random() * (def.flipGain[1] - def.flipGain[0]));
        ns.cash += gain;
        ns.totalEarned += gain;
        ns = lg(ns, `🏠 Flip complete: ${p.address} sold for ${fmt(gain)}!`, "special");
        return null as unknown as Property;
      }
      return { ...p, flipTurnsLeft: p.flipTurnsLeft - 1 };
    }).filter(Boolean);

    // Career specials
    const c = CAREERS.find(c => c.id === ns.careerId)!;
    if (c.special === "caseBonus" && ns.specialised && getTierIdx(c.tiers, ns.xp) >= 3 && Math.random() < 0.15) {
      const b = Math.round(800 + Math.random() * 3700); ns.cash += b; ns.totalEarned += b;
      ns = lg(ns, `Case win bonus — +${fmt(b)}`, "special");
    }
    if (c.special === "leverage" && getTierIdx(c.tiers, ns.xp) >= 3 && Math.random() < 0.14) {
      const b = Math.round(400 + Math.random() * 1400); ns.cash += b; ns.totalEarned += b;
      ns = lg(ns, `Quarterly bonus — +${fmt(b)}`, "special");
    }

    return { ...ns, turn: ns.turn + 1 };
  }

  function confirmAction() {
    if (!selAction || !g || !career) return;
    if (selAction === "casino") { setShowBJ(true); return; }
    if (selAction === "stocks") { setShowStocks(true); return; }
    if (selAction === "realestate") { setShowRE(true); return; }

    let ns = applyBondReturn({ ...g });
    const prevTier = getTierIdx(career.tiers, ns.xp);

    // --- STANDARD ACTIONS ---
    if (selAction === "work") {
      ns.cash += salary; ns.totalEarned += salary;
      ns.burnout = Math.min(100, ns.burnout + career.workBurnout);
      ns = lg(ns, `${career.workName} — +${fmt(salary)}`, "pos");

    } else if (selAction === "rest") {
      const rec = Math.min(ns.burnout, 28); ns.burnout = Math.max(0, ns.burnout - 28);
      ns = lg(ns, `Rested — burnout -${rec}%`);

    } else if (selAction === "bonds") {
      const amt = Math.round(ns.cash * 0.20);
      if (amt > 0) { ns.cash -= amt; ns.bonds += amt; ns = lg(ns, `Invested ${fmt(amt)} in bonds`); }

    } else if (selAction === "hustle") {
      if (career.id === "finance") {
        const win = Math.random() < 0.48;
        if (win) { const g2 = Math.round(salary * (1.5 + Math.random())); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Prop trade WIN — +${fmt(g2)}`, "pos"); }
        else { ns.cash = Math.max(0, ns.cash - salary); ns.totalLost += salary; ns = lg(ns, `Prop trade LOSS — -${fmt(salary)}`, "neg"); }
      } else if (career.id === "realestate") {
        if (ns.cash >= 1500) { ns.cash -= 1500; const gain = 2500 + Math.round(Math.random() * 4000); ns.cash += gain; ns.totalEarned += (gain - 1500); ns = lg(ns, `Dev project — +${fmt(gain - 1500)} profit`, "pos"); }
      } else {
        const inc = Math.round(salary * career.hustleMulti * ns.prodBoost);
        ns.cash += inc; ns.totalEarned += inc;
        ns = lg(ns, `${career.hustleName} — +${fmt(inc)}`, "pos");
      }
      ns.burnout = Math.min(100, ns.burnout + career.hustleBurnout);

    } else if (selAction === "upgrade_business") {
      const biz = ns.businesses.find(b => b.careerId === career.id);
      if (biz && ns.cash >= biz.upgradeCost) {
        ns.cash -= biz.upgradeCost;
        biz.level++;
        biz.incomePerTurn = Math.round(biz.incomePerTurn * 1.75);
        biz.upgradeCost = Math.round(biz.upgradeCost * 2.2);
        ns = lg(ns, `${biz.name} upgraded to Lvl ${biz.level}! Now +${fmt(biz.incomePerTurn)}/turn`, "special");
      }

    } else {
      // Study + unique actions
      const sa = career.studyActions.find(a => a.id === selAction);
      const ua = career.uniqueActions?.find((a: { id: string }) => a.id === selAction);

      if (sa) {
        // Career-specific study effects
        if (sa.id === "oss" && Math.random() < 0.25) { const b = 300 + Math.round(Math.random() * 500); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Recruiter bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "net" && Math.random() < 0.2) { const b = 400 + Math.round(Math.random() * 900); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Deal closed — +${fmt(b)}`, "special"); }
        else if (sa.id === "aud") { ns.passive += 100; ns = lg(ns, `Audience built — passive +$100/turn (total: $${ns.passive}/turn)`, "special"); }
        else if (sa.id === "prod") { ns.prodBoost += 0.20; ns = lg(ns, `Production +20% — hustle now ×${ns.prodBoost.toFixed(2)}`, "special"); }
        else if (sa.id === "col") { if (Math.random() < 0.4) { const g2 = 1000 + Math.round(Math.random() * 3000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `VIRAL collab — +${fmt(g2)}`, "special"); } else ns = lg(ns, `Collab flopped.`); }
        else if (sa.id === "moonlight") { const inc = Math.round(salary * 0.8); ns.cash += inc; ns.totalEarned += inc; ns = lg(ns, `Moonlight shift — +${fmt(inc)}`, "pos"); }
        else if (sa.id === "research" && Math.random() < 0.3) { const b = 800 + Math.round(Math.random() * 1200); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Research grant — +${fmt(b)}`, "special"); }
        else if (sa.id === "reit") { if (ns.cash >= 600) { ns.cash -= 600; ns.passive += 120; ns = lg(ns, `REIT purchased — +$120/turn forever`, "special"); } }
        else if (sa.id === "merch") { if (ns.cash >= 400) { ns.cash -= 400; ns.passive += 200; ns = lg(ns, `Merch launched — +$200/turn`, "special"); } }
        else if (sa.id === "course" && ns.cash >= 200) { ns.cash -= 200; if (Math.random() < 0.7) { const g2 = 800 + Math.round(Math.random() * 2200); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Course sold — +${fmt(g2)}`, "pos"); } else ns = lg(ns, `Course flopped.`); }
        else if (sa.id === "hedge" && Math.random() < 0.3) { const b = 1000 + Math.round(Math.random() * 1000); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Hedge bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "crypto") { const win = Math.random() < 0.5; const amt = 2500; if (win) { ns.cash += amt; ns.totalEarned += amt; ns = lg(ns, `Crypto trade WIN — +${fmt(amt)}`, "pos"); } else { ns.cash = Math.max(0, ns.cash - amt); ns.totalLost += amt; ns = lg(ns, `Crypto trade LOSS — -${fmt(amt)}`, "neg"); } }
        else if (sa.id === "cert" && Math.random() < 0.4) { const b = 500; ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Certification bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "ai") { ns = lg(ns, `AI/ML specialisation (+${sa.xp} XP)`); }
        else if (sa.id === "surgery" && Math.random() < 0.2) { const b = 1500; ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Surgical bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "pharma") { ns.cash += 2000; ns.pharmaPassive += 150; ns.totalEarned += 2000; ns = lg(ns, `Pharma deal: +$2000 + $150/turn passive`, "special"); }
        else if (sa.id === "spec") { ns.specialised = true; ns = lg(ns, `Specialised — case win bonuses now active`, "special"); }
        else if (sa.id === "probono" && Math.random() < 0.3) { const b = 1000 + Math.round(Math.random() * 2500); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Landmark case — +${fmt(b)}`, "special"); }
        else if (sa.id === "bigcase") { const win = Math.random() < 0.6; if (win) { const g2 = 2000 + Math.round(Math.random() * 6000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Big case WIN — +${fmt(g2)}`, "pos"); ns.caseWins++; } else { const loss = 1000; ns.cash = Math.max(0, ns.cash - loss); ns.totalLost += loss; ns = lg(ns, `Big case LOST — -${fmt(loss)}`, "neg"); } }
        else if (sa.id === "retainer" && ns.cash >= 200) { ns.cash -= 200; ns.sponsorshipTurnsLeft += 5; ns.sponsorshipIncome = 300; ns = lg(ns, `Retainer secured — +$300/turn for 5 turns`, "special"); }
        else if (sa.id === "zoning") { if (Math.random() < 0.35) ns = lg(ns, `Zoning research: next property costs 20% less (effect tracked)`, "special"); }
        else if (sa.id === "network2" && Math.random() < 0.25) { const b = 500 + Math.round(Math.random() * 1000); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Broker deal — +${fmt(b)}`, "special"); }
        else if (sa.id === "staging") { ns = lg(ns, `Staging boost: next flip sells for 30% more`, "special"); }
        else if (sa.id === "lawstudy") { ns = lg(ns, `Law studies (+${sa.xp} XP)`); }
        else { ns = lg(ns, `${sa.name} — studying (+${sa.xp} XP)`); }

        // Unlock business at right tier
        const newTi = getTierIdx(career.tiers, ns.xp + sa.xp);
        if (newTi >= career.businessUnlockTier && !ns.businesses.find(b => b.careerId === career.id)) {
          ns.businesses = [...ns.businesses, {
            id: `${career.id}_biz`, careerId: career.id,
            name: career.businessName, level: 1,
            incomePerTurn: career.businessBase, upgradeCost: career.businessUpgradeCost,
          }];
          ns = lg(ns, `🏢 ${career.businessName} UNLOCKED — +${fmt(career.businessBase)}/turn!`, "special");
        }

        ns.xp = Math.round((ns.xp + sa.xp) * 10) / 10;
        ns.burnout = Math.min(100, ns.burnout + sa.burnout);

      } else if (ua) {
        // Unique actions
        if (ua.cost > 0 && ns.cash < ua.cost) { ns = lg(ns, `Need ${fmt(ua.cost)} for this action.`); }
        else {
          if (ua.cost > 0) ns.cash -= ua.cost;
          if (ua.id === "ipo") { if (Math.random() < 0.6) { const g2 = 6000 + Math.round(Math.random() * 12000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `IPO SUCCESS — +${fmt(g2)}!`, "special"); } else ns = lg(ns, `IPO failed. Lost investment.`, "neg"); }
          else if (ua.id === "patent") { ns.patentTurnsLeft = 6; ns.patentIncome = 300; ns = lg(ns, `Patent filed — +$300/turn for 6 turns`, "special"); }
          else if (ua.id === "acqui" && Math.random() < 0.3) { const b = 3000; ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Acqui-hire bonus — +${fmt(b)}`, "special"); }
          else if (ua.id === "short") { if (Math.random() < 0.45) { ns.cash += 3500; ns.totalEarned += 3500; ns = lg(ns, `Short trade WIN — +$3,500`, "pos"); } else { ns.totalLost += ua.cost; ns = lg(ns, `Short trade LOSS — -${fmt(ua.cost)}`, "neg"); } }
          else if (ua.id === "merger") { const g2 = 800 + Math.round(Math.random() * 1700); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `M&A advisory fee — +${fmt(g2)}`, "pos"); }
          else if (ua.id === "options") { if (Math.random() < 0.4) { const amt = Math.round(salary * 3); ns.cash += amt; ns.totalEarned += amt; ns = lg(ns, `Options 3× WIN — +${fmt(amt)}!`, "special"); } else ns = lg(ns, `Options expired worthless.`, "neg"); }
          else if (ua.id === "viral") { if (Math.random() < 0.5) { const g2 = 4000 + Math.round(Math.random() * 6000); ns.cash += g2; ns.totalEarned += g2; ns.followers += 500; ns = lg(ns, `WENT VIRAL — +${fmt(g2)} + 500 followers!`, "special"); } else ns = lg(ns, `Didn't go viral this time.`); }
          else if (ua.id === "sponsorship") { const inc = 400 + Math.round(Math.random() * 800); ns.sponsorshipTurnsLeft = 4; ns.sponsorshipIncome = inc; ns = lg(ns, `Sponsorship secured — +${fmt(inc)}/turn for 4 turns`, "special"); }
          else if (ua.id === "nft") { if (Math.random() < 0.35) { ns.cash += 5000; ns.totalEarned += 5000; ns = lg(ns, `NFT drop SOLD OUT — +$5,000!`, "special"); } else ns = lg(ns, `NFT drop flopped.`, "neg"); }
          else if (ua.id === "trial") { if (Math.random() < 0.7) { const g2 = 5000 + Math.round(Math.random() * 7000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Clinical trial SUCCESS — +${fmt(g2)}`, "pos"); } else ns = lg(ns, `Trial inconclusive.`); }
          else if (ua.id === "hospital") { ns.hospitalPassive += 600; ns = lg(ns, `Hospital equity: +$600/turn forever`, "special"); }
          else if (ua.id === "patent2") { ns.patentTurnsLeft += 8; ns.patentIncome = Math.max(ns.patentIncome, 250); ns = lg(ns, `Medical patent: +$250/turn for 8 turns`, "special"); }
          else if (ua.id === "luxury") { const propId = `prop_luxury_${Date.now()}`; ns.properties = [...ns.properties, { id: propId, address: `${Math.floor(Math.random()*999)+1} Luxury Lane`, type: "luxury", purchasePrice: ua.cost, currentValue: ua.cost, rentPerTurn: 500, isFlipping: false, flipTurnsLeft: 0 }]; ns = lg(ns, `Luxury property purchased — +$500/turn`, "special"); }
          else if (ua.id === "commercial") { ns.shortTermRentalTurnsLeft = 12; ns.shortTermRentalIncome = 400; ns = lg(ns, `Commercial lease: +$400/turn for 12 turns`, "special"); }
          else if (ua.id === "auct") { if (Math.random() < 0.55) { const g2 = 3000 + Math.round(Math.random() * 4000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Auction flip WIN — +${fmt(g2)}`, "pos"); } else ns = lg(ns, `Auction bid lost.`, "neg"); }
          else if (ua.id === "settlement") { const g2 = 1000 + Math.round(Math.random() * 4000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Settlement won — +${fmt(g2)}`, "pos"); }
          else if (ua.id === "classact") { if (Math.random() < 0.5) { const g2 = 10000 + Math.round(Math.random() * 10000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `CLASS ACTION WIN — +${fmt(g2)}!!!`, "special"); } else ns = lg(ns, `Class action dismissed.`, "neg"); }
          else if (ua.id === "arbitra" && Math.random() < 0.7) { const g2 = 2000; ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Arbitration WIN — +${fmt(g2)}`, "pos"); }
        }
        if (ua.xp) { ns.xp = Math.round((ns.xp + ua.xp) * 10) / 10; }
      }
    }

    // Promotion check
    const newTi = getTierIdx(career.tiers, ns.xp);
    if (newTi > prevTier) {
      const nt = career.tiers[newTi];
      ns = lg(ns, `🎉 PROMOTED: ${nt.name}! Salary: ${fmt(nt.income)}/mo`, "special");
      setEventBanner({ type: "good", icon: "⭐", title: "Promotion!", sub: `You are now a ${nt.name}.`, result: `Salary: ${fmt(nt.income)}/mo` });
    }

    ns.topSalary = Math.max(ns.topSalary ?? 0, salary);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setG(ns); setSelAction(null); setShowBJ(false); setShowStocks(false); setShowRE(false);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleBJFinish(newCash: number, profit: number) {
    if (!g) return;
    let ns: GameState = { ...g, cash: newCash, casinoProfit: g.casinoProfit + profit };
    if (profit > 0) { ns.totalEarned += profit; ns = lg(ns, `Casino — Won ${fmt(profit)}`, "pos"); }
    else if (profit < 0) { ns.totalLost += Math.abs(profit); ns = lg(ns, `Casino — Lost ${fmt(Math.abs(profit))}`, "neg"); }
    else ns = lg(ns, `Casino — Break even`);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setG(ns); setShowBJ(false); setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleStockTrade(newCash: number, newH: Holding[]) {
    if (!g) return;
    setG({ ...g, cash: newCash, holdings: newH });
  }

  function finishStockTurn() {
    if (!g) return;
    let ns = applyBondReturn({ ...g });
    ns = lg(ns, `Stocks: reviewed positions`);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setG(ns); setShowStocks(false); setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleREBuy(type: typeof PROPERTY_TYPES[number]) {
    if (!g || g.cash < type.buyPrice) return;
    const propId = `prop_${Date.now()}`;
    const addresses = ["123 Oak St", "456 Maple Ave", "789 Pine Rd", "321 Elm Blvd", "654 Cedar Ct", "987 Birch Ln", "246 Walnut Way", "135 Spruce Dr"];
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    let ns: GameState = {
      ...g, cash: g.cash - type.buyPrice,
      properties: [...g.properties, { id: propId, address, type: type.type, purchasePrice: type.buyPrice, currentValue: type.buyPrice, rentPerTurn: type.rentPerTurn, isFlipping: false, flipTurnsLeft: 0 }],
    };
    ns = lg(ns, `Bought ${type.name} (${address}) — +${fmt(type.rentPerTurn)}/turn rent`, "special");
    setG(ns);
  }

  function handleREFlip(id: string) {
    if (!g) return;
    const def = g.properties.find(p => p.id === id);
    if (!def) return;
    const ptDef = PROPERTY_TYPES.find(pt => pt.type === def.type)!;
    let ns: GameState = {
      ...g,
      properties: g.properties.map(p => p.id === id ? { ...p, isFlipping: true, flipTurnsLeft: ptDef.flipTurns } : p),
    };
    ns = lg(ns, `🔨 Started flipping ${def.address} — completes in ${ptDef.flipTurns} turns`, "special");
    setG(ns);
  }

  function handleRESell(id: string) {
    if (!g) return;
    const prop = g.properties.find(p => p.id === id);
    if (!prop) return;
    let ns: GameState = {
      ...g, cash: g.cash + prop.currentValue,
      properties: g.properties.filter(p => p.id !== id),
    };
    ns.totalEarned += Math.max(0, prop.currentValue - prop.purchasePrice);
    ns = lg(ns, `Sold ${prop.address} for ${fmt(prop.currentValue)}`, "pos");
    setG(ns);
  }

  function finishRETurn() {
    if (!g) return;
    let ns = applyBondReturn({ ...g });
    ns = lg(ns, `Real estate: reviewed portfolio`);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setG(ns); setShowRE(false); setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function startGame() {
    if (!selCareer) return;
    savedRef.current = false;
    setG(initGame(selCareer));
    setSelAction(null); setShowBJ(false); setShowStocks(false); setShowRE(false); setEventBanner(null);
    setScreen("game");
  }

  function fullReset() {
    setSelCareer(null); setG(null); setSelAction(null);
    setShowBJ(false); setShowStocks(false); setShowRE(false); setEventBanner(null);
    setScreen("start");
  }

  function getPhase(turn: number) {
    if (turn <= 15) return "Early Career";
    if (turn <= 35) return "Building Momentum";
    if (turn <= 55) return "Mid Career";
    if (turn <= 68) return "Final Stretch";
    return "Last Push 🔥";
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-black text-white">Checking login...</div>;

  // ── START ─────────────────────────────────────────────────────────────────
  if (screen === "start") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
            <h1 className="text-5xl font-black">The <span className="text-yellow-300">Grind</span></h1>
            <p className="mt-3 max-w-xl text-white/60">80 months. One shot. Build a career, flip properties, play epic blackjack with crazy side bets, pick stocks, build businesses. Your net worth is your score.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black text-white transition hover:scale-105 hover:bg-white/15">Menu</Link>
            <button onClick={() => setScreen("career")} className="rounded-2xl bg-yellow-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">Choose Career →</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[["80","Months"],["6","Careers"],["3","Casino Hands"],["∞","Side Bets"]].map(([n,l])=>(
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
              ["💼 Work & Study","Earn salary, gain XP, unlock tiers. Each career has 5 unique study actions."],
              ["🏠 Real Estate","Buy starter homes, mid-range, luxury & commercial. Hold for rent or flip for big gains."],
              ["♠ Epic Blackjack","3 hands per visit. Crazy side bets: Lucky 7s (3×), Perfect Pair (25×), Triple 7s (100×)!"],
              ["📊 Stocks","Buy & sell 10 stocks with $10 minimum. Finance gets 2× leverage."],
              ["🏢 Business","Unlock your career's business at mid-tier. Upgrade it for exponential income."],
              ["⚡ Unique Actions","Each career has 3 special high-risk, high-reward moves only they can take."],
            ].map(([t,d])=>(
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

  // ── CAREER PICK ───────────────────────────────────────────────────────────
  if (screen === "career") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
            <h1 className="text-4xl font-black">Choose Your Career</h1>
            <p className="mt-2 text-white/60">Each path has unique study actions, special abilities, and a business to build. Permanent choice.</p>
          </div>
          <button onClick={() => setScreen("start")} className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:scale-105 hover:bg-white/15">← Back</button>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {CAREERS.map(c => (
            <button key={c.id} onClick={() => setSelCareer(c.id)}
              className={`rounded-3xl border p-5 text-left transition hover:scale-[1.02] relative ${selCareer === c.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-white/5 hover:bg-white/10"} backdrop-blur`}>
              {selCareer === c.id && <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-300 flex items-center justify-center text-zinc-950 font-black text-xs">✓</div>}
              <div className="text-3xl mb-2">{c.icon}</div>
              <h3 className={`font-black text-lg mb-1 ${c.color}`}>{c.name}</h3>
              <p className="text-sm text-white/60 mb-3 leading-relaxed">{c.tagline}</p>
              <div className="space-y-1">{c.perks.map((p, i) => <p key={i} className="text-xs text-yellow-300">✦ {p}</p>)}</div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/40">🏢 Business: <span className="text-white/60">{c.businessName}</span></p>
                <p className="text-xs text-white/40">Max salary: <span className="text-yellow-300">{new Intl.NumberFormat().format(c.tiers[c.tiers.length-1].income)}/mo</span></p>
              </div>
            </button>
          ))}
        </div>
        {selCareer && (() => {
          const sc = CAREERS.find(c => c.id === selCareer)!;
          return (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur mb-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Career Ladder</h3>
                  {sc.tiers.map((t, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b border-white/5">
                      <span className={i === 0 ? "text-white/60" : "text-white/30"}>{t.name}</span>
                      <span className="text-yellow-300 font-black">${t.income.toLocaleString()}/mo</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Study Actions (5)</h3>
                  {sc.studyActions.map(sa => (
                    <div key={sa.id} className="py-1.5 border-b border-white/5">
                      <p className="font-bold text-xs">{sa.icon} {sa.name}</p>
                      <p className="text-[10px] text-white/40">+{sa.xp} XP · +{sa.burnout}% burnout</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Unique Actions (3)</h3>
                  {sc.uniqueActions?.map((ua: { id: string; icon: string; name: string; desc: string; cost: number }) => (
                    <div key={ua.id} className="py-1.5 border-b border-white/5">
                      <p className="font-bold text-xs">{ua.icon} {ua.name}</p>
                      <p className="text-[10px] text-white/40">{ua.desc}</p>
                    </div>
                  ))}
                  <div className="mt-3 p-3 rounded-xl bg-yellow-300/10 border border-yellow-300/20">
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

  // ── GAME ──────────────────────────────────────────────────────────────────
  if (screen === "game" && g && career) {
    const hustleUnlocked = g.xp >= career.hustleXpReq;
    const hasBusiness = g.businesses.find(b => b.careerId === career.id);
    const biz = hasBusiness;

    const actionList = [
      { id: "work",      icon: career.icon, name: career.workName, desc: `+${new Intl.NumberFormat().format(salary)} income`, badge: "Safe",      badgeCls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", disabled: false },
      ...career.studyActions.map(sa => ({ id: sa.id, icon: sa.icon, name: sa.name, desc: sa.desc, badge: "+XP", badgeCls: "bg-blue-900/60 text-blue-300 border-blue-700", disabled: false })),
      { id: "bonds",     icon: "💰", name: "Bonds/Index", desc: `Invest 20% ($${Math.round(g.cash*.2).toLocaleString()}) safely`, badge: "Stable",   badgeCls: "bg-indigo-900/60 text-indigo-300 border-indigo-700", disabled: g.cash < 100 },
      { id: "stocks",    icon: "📊", name: "Stock Market", desc: "10 stocks. Min $10/share. 2× leverage (finance).", badge: "Variable", badgeCls: "bg-yellow-900/60 text-yellow-300 border-yellow-700", disabled: false },
      { id: "realestate",icon: "🏠", name: "Real Estate",  desc: "Buy, rent, flip properties. 4 property types.", badge: "RE Market",badgeCls: "bg-orange-900/60 text-orange-300 border-orange-700",  disabled: false },
      { id: "casino",    icon: "♠️", name: "Epic Casino",  desc: "3 BJ hands. Side bets up to 100× payout!", badge: "High Risk",badgeCls: "bg-red-900/60 text-red-300 border-red-700",          disabled: g.cash < 10 },
      { id: "rest",      icon: "😴", name: "Rest",         desc: `-${Math.min(g.burnout,28)}% burnout`, badge: "Recovery", badgeCls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", disabled: false },
      { id: "hustle",    icon: "🚀", name: career.hustleName, desc: hustleUnlocked ? `High reward hustle` : `Needs ${career.hustleXpReq} XP`, badge: hustleUnlocked ? "Hustle" : "Locked", badgeCls: hustleUnlocked ? "bg-yellow-900/60 text-yellow-300 border-yellow-700" : "bg-zinc-800 text-white/30 border-zinc-700", disabled: !hustleUnlocked },
      ...(biz ? [{ id: "upgrade_business", icon: "🏢", name: `Upgrade ${biz.name}`, desc: `Lvl ${biz.level} → Lvl ${biz.level+1}. Cost: $${biz.upgradeCost.toLocaleString()}`, badge: "Business", badgeCls: "bg-purple-900/60 text-purple-300 border-purple-700", disabled: g.cash < biz.upgradeCost }] : []),
      ...(career.uniqueActions?.map((ua: { id: string; icon: string; name: string; desc: string; cost: number }) => ({ id: ua.id, icon: ua.icon, name: ua.name, desc: ua.desc, badge: "⚡ Unique", badgeCls: "bg-pink-900/60 text-pink-300 border-pink-700", disabled: ua.cost > g.cash })) ?? []),
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
              <h1 className="text-2xl font-black">The <span className="text-yellow-300">Grind</span></h1>
            </div>
            <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 font-black text-sm transition hover:scale-105 hover:bg-white/15">Menu</Link>
          </div>

          {/* HUD */}
          <div className="grid grid-cols-3 gap-2 md:grid-cols-7 mb-3">
            {[
              { label: "Net Worth", value: `$${netWorth.toLocaleString()}`,     color: "text-yellow-300" },
              { label: "Cash",      value: `$${Math.round(g.cash).toLocaleString()}`,  color: "text-white"      },
              { label: "Bonds",     value: `$${Math.round(g.bonds).toLocaleString()}`, color: "text-indigo-300" },
              { label: "Stocks",    value: `$${Math.round(stockVal).toLocaleString()}`,color: "text-blue-300"   },
              { label: "Property",  value: `$${Math.round(propVal).toLocaleString()}`, color: "text-orange-300" },
              { label: "Salary",    value: `$${salary.toLocaleString()}`,        color: "text-emerald-300"},
              { label: "Month",     value: `${g.turn}/${TOTAL_TURNS}`,          color: "text-white"      },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/40">{label}</p>
                <p className={`text-sm font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-black text-yellow-300">{getPhase(g.turn)}</span>
              <span className="text-white/40">{tier?.name} · {career.name} {biz ? `· 🏢 ${biz.name} Lvl${biz.level} (+$${biz.incomePerTurn}/turn)` : ""}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full" style={{ width: `${(g.turn/TOTAL_TURNS)*100}%` }} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-3">
              {/* Event */}
              {eventBanner && (
                <div className={`rounded-2xl border p-3 flex items-center gap-3 ${eventBanner.type==="good"?"border-emerald-500/30 bg-emerald-900/30 text-emerald-300":eventBanner.type==="bad"?"border-red-500/30 bg-red-900/30 text-red-300":"border-blue-500/30 bg-blue-900/30 text-blue-300"}`}>
                  <span className="text-2xl">{eventBanner.icon}</span>
                  <div><p className="font-black text-sm">{eventBanner.title}</p><p className="text-xs opacity-80">{eventBanner.sub} {eventBanner.result && `(${eventBanner.result})`}</p></div>
                </div>
              )}

              {/* Actions */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur shadow-2xl">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">This Month&apos;s Action</h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {actionList.map(a => (
                    <button key={a.id} onClick={() => !a.disabled && setSelAction(a.id)} disabled={a.disabled}
                      className={`rounded-2xl border p-2.5 text-left transition relative ${selAction===a.id?"border-yellow-300 bg-yellow-300/10":"border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20"} disabled:opacity-25 disabled:cursor-not-allowed hover:scale-[1.02]`}>
                      {selAction===a.id && <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-300 rounded-t-2xl"/>}
                      <div className="absolute top-1.5 right-1.5"><span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${a.badgeCls}`}>{a.badge}</span></div>
                      <div className="text-lg mb-1.5">{a.icon}</div>
                      <p className="font-black text-xs mb-0.5 leading-tight">{a.name}</p>
                      <p className="text-[9px] text-white/40 leading-relaxed">{a.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Sub-panels */}
                {selAction === "bonds" && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <h3 className="font-black mb-2">Bonds & Index Funds</h3>
                    <p className="text-sm text-white/60 mb-2">Invest 20% of cash (${Math.round(g.cash*0.20).toLocaleString()}) into diversified bonds. Returns compound with market cycle.</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40">Trend:</span>
                      <span className={`font-black ${ml.color}`}>{ml.text} ({mRate>=0?"+":""}{Math.round(mRate*100)}%)</span>
                    </div>
                    {g.marketHint && g.turn < TOTAL_TURNS && (
                      <div className="mt-2 rounded-xl bg-black/40 p-3">
                        <p className="text-xs text-yellow-300 font-black mb-2">Insider Forecast</p>
                        {Array.from({length:5},(_,i)=>i+1).map(i=>{const fr=MARKET[g.turn+i-1]??0;const fl=mktLabel(fr);return(<div key={i} className="flex justify-between text-xs mb-1"><span className="text-white/40">Month +{i}</span><span className={fl.color}>{fr>=0?"▲":"▼"} {Math.abs(Math.round(fr*100))}%</span></div>);})}
                      </div>
                    )}
                    {g.bonds > 0 && <p className="text-xs text-white/40 mt-2">Current bonds: ${Math.round(g.bonds).toLocaleString()}</p>}
                    {career.special==="marketBonus"&&tierIdx>=3&&<p className="text-xs text-yellow-300 mt-1">✦ Engineer bonus: +2.5% active</p>}
                  </div>
                )}

                {selAction === "stocks" && showStocks && (
                  <div className="mt-3">
                    <StockPanel cash={g.cash} holdings={g.holdings} prices={g.stockPrices} history={g.stockHistory} isFinance={career.special==="leverage"} onTrade={handleStockTrade} />
                    <button onClick={finishStockTurn} className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">Done trading — end month →</button>
                  </div>
                )}

                {selAction === "realestate" && showRE && (
                  <div className="mt-3">
                    <RealEstateMarket cash={g.cash} properties={g.properties} onBuy={handleREBuy} onFlip={handleREFlip} onSell={handleRESell} />
                    <button onClick={finishRETurn} className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">Done with real estate — end month →</button>
                  </div>
                )}

                {selAction === "casino" && showBJ && (
                  <div className="mt-3">
                    <EpicBlackjack cash={g.cash} onFinish={handleBJFinish} />
                  </div>
                )}

                {!showBJ && !showStocks && !showRE && (
                  <button onClick={selAction==="casino"?()=>setShowBJ(true):selAction==="stocks"?()=>setShowStocks(true):selAction==="realestate"?()=>setShowRE(true):confirmAction} disabled={!selAction}
                    className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 text-base transition hover:scale-105 hover:bg-yellow-200 disabled:scale-100 disabled:opacity-30">
                    {selAction?(selAction==="casino"?"Go to casino →":selAction==="stocks"?"Open stock market →":selAction==="realestate"?"Open real estate market →":"Confirm action →"):"Choose an action above"}
                  </button>
                )}
              </section>

              {/* Log */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest">Activity Log</h2>
                  <span className="text-xs text-white/20">{g.log.length} entries</span>
                </div>
                <div ref={logRef} className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {g.log.length === 0 && <p className="text-white/30 text-xs">No activity yet.</p>}
                  {g.log.slice(0,12).map((e,i) => (
                    <div key={i} className={`flex gap-2 text-xs py-1 border-b border-white/5 ${e.type==="pos"?"text-emerald-300":e.type==="neg"?"text-red-300":e.type==="special"?"text-yellow-300":"text-white/50"}`}>
                      <span className="text-white/20 flex-shrink-0">T{e.turn}</span>{e.msg}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* SIDEBAR */}
            <aside className="flex flex-col gap-3">
              {/* Stats */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Stats</h2>
                {[
                  { label:"Job",        value: tier?.name??"",                              color:"text-blue-300"   },
                  { label:"XP",         value: g.xp.toFixed(1)+" XP",                      color:"text-white"      },
                  { label:"Passive/mo", value: `$${(g.passive+rentPerTurn+businessIncome).toLocaleString()}`, color:"text-emerald-300" },
                  ...(g.properties.length>0?[{label:"Properties", value:`${g.properties.length} owned`, color:"text-orange-300"}]:[]),
                  ...(biz?[{label:`${biz.name}`, value:`Lvl ${biz.level} · $${biz.incomePerTurn}/turn`, color:"text-purple-300"}]:[]),
                  ...(g.followers>0?[{label:"Followers", value:`${g.followers.toLocaleString()}`, color:"text-pink-300"}]:[]),
                ].map(({label,value,color})=>(
                  <div key={label} className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
                    <span className={`font-black text-xs ${color}`}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-white/30">Burnout</span>
                  <span className={`font-black text-xs ${burnoutColor}`}>{Math.round(g.burnout)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${g.burnout>70?"bg-red-400":g.burnout>45?"bg-yellow-300":"bg-emerald-400"}`} style={{width:`${g.burnout}%`}}/>
                </div>
                {g.burnout>45&&<p className="text-[10px] text-yellow-300 mt-1">⚠ -{Math.round((1-bm)*100)}% income penalty</p>}

                {/* Active passives */}
                {(g.patentTurnsLeft>0||g.sponsorshipTurnsLeft>0||g.shortTermRentalTurnsLeft>0||g.pharmaPassive>0||g.hospitalPassive>0) && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Active Streams</p>
                    {g.patentTurnsLeft>0&&<p className="text-[10px] text-blue-300">📋 Patent: +${g.patentIncome}/turn ({g.patentTurnsLeft} left)</p>}
                    {g.sponsorshipTurnsLeft>0&&<p className="text-[10px] text-pink-300">💰 Sponsorship: +${g.sponsorshipIncome}/turn ({g.sponsorshipTurnsLeft} left)</p>}
                    {g.shortTermRentalTurnsLeft>0&&<p className="text-[10px] text-orange-300">🏖️ Rental: +${g.shortTermRentalIncome}/turn ({g.shortTermRentalTurnsLeft} left)</p>}
                    {g.pharmaPassive>0&&<p className="text-[10px] text-red-300">💊 Pharma: +${g.pharmaPassive}/turn</p>}
                    {g.hospitalPassive>0&&<p className="text-[10px] text-red-300">🏥 Hospital: +${g.hospitalPassive}/turn</p>}
                  </div>
                )}
              </div>

              {/* Market */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Market</h2>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-black text-xs ${ml.color}`}>{ml.text}</span>
                  <span className={`font-black text-xs ${ml.color}`}>{mRate>=0?"+":""}{Math.round(mRate*100)}%</span>
                </div>
                <div className="flex items-end gap-0.5 h-6 mb-2">
                  {Array.from({length:10},(_,i)=>g.turn-10+i).filter(t=>t>=1&&t<=TOTAL_TURNS).map(t=>{const r=MARKET[t-1]??0;const h=Math.max(3,Math.round(Math.abs(r)*140));return<div key={t} className="flex-1 rounded-sm" style={{height:h,background:r>=0?"#34d399":"#f87171"}}/>;  })}
                </div>
                {g.marketHint&&g.turn<TOTAL_TURNS&&<p className="text-[10px] text-yellow-300">Insider: next {mktLabel(MARKET[g.turn]??0).text}</p>}
                {g.bonds>0&&<p className="text-[10px] text-white/40 mt-0.5">Bonds: ${Math.round(g.bonds).toLocaleString()}</p>}
                {stockVal>0&&<p className="text-[10px] text-blue-300">Stocks: ${Math.round(stockVal).toLocaleString()}</p>}
                {propVal>0&&<p className="text-[10px] text-orange-300">Property: ${Math.round(propVal).toLocaleString()}</p>}
              </div>

              {/* Career ladder */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Career Path</h2>
                {career.tiers.map((t,i)=>{const done=i<tierIdx,active=i===tierIdx,next=i===tierIdx+1;return(
                  <div key={i} className={`flex items-center gap-2 py-1 border-b border-white/5 text-xs ${active?"text-white":done?"text-white/40":"text-white/15"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active?"bg-yellow-300":done?"bg-emerald-500":"bg-white/10"}`}/>
                    <span className={`flex-1 text-[10px] ${active?"font-black":""}`}>{t.name}</span>
                    {active&&<span className="text-yellow-300 text-[9px]">now</span>}
                    {next&&<span className="text-white/30 text-[9px]">{(t.req-g.xp).toFixed(1)} XP</span>}
                  </div>
                );})}
              </div>

              {/* Properties quick view */}
              {g.properties.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Properties</h2>
                  {g.properties.map(p=>{const pDef=PROPERTY_TYPES.find(pt=>pt.type===p.type)!;return(
                    <div key={p.id} className="flex justify-between text-[10px] py-1 border-b border-white/5">
                      <span>{pDef.icon} {p.address.split(" ").slice(0,2).join(" ")}</span>
                      {p.isFlipping?<span className="text-orange-300">🔨 {p.flipTurnsLeft}t</span>:<span className="text-emerald-300">+${p.rentPerTurn}/t</span>}
                    </div>
                  );})}
                  <div className="flex justify-between text-[10px] pt-1 font-black">
                    <span className="text-white/40">Total value</span>
                    <span className="text-orange-300">${Math.round(propVal).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Holdings */}
              {g.holdings.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Stock Holdings</h2>
                  {g.holdings.map(h=>{const price=g.stockPrices[h.id]??h.avgCost;const pnl=Math.round((price-h.avgCost)*h.shares*100)/100;return(
                    <div key={h.id} className="flex justify-between text-[10px] py-1 border-b border-white/5">
                      <span className="font-black text-yellow-300 w-8">{h.ticker}</span>
                      <span className="text-white/40">{h.shares}sh</span>
                      <span className={pnl>=0?"text-emerald-300":"text-red-300"}>{pnl>=0?"+":""}{pnl>=0?"$"+Math.round(pnl).toLocaleString():"-$"+Math.round(Math.abs(pnl)).toLocaleString()}</span>
                    </div>
                  );})}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ── END ───────────────────────────────────────────────────────────────────
  if (screen === "end" && g && career) {
    const sv = g.holdings.reduce((sum,h)=>sum+h.shares*(g.stockPrices[h.id]??0),0);
    const pv = g.properties.reduce((sum,p)=>sum+p.currentValue,0);
    const score = Math.round(g.cash+g.bonds+sv+pv);
    const fi = getTierIdx(career.tiers,g.xp);
    const all = [...LEADERBOARD,{name:"You",score}].sort((a,b)=>b.score-a.score);
    const rank = all.findIndex(p=>p.name==="You")+1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event — Complete</p>
              <h1 className="text-5xl font-black text-yellow-300">${score.toLocaleString()}</h1>
              <p className="mt-2 text-white/60">{career.tiers[fi].name} · {career.name} · 80-month career</p>
            </div>
            <div className="flex gap-3">
              <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:scale-105 hover:bg-white/15">Menu</Link>
              <button onClick={fullReset} className="rounded-2xl bg-yellow-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">Play Again</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
            {[["Peak Title",career.tiers[fi].name],["Skill XP",g.xp.toFixed(1)+" XP"],["Bond Portfolio","$"+Math.round(g.bonds).toLocaleString()],["Stock Portfolio","$"+Math.round(sv).toLocaleString()],["Property Value","$"+Math.round(pv).toLocaleString()],["Casino P/L",(g.casinoProfit>=0?"+":"")+fmt(g.casinoProfit)],["Businesses",g.businesses.map(b=>b.name).join(", ")||"None"],["Properties",g.properties.length+" owned"]].map(([l,v])=>(
              <div key={l as string} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-1">{l}</p>
                <p className="text-base font-black">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl mb-6">
            <h2 className="text-2xl font-black mb-4">Wealth breakdown</h2>
            {([["Salary & wages",g.totalEarned-Math.max(0,g.casinoProfit),true],["Casino net",g.casinoProfit,g.casinoProfit>=0],["Bond portfolio",Math.round(g.bonds),true],["Stock portfolio",Math.round(sv),true],["Property equity",Math.round(pv),true],["Total losses",-g.totalLost,false]] as [string,number,boolean][]).map(([l,v,pos])=>(
              <div key={l} className="flex justify-between py-2 border-b border-white/10 text-sm">
                <span className="text-white/60">{l}</span>
                <span className={`font-black ${v>=0&&pos?"text-emerald-300":"text-red-300"}`}>{v>=0?"+":""}{fmt(Math.abs(v))}</span>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black">Leaderboard</h2>
              <span className="rounded-full bg-yellow-300/20 px-3 py-1 text-sm font-black text-yellow-300">Rank #{rank}</span>
            </div>
            <div className="space-y-2">
              {all.map((p,i)=>(
                <div key={p.name} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${p.name==="You"?"bg-yellow-300/10 border border-yellow-300/30":"bg-black/25"}`}>
                  <span className={`font-black w-8 text-sm ${i===0?"text-yellow-300":i===1?"text-white/60":i===2?"text-amber-600":"text-white/30"}`}>#{i+1}</span>
                  <span className={`flex-1 font-bold ${p.name==="You"?"text-yellow-300":"text-white/60"}`}>{p.name==="You"?"⭐ You":p.name}</span>
                  <span className="font-black">${p.score.toLocaleString()}</span>
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