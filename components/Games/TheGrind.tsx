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
type Property = {
  id: string; address: string;
  type: "starter" | "mid" | "luxury" | "commercial";
  purchasePrice: number; currentValue: number;
  rentPerTurn: number; isFlipping: boolean; flipTurnsLeft: number;
};
type Business = {
  id: string; careerId: string; name: string; level: number;
  incomePerTurn: number; upgradeCost: number; maxLevel: number;
};
type CryptoHolding = { coin: string; amount: number; avgCost: number };
type LifeEvent = { id: string; title: string; desc: string; chosen: boolean };

type GameState = {
  turn: number; cash: number; bonds: number; xp: number; burnout: number;
  passive: number; marketHint: boolean; specialised: boolean; prodBoost: number;
  casinoProfit: number; totalEarned: number; totalLost: number; careerId: string;
  log: LogEntry[]; holdings: Holding[]; stockPrices: Record<string, number>;
  stockHistory: Record<string, number[]>; properties: Property[];
  businesses: Business[];
  patentTurnsLeft: number; patentIncome: number;
  sponsorshipTurnsLeft: number; sponsorshipIncome: number;
  shortTermRentalTurnsLeft: number; shortTermRentalIncome: number;
  pharmaPassive: number; hospitalPassive: number;
  followers: number; caseWins: number;
  reitPassive: number; merchPassive: number;
  discountNextProperty: boolean; stagingBoost: boolean;
  topSalary: number;
  redevPassive: number;
  lawRetainerIncome: number; lawRetainerTurns: number;
  cryptoHoldings: CryptoHolding[];
  cryptoPrices: Record<string, number>;
  cryptoHistory: Record<string, number[]>;
  lifeEvents: LifeEvent[];
  angelInvestments: { company: string; cost: number; turnInvested: number }[];
  angelPassive: number;
  vcFundPassive: number;
  vodkaTurnsLeft: number;
  energyDrinkTurns: number;
  networkingBonus: number;
  networkingTurns: number;
  coachingPassive: number;
  podcastPassive: number;
  ghostwritingPassive: number;
  nftRoyaltyPassive: number;
  lawsuitDefenseCost: number;
  blackmarketTurns: number;
  blackmarketPassive: number;
  therapyActive: boolean;
};

// ─── MARKET ───────────────────────────────────────────────────────────────────
const MARKET: number[] = (() => {
  const m: number[] = [];
  for (let i = 0; i < TOTAL_TURNS; i++) {
    const base = Math.sin(i * 0.22) * 0.06 + Math.sin(i * 0.07) * 0.04;
    const noise = (Math.random() - 0.47) * 0.06;
    m.push(Math.round((base + noise) * 1000) / 1000);
  }
  return m;
})();

// ─── CAREERS ─────────────────────────────────────────────────────────────────
const CAREERS = [
  {
    id: "tech", icon: "💻", name: "Software Engineer", color: "text-blue-300",
    tagline: "High ceiling, slow start. Study hard, compound gains.",
    startCash: 600, special: "marketBonus",
    specialDesc: "Senior+: +2.5% bond returns. Build SaaS → passive empire.",
    perks: ["Senior+: +2.5% bond returns", "OSS recruiter bonuses", "SaaS scales to $6k/turn"],
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
      { id: "cs",   icon: "📚", name: "Study CS",         desc: "+1.0 XP. Core algorithms.",              xp: 1.0, burnout: 5  },
      { id: "sys",  icon: "🏗️", name: "System Design",    desc: "+1.7 XP. Architect at scale.",           xp: 1.7, burnout: 9  },
      { id: "oss",  icon: "🌐", name: "Open Source",      desc: "+0.6 XP. 25% recruiter bonus $300-800.", xp: 0.6, burnout: 3  },
      { id: "ai",   icon: "🤖", name: "AI/ML Deep Dive",  desc: "+2.0 XP. 30% AI consulting deal $1-5k.", xp: 2.0, burnout: 12 },
      { id: "cert", icon: "🎓", name: "Get Certified",    desc: "+0.8 XP. 40% bonus $500.",               xp: 0.8, burnout: 4  },
    ],
    workName: "Ship Features", workBurnout: 8,
    hustleName: "Freelance Sprint", hustleBurnout: 20, hustleMulti: 1.9, hustleXpReq: 6,
    businessName: "SaaS Product", businessBase: 220, businessUpgradeMult: 1.9, businessUpgradeCost: 1800, businessUnlockTier: 3, businessMaxLevel: 7,
    uniqueActions: [
      { id: "ipo",     icon: "🚀", name: "IPO Planning",    desc: "Costs $2000. 60% → +$6k–18k.",          cost: 2000, xp: 0.5 },
      { id: "patent",  icon: "⚡", name: "File Patent",     desc: "Costs $800. +$300/turn × 6 turns.",     cost: 800,  xp: 0.3 },
      { id: "acqui",   icon: "🏢", name: "Acqui-hire",      desc: "+1.5 XP. 30% → $3,000 bonus.",         cost: 0,    xp: 1.5 },
      { id: "angel",   icon: "😇", name: "Angel Invest",    desc: "Costs $1500. 40% → 5-15× in 10 turns.",cost: 1500, xp: 0.4 },
      { id: "mentor",  icon: "🎯", name: "Mentor Juniors",  desc: "Costs $0. +$200/turn forever.",         cost: 0,    xp: 0.3 },
    ],
    extraActivities: [
      { id: "podcast",  icon: "🎙️", name: "Tech Podcast",    desc: "Start a podcast. +$150/turn passive.",  cost: 300  },
      { id: "course2",  icon: "📖", name: "Sell Udemy Course",desc: "Costs $200. 70% → $800-3k one-time.",  cost: 200  },
      { id: "consult",  icon: "💼", name: "AI Consulting",    desc: "Needs AI skill. $2k-8k per gig.",       cost: 0    },
      { id: "hackathon",icon: "⚔️", name: "Win Hackathon",   desc: "Free. 50% → $1k-4k + followers.",      cost: 0    },
      { id: "buyvc",    icon: "🏦", name: "Buy VC Fund",      desc: "Costs $5000. +$800/turn passive.",     cost: 5000 },
    ],
  },
  {
    id: "finance", icon: "📈", name: "Finance & Trading", color: "text-emerald-300",
    tagline: "Lives by the market. Highest ceiling if you time it right.",
    startCash: 700, special: "leverage",
    specialDesc: "2× stock leverage. Quarterly bonuses. Short selling.",
    perks: ["2× stock leverage on all trades", "Quarterly bonus events", "Hedge Fund → $8k/turn"],
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
      { id: "cfa",    icon: "📊", name: "CFA Studies",    desc: "+1.2 XP. Finance credential.",           xp: 1.2, burnout: 7  },
      { id: "quant",  icon: "🧮", name: "Quant Methods",  desc: "+2.0 XP. 40% algo bonus $2k-6k.",       xp: 2.0, burnout: 13 },
      { id: "net",    icon: "🤝", name: "Network",        desc: "+0.5 XP. 20% deal $400-1300.",          xp: 0.5, burnout: 3  },
      { id: "hedge",  icon: "🏦", name: "Hedge Strategy", desc: "+1.5 XP. 35% → $1k-3k bonus.",         xp: 1.5, burnout: 8  },
      { id: "crypto", icon: "🪙", name: "Crypto Trade",   desc: "+0.7 XP. 50% → ±$2500.",               xp: 0.7, burnout: 5  },
    ],
    workName: "Analyze & Trade", workBurnout: 9,
    hustleName: "Prop Trade", hustleBurnout: 6, hustleMulti: 0, hustleXpReq: 5,
    businessName: "Investment Fund", businessBase: 350, businessUpgradeMult: 2.0, businessUpgradeCost: 2500, businessUnlockTier: 2, businessMaxLevel: 7,
    uniqueActions: [
      { id: "short",   icon: "📉", name: "Short a Stock",   desc: "Costs $1000. 45% → +$3500. 55% lose.", cost: 1000, xp: 0.3 },
      { id: "merger",  icon: "🤝", name: "M&A Advisory",    desc: "Costs $500. Guaranteed $800-2500.",     cost: 500,  xp: 0.4 },
      { id: "options", icon: "📋", name: "Options 3×",      desc: "+1.0 XP. 40% → triple your bet.",      cost: 0,    xp: 1.0 },
      { id: "angel",   icon: "😇", name: "Angel Invest",    desc: "Costs $1500. 40% → 5-15× in 10 turns.",cost: 1500, xp: 0.4 },
      { id: "forex",   icon: "💱", name: "Forex Trade",     desc: "Costs $800. 55% → $1.8k. 45% lose.",   cost: 800,  xp: 0.2 },
    ],
    extraActivities: [
      { id: "newsletter", icon: "📰", name: "Finance Newsletter", desc: "Costs $200. +$250/turn passive.",    cost: 200  },
      { id: "spac",       icon: "🧨", name: "Launch a SPAC",      desc: "Costs $3k. 50% → $8k-20k.",         cost: 3000 },
      { id: "insider",    icon: "👁️", name: "Info Arbitrage",     desc: "Risky. 60% $3k. 40% -$2k fine.",    cost: 0    },
      { id: "commodities",icon: "⚗️", name: "Commodities Bet",   desc: "Costs $500. 50% → $1.5k.",          cost: 500  },
      { id: "buyvc",      icon: "🏦", name: "Buy VC Fund",        desc: "Costs $5000. +$800/turn passive.",   cost: 5000 },
    ],
  },
  {
    id: "creative", icon: "🎨", name: "Creative Entrepreneur", color: "text-pink-300",
    tagline: "Feast or famine. Build an audience — money flows forever.",
    startCash: 450, special: "passive",
    specialDesc: "Audience builds stack $100/turn permanently. Merch compounds.",
    perks: ["Audience passive stacks forever", "Viral collab jackpots", "Media Studio → $5k/turn"],
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
      { id: "aud",    icon: "📣", name: "Build Audience",  desc: "+0.8 XP. +$100/turn passive forever.",  xp: 0.8, burnout: 4  },
      { id: "prod",   icon: "🎬", name: "Learn Production",desc: "+1.1 XP. +20% hustle income forever.",  xp: 1.1, burnout: 6  },
      { id: "col",    icon: "🎭", name: "Brand Collab",    desc: "+0.7 XP. 40% viral $1k-4k.",            xp: 0.7, burnout: 5  },
      { id: "merch",  icon: "👕", name: "Launch Merch",    desc: "+0.5 XP. Costs $400. +$200/turn.",      xp: 0.5, burnout: 3  },
      { id: "course", icon: "📖", name: "Sell a Course",   desc: "+0.9 XP. Costs $200. 70% $800-3k.",    xp: 0.9, burnout: 6  },
    ],
    workName: "Client Projects", workBurnout: 6,
    hustleName: "Launch a Product", hustleBurnout: 14, hustleMulti: 2.5, hustleXpReq: 5,
    businessName: "Media Studio", businessBase: 180, businessUpgradeMult: 1.85, businessUpgradeCost: 1500, businessUnlockTier: 2, businessMaxLevel: 7,
    uniqueActions: [
      { id: "viral",       icon: "🔥", name: "Go Viral",          desc: "50% → $4k-10k + 1k followers.",       cost: 0,   xp: 0.3 },
      { id: "sponsorship", icon: "💰", name: "Sponsorship Deal",  desc: "+$400-1200/turn for 4 turns.",        cost: 0,   xp: 0.4 },
      { id: "nft",         icon: "🖼️", name: "NFT Drop",          desc: "Costs $300. 35% → $5k.",              cost: 300, xp: 0.5 },
      { id: "ghostwrite",  icon: "✍️", name: "Ghost-writing",     desc: "Write for celebs. +$300/turn.",       cost: 0,   xp: 0.3 },
      { id: "nftroyal",    icon: "👑", name: "NFT Royalties",     desc: "Costs $500. +$150/turn forever.",     cost: 500, xp: 0.4 },
    ],
    extraActivities: [
      { id: "podcast",   icon: "🎙️", name: "Start Podcast",     desc: "Costs $200. +$150/turn passive.",     cost: 200  },
      { id: "onlyfans",  icon: "⭐", name: "Premium Membership", desc: "Costs $100. 80% → $600-2k/turn 6t.", cost: 100  },
      { id: "licensing", icon: "🎵", name: "License Your IP",    desc: "Free. Guaranteed $500-2k.",           cost: 0    },
      { id: "concert",   icon: "🎤", name: "Live Event",         desc: "Costs $500. 70% → $2k-6k.",          cost: 500  },
      { id: "collab2",   icon: "🌟", name: "Celebrity Collab",   desc: "Costs $1k. 60% → $5k-15k.",          cost: 1000 },
    ],
  },
  {
    id: "medicine", icon: "🩺", name: "Medicine", color: "text-red-300",
    tagline: "Zero income for years. Brutal grind. Astronomical endgame.",
    startCash: 200, special: "burnoutImmunity",
    specialDesc: "Fellow+: burnout penalties halved. Research grants compound.",
    perks: ["Fellow+: burnout halved", "Research grant passive", "Private Clinic → $7k/turn"],
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
      { id: "medstudy",  icon: "🧬", name: "Medical Studies",   desc: "+1.4 XP. Required to advance.",          xp: 1.4, burnout: 9  },
      { id: "research",  icon: "🔬", name: "Publish Research",  desc: "+2.0 XP. 30% → $800-2k grant.",         xp: 2.0, burnout: 6  },
      { id: "moonlight", icon: "🌙", name: "Moonlight Shift",   desc: "Extra 80% salary. +17% burnout.",        xp: 0,   burnout: 17 },
      { id: "surgery",   icon: "🔪", name: "Surgical Training", desc: "+1.8 XP. 20% → $1500 bonus.",           xp: 1.8, burnout: 10 },
      { id: "pharma",    icon: "💊", name: "Pharma Partnership",desc: "+0.5 XP. $2000 + $150/turn passive.",   xp: 0.5, burnout: 3  },
    ],
    workName: "See Patients", workBurnout: 10,
    hustleName: "Pharma Consult", hustleBurnout: 8, hustleMulti: 1.7, hustleXpReq: 17,
    businessName: "Private Clinic", businessBase: 300, businessUpgradeMult: 2.1, businessUpgradeCost: 3000, businessUnlockTier: 4, businessMaxLevel: 6,
    uniqueActions: [
      { id: "trial",    icon: "🧪", name: "Clinical Trial",  desc: "Costs $1k. 70% → $5k-12k.",             cost: 1000, xp: 0.5 },
      { id: "hospital", icon: "🏥", name: "Hospital Equity", desc: "Costs $3k. +$600/turn forever.",         cost: 3000, xp: 0.3 },
      { id: "patent2",  icon: "💡", name: "Medical Patent",  desc: "Costs $600. +$250/turn × 8 turns.",     cost: 600,  xp: 0.4 },
      { id: "telemede", icon: "📱", name: "Telehealth App",  desc: "Costs $2k. +$400/turn passive.",         cost: 2000, xp: 0.5 },
      { id: "biotech",  icon: "🦠", name: "Biotech Startup", desc: "Costs $2k. 50% → $8k-25k in 8 turns.",  cost: 2000, xp: 0.6 },
    ],
    extraActivities: [
      { id: "medpodcast",icon: "🎙️", name: "Med Podcast",       desc: "Costs $200. +$150/turn passive.",     cost: 200  },
      { id: "bookmd",    icon: "📗", name: "Write Med Book",     desc: "Costs $300. 75% → $2k-6k.",          cost: 300  },
      { id: "speaking",  icon: "🎤", name: "Conference Speaker", desc: "Free. $500-2000 speaking fee.",       cost: 0    },
      { id: "wellness",  icon: "🧘", name: "Wellness Brand",     desc: "Costs $800. +$300/turn passive.",     cost: 800  },
      { id: "angel",     icon: "😇", name: "Angel (BioTech)",    desc: "Costs $2k. 45% → 8× in 12 turns.",   cost: 2000 },
    ],
  },
  {
    id: "realestate", icon: "🏠", name: "Real Estate", color: "text-yellow-300",
    tagline: "Buy, rent, flip. Mortgages compound forever.",
    startCash: 700, special: "rent",
    specialDesc: "Properties appreciate 3% every 5 months. Staging boosts flips 30%.",
    perks: ["3% appreciation every 5 months", "Staging flip boost 30%", "PropMgmt Co → $7k/turn"],
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
      { id: "license",  icon: "📋", name: "Get Licensed",    desc: "+1.1 XP. Tier unlock credential.",          xp: 1.1, burnout: 5  },
      { id: "reit",     icon: "📊", name: "Buy a REIT",      desc: "+0.6 XP. Costs $600. +$120/turn.",          xp: 0.6, burnout: 1  },
      { id: "zoning",   icon: "🗺️", name: "Zoning Research", desc: "+1.0 XP. 35% → next property 20% cheaper.", xp: 1.0, burnout: 4  },
      { id: "network2", icon: "🤝", name: "Broker Network",  desc: "+0.5 XP. 25% → free deal $500-1500.",       xp: 0.5, burnout: 2  },
      { id: "staging",  icon: "🛋️", name: "Home Staging",    desc: "+0.4 XP. Next flip +30% bonus.",            xp: 0.4, burnout: 2  },
    ],
    workName: "Close Deals", workBurnout: 7,
    hustleName: "Dev Project", hustleBurnout: 18, hustleMulti: 0, hustleXpReq: 10,
    businessName: "Property Mgmt Co.", businessBase: 250, businessUpgradeMult: 1.95, businessUpgradeCost: 2000, businessUnlockTier: 3, businessMaxLevel: 7,
    uniqueActions: [
      { id: "luxury",     icon: "🏰", name: "Buy Luxury",       desc: "Costs $5k. +$500/turn + appreciation.",  cost: 5000, xp: 0.5 },
      { id: "commercial", icon: "🏢", name: "Commercial Lease", desc: "Costs $2k. +$400/turn × 12 turns.",     cost: 2000, xp: 0.4 },
      { id: "auct",       icon: "🔨", name: "Auction Flip",     desc: "Costs $800. 55% → $3k-7k.",             cost: 800,  xp: 0.6 },
      { id: "develop",    icon: "🏗️", name: "Develop Land",     desc: "Costs $4k. +$600/turn passive.",        cost: 4000, xp: 0.7 },
      { id: "renoflip",   icon: "🎨", name: "Reno + Flip",      desc: "Costs $1.5k. 65% → $5k-12k.",          cost: 1500, xp: 0.5 },
    ],
    extraActivities: [
      { id: "airbnb",  icon: "🏖️", name: "Short-Term Rental", desc: "Needs property. +$350/turn × 8 turns.", cost: 400  },
      { id: "reitsell",icon: "💹", name: "Sell REIT Units",   desc: "Needs REIT. 50% → 2× value.",           cost: 0    },
      { id: "podcast", icon: "🎙️", name: "RE Podcast",        desc: "Costs $200. +$150/turn passive.",        cost: 200  },
      { id: "proptech",icon: "📲", name: "PropTech Invest",   desc: "Costs $2k. 55% → $6k-15k.",             cost: 2000 },
      { id: "mortgage",icon: "🏦", name: "Mortgage Broker",   desc: "Free. 40% → $1k-3k commission.",        cost: 0    },
    ],
  },
  {
    id: "law", icon: "⚖️", name: "Law", color: "text-purple-300",
    tagline: "Longest grind. Extraordinary ceiling. Cases change everything.",
    startCash: 350, special: "caseBonus",
    specialDesc: "Specialised Senior+: 15% chance $800-4500 case bonus per turn.",
    perks: ["15% passive case bonus when specialised", "Landmark windfalls", "Law Firm → $9k/turn"],
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
      { id: "lawstudy", icon: "📖", name: "Law Studies",   desc: "+1.4 XP. Core legal education.",           xp: 1.4, burnout: 8  },
      { id: "spec",     icon: "🎓", name: "Specialise",    desc: "+1.9 XP. Unlocks passive case bonuses.",   xp: 1.9, burnout: 7  },
      { id: "probono",  icon: "🕊️", name: "Pro Bono",      desc: "+0.7 XP. 30% → $1k-3.5k.",               xp: 0.7, burnout: 4  },
      { id: "bigcase",  icon: "🔥", name: "Big Case",      desc: "+1.2 XP. 60% win $2k-8k. 40% -$1k.",     xp: 1.2, burnout: 10 },
      { id: "retainer", icon: "💼", name: "Get Retainer",  desc: "+0.5 XP. Costs $200. +$300/turn × 5t.",   xp: 0.5, burnout: 3  },
    ],
    workName: "Bill Hours", workBurnout: 9,
    hustleName: "Major Litigation", hustleBurnout: 16, hustleMulti: 2.2, hustleXpReq: 10,
    businessName: "Law Firm", businessBase: 400, businessUpgradeMult: 2.0, businessUpgradeCost: 2500, businessUnlockTier: 3, businessMaxLevel: 7,
    uniqueActions: [
      { id: "settlement", icon: "💰", name: "Negotiate Settlement", desc: "Guaranteed $1k-5k payout.",              cost: 0,   xp: 0.4 },
      { id: "classact",   icon: "⚡", name: "Class Action",         desc: "Costs $500. 50% → $10k-20k.",           cost: 500, xp: 0.6 },
      { id: "arbitra",    icon: "🏛️", name: "Arbitration Win",      desc: "+1.0 XP. 70% → $2k.",                  cost: 0,   xp: 1.0 },
      { id: "ipo_law",    icon: "📜", name: "IPO Legal Counsel",    desc: "Costs $1k. Guaranteed $4k-12k.",        cost: 1000,xp: 0.5 },
      { id: "patent_law", icon: "⚖️", name: "Patent Litigation",   desc: "Costs $500. 65% → $3k-8k.",             cost: 500, xp: 0.5 },
    ],
    extraActivities: [
      { id: "lawbook",    icon: "📗", name: "Write Law Book",    desc: "Costs $300. 70% → $2k-5k.",            cost: 300  },
      { id: "lawpodcast", icon: "🎙️", name: "Law Podcast",      desc: "Costs $200. +$150/turn passive.",       cost: 200  },
      { id: "consulting", icon: "💼", name: "Corp Consulting",   desc: "Free. $1k-4k one-time.",                cost: 0    },
      { id: "mediation",  icon: "🕊️", name: "Mediation Center", desc: "Costs $800. +$350/turn passive.",       cost: 800  },
      { id: "angel",      icon: "😇", name: "Angel (LegalTech)", desc: "Costs $2k. 40% → 6× in 10 turns.",     cost: 2000 },
    ],
  },
];

// ─── PROPERTY TYPES ───────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { type: "starter",    icon: "🏠", name: "Starter Home",    buyPrice: 800,   rentPerTurn: 120, flipGain: [1200, 2500],  flipTurns: 3 },
  { type: "mid",        icon: "🏡", name: "Mid-Range House", buyPrice: 1500,  rentPerTurn: 220, flipGain: [2200, 4500],  flipTurns: 4 },
  { type: "luxury",     icon: "🏰", name: "Luxury Property", buyPrice: 4000,  rentPerTurn: 500, flipGain: [5500, 12000], flipTurns: 5 },
  { type: "commercial", icon: "🏢", name: "Commercial Space",buyPrice: 3000,  rentPerTurn: 400, flipGain: [4000, 9000],  flipTurns: 5 },
] as const;

// ─── STOCKS ───────────────────────────────────────────────────────────────────
const STOCK_DEFS = [
  { id: "nvt", ticker: "NVT", name: "NovaTech",    sector: "Tech",    base: 120,  vol: 0.08, trend: 0.006 },
  { id: "dfi", ticker: "DFI", name: "DataFlow",    sector: "Tech",    base: 85,   vol: 0.10, trend: 0.008 },
  { id: "atb", ticker: "ATB", name: "Atlas Bank",  sector: "Finance", base: 200,  vol: 0.05, trend: 0.003 },
  { id: "mrc", ticker: "MRC", name: "MeridianCap", sector: "Finance", base: 150,  vol: 0.06, trend: 0.004 },
  { id: "spc", ticker: "SPC", name: "SolarPeak",   sector: "Energy",  base: 60,   vol: 0.12, trend: 0.010 },
  { id: "gml", ticker: "GML", name: "GenMedLabs",  sector: "Health",  base: 180,  vol: 0.07, trend: 0.005 },
  { id: "omt", ticker: "OMT", name: "OmniMart",    sector: "Retail",  base: 45,   vol: 0.09, trend: 0.002 },
  { id: "cph", ticker: "CPH", name: "CipherCoin",  sector: "Crypto",  base: 30,   vol: 0.28, trend: 0.015 },
  { id: "bld", ticker: "BLD", name: "BuildCorp",   sector: "RE",      base: 95,   vol: 0.07, trend: 0.004 },
  { id: "rxp", ticker: "RXP", name: "RxPharma",    sector: "Health",  base: 140,  vol: 0.09, trend: 0.006 },
];

// ─── CRYPTO ───────────────────────────────────────────────────────────────────
const CRYPTO_DEFS = [
  { id: "btc", ticker: "BTC", name: "Bitcoin",   base: 800,  vol: 0.18, trend: 0.010 },
  { id: "eth", ticker: "ETH", name: "Ethereum",  base: 200,  vol: 0.22, trend: 0.012 },
  { id: "sol", ticker: "SOL", name: "Solana",    base: 40,   vol: 0.30, trend: 0.014 },
  { id: "doge",ticker: "DOGE",name: "Doge",      base: 5,    vol: 0.45, trend: 0.008 },
  { id: "bnb", ticker: "BNB", name: "BNBCoin",   base: 150,  vol: 0.25, trend: 0.009 },
];

// ─── EVENTS ───────────────────────────────────────────────────────────────────
const EVENTS = [
  { turn: 6,  type: "bad",     icon: "🚗", title: "Car Breakdown",        sub: "Repair bill.",             amount: -300  },
  { turn: 11, type: "good",    icon: "💰", title: "Tax Refund",            sub: "Government owes you.",     amount: 550   },
  { turn: 16, type: "bad",     icon: "🏥", title: "Medical Bill",          sub: "Unexpected expense.",      amount: -500  },
  { turn: 21, type: "neutral", icon: "📰", title: "Market Analysts Speak", sub: "Insider tip unlocked.",    amount: 0     },
  { turn: 26, type: "good",    icon: "🤑", title: "Old Debt Repaid",       sub: "A friend paid you back.",  amount: 800   },
  { turn: 31, type: "bad",     icon: "📉", title: "Market Shock",          sub: "Portfolio hit hard.",      amount: -999  },
  { turn: 36, type: "good",    icon: "🎁", title: "Inheritance",           sub: "Distant relative.",        amount: 1200  },
  { turn: 41, type: "bad",     icon: "💸", title: "Lifestyle Creep",       sub: "Spending caught up.",      amount: -900  },
  { turn: 46, type: "good",    icon: "🏆", title: "Industry Award",        sub: "Cash prize attached.",     amount: 1400  },
  { turn: 51, type: "bad",     icon: "🌊", title: "Recession",             sub: "Economy contracts.",       amount: -999  },
  { turn: 56, type: "good",    icon: "🎉", title: "Year-End Bonus",        sub: "Best performance yet.",    amount: 2000  },
  { turn: 61, type: "bad",     icon: "⚠️", title: "Emergency Fund Hit",    sub: "Family expense.",          amount: -1100 },
  { turn: 66, type: "good",    icon: "📈", title: "Bull Market Surge",     sub: "Everything up 15%.",       amount: 999   },
  { turn: 71, type: "bad",     icon: "🔥", title: "Property Damage",       sub: "Insurance didn't cover.",  amount: -800  },
  { turn: 76, type: "good",    icon: "💎", title: "Windfall Investment",    sub: "Early bet paid off big.",  amount: 2500  },
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

// ─── INSANE SIDE BETS ────────────────────────────────────────────────────────
// These are game-changing — a single side bet can double or destroy a bankroll
const SIDE_BETS = [
  {
    id: "lucky7",
    name: "Lucky 7s",
    desc: "First card dealt is a 7",
    flavor: "Classic but golden",
    payout: 3,
    icon: "7️⃣",
    maxBet: 5000,
    rarity: "common",
  },
  {
    id: "suited",
    name: "Suited Pair",
    desc: "First 2 cards same suit",
    flavor: "Dress to impress",
    payout: 5,
    icon: "🃏",
    maxBet: 5000,
    rarity: "common",
  },
  {
    id: "natural21",
    name: "Natural Blackjack",
    desc: "Dealt 21 in first 2 cards",
    flavor: "Born winner",
    payout: 8,
    icon: "⭐",
    maxBet: 10000,
    rarity: "uncommon",
  },
  {
    id: "bust",
    name: "Dealer Busts",
    desc: "Dealer goes over 21",
    flavor: "Watch them choke",
    payout: 2,
    icon: "💥",
    maxBet: 20000,
    rarity: "common",
  },
  {
    id: "perfect",
    name: "Perfect Pair",
    desc: "First 2 cards identical rank AND suit",
    flavor: "One in a billion",
    payout: 25,
    icon: "👑",
    maxBet: 10000,
    rarity: "rare",
  },
  {
    id: "triple7",
    name: "Triple 7s",
    desc: "All 3 of your cards are 7s",
    flavor: "The holy trinity",
    payout: 100,
    icon: "🎰",
    maxBet: 5000,
    rarity: "legendary",
  },
  {
    id: "royalflush",
    name: "Royal Flush Hand",
    desc: "All 3+ cards are face cards (J/Q/K/A)",
    flavor: "Born to rule",
    payout: 15,
    icon: "🤴",
    maxBet: 8000,
    rarity: "rare",
  },
  {
    id: "redblack",
    name: "Red & Black",
    desc: "First 2 cards alternating red/black",
    flavor: "Yin and yang",
    payout: 3,
    icon: "🔴",
    maxBet: 25000,
    rarity: "common",
  },
  {
    id: "underover",
    name: "Under/Over 13",
    desc: "Bet your first 2 cards total under OR over 13",
    flavor: "Pick a side",
    payout: 2,
    icon: "🎯",
    maxBet: 50000,
    rarity: "common",
    hasSubChoice: true,
  },
  {
    id: "insurancebomb",
    name: "Insurance Bomb",
    desc: "Dealer's face-up card is an Ace",
    flavor: "Pray they have blackjack",
    payout: 4,
    icon: "💣",
    maxBet: 15000,
    rarity: "uncommon",
  },
  {
    id: "samerank",
    name: "Same Rank Triple",
    desc: "All 3 cards have the same rank (e.g., three 9s)",
    flavor: "Three of a kind",
    payout: 50,
    icon: "🃏",
    maxBet: 3000,
    rarity: "epic",
  },
  {
    id: "suitedup",
    name: "Fully Suited Triple",
    desc: "All 3 cards are the same suit",
    flavor: "All dressed up",
    payout: 20,
    icon: "♠️",
    maxBet: 5000,
    rarity: "rare",
  },
  {
    id: "twentyone",
    name: "Total 21 Three-Card",
    desc: "Exactly 3 cards summing to exactly 21",
    flavor: "Perfect math",
    payout: 30,
    icon: "🔢",
    maxBet: 4000,
    rarity: "epic",
  },
  {
    id: "godhand",
    name: "GOD HAND",
    desc: "Natural BJ AND dealer busts on same hand",
    flavor: "IMPOSSIBLE. Yet here you are.",
    payout: 500,
    icon: "⚡",
    maxBet: 1000,
    rarity: "divine",
  },
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
  if (b < 30) return 1.0;
  if (b < 50) return 0.82;
  if (b < 70) return 0.60;
  if (b < 90) return 0.42;
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

function tickCrypto(prices: Record<string, number>, history: Record<string, number[]>, turn: number) {
  const newPrices: Record<string, number> = { ...prices };
  const newHistory: Record<string, number[]> = {};
  for (const s of CRYPTO_DEFS) {
    const chg = (Math.random() - 0.47) * s.vol + s.trend + Math.sin(turn * 0.3) * 0.05;
    newPrices[s.id] = Math.max(0.01, Math.round(prices[s.id] * (1 + chg) * 100) / 100);
    newHistory[s.id] = [...(history[s.id] || []).slice(-20), newPrices[s.id]];
  }
  return { newCryptoPrices: newPrices, newCryptoHistory: newHistory };
}

// ─── BJ HELPERS ──────────────────────────────────────────────────────────────
const BJ_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const BJ_SUITS = ["♠","♣","♥","♦"];
type BJCard = { r: string; s: string; red: boolean };

function makeDeck(): BJCard[] {
  const d: BJCard[] = [];
  for (const r of BJ_RANKS) for (const s of BJ_SUITS)
    d.push({ r, s, red: s === "♥" || s === "♦" });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function cv(r: string) {
  if (r === "A") return 11;
  if (["J","Q","K"].includes(r)) return 10;
  return parseInt(r);
}
function hs(hand: BJCard[]) {
  let s = 0, a = 0;
  for (const c of hand) { s += cv(c.r); if (c.r === "A") a++; }
  while (s > 21 && a > 0) { s -= 10; a--; }
  return s;
}
function isNat(hand: BJCard[]) { return hand.length === 2 && hs(hand) === 21; }
function isFace(r: string) { return ["J","Q","K","A"].includes(r); }

// ─── ANIMATED CARD ────────────────────────────────────────────────────────────
function AnimatedCard({ card, faceDown, delay = 0, big = false }: {
  card: BJCard; faceDown?: boolean; delay?: number; big?: boolean;
}) {
  const [flipped, setFlipped] = useState(!!faceDown);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = !faceDown ? setTimeout(() => setFlipped(false), delay + 120) : null;
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [delay, faceDown]);

  const w = big ? "w-16 h-24" : "w-12 h-18";

  if (!visible) return <div className={`${w} opacity-0 flex-shrink-0`} style={{ height: big ? 96 : 72 }} />;

  if (flipped) return (
    <div
      className={`${w} rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-200`}
      style={{
        width: big ? 64 : 48, height: big ? 96 : 72,
        background: "linear-gradient(135deg,#1e3a8a,#312e81)",
        border: "2px solid rgba(255,255,255,0.15)"
      }}
    >
      <span style={{ fontSize: big ? 22 : 16, opacity: 0.2 }}>🂠</span>
    </div>
  );

  return (
    <div
      className={`rounded-xl flex-shrink-0 flex flex-col items-start justify-between bg-white transition-all duration-200 ${card.red ? "text-red-600" : "text-zinc-900"}`}
      style={{
        width: big ? 64 : 48, height: big ? 96 : 72,
        padding: big ? "6px 7px" : "4px 5px",
        animation: `cardSlide 0.25s ease ${delay}ms both`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: big ? 15 : 11, fontWeight: 900, lineHeight: 1 }}>{card.r}</div>
      <div style={{ fontSize: big ? 20 : 15, fontWeight: 900, lineHeight: 1, alignSelf: "center" }}>{card.s}</div>
      <div style={{ fontSize: big ? 15 : 11, fontWeight: 900, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>{card.r}</div>
    </div>
  );
}

// ─── RARITY COLORS ────────────────────────────────────────────────────────────
function rarityStyle(r: string) {
  if (r === "divine")    return "border-yellow-300 bg-yellow-300/10 shadow-yellow-400/20 shadow-lg";
  if (r === "legendary") return "border-orange-400 bg-orange-400/10";
  if (r === "epic")      return "border-purple-400 bg-purple-400/10";
  if (r === "rare")      return "border-blue-400 bg-blue-400/10";
  if (r === "uncommon")  return "border-emerald-500 bg-emerald-500/10";
  return "border-white/15 bg-black/20";
}
function rarityBadge(r: string) {
  if (r === "divine")    return "bg-yellow-300 text-zinc-950";
  if (r === "legendary") return "bg-orange-500 text-white";
  if (r === "epic")      return "bg-purple-500 text-white";
  if (r === "rare")      return "bg-blue-500 text-white";
  if (r === "uncommon")  return "bg-emerald-600 text-white";
  return "bg-zinc-700 text-white/70";
}

// ─── SIDE BET RESOLVER ────────────────────────────────────────────────────────
function resolveSideBets(
  playerCards: BJCard[],
  dealerFinal: BJCard[],
  sideBets: Record<string, { amount: number; subChoice?: string }>
): { results: { id: string; name: string; win: boolean; payout: number; icon: string }[]; totalGain: number } {
  const results: { id: string; name: string; win: boolean; payout: number; icon: string }[] = [];
  let totalGain = 0;

  for (const [betId, { amount, subChoice }] of Object.entries(sideBets)) {
    if (!amount || amount <= 0) continue;
    const sb = SIDE_BETS.find(s => s.id === betId);
    if (!sb) continue;

    let win = false;
    const p = playerCards;
    const d = dealerFinal;

    switch (betId) {
      case "lucky7":
        win = p[0]?.r === "7";
        break;
      case "suited":
        win = p.length >= 2 && p[0]?.s === p[1]?.s;
        break;
      case "natural21":
        win = isNat(p);
        break;
      case "bust":
        win = hs(d) > 21;
        break;
      case "perfect":
        win = p.length >= 2 && p[0]?.r === p[1]?.r && p[0]?.s === p[1]?.s;
        break;
      case "triple7":
        win = p.length >= 3 && p.slice(0, 3).every(c => c.r === "7");
        break;
      case "royalflush":
        win = p.length >= 3 && p.slice(0, 3).every(c => isFace(c.r));
        break;
      case "redblack":
        win = p.length >= 2 && (
          (p[0]?.red && !p[1]?.red) || (!p[0]?.red && p[1]?.red)
        );
        break;
      case "underover": {
        const total = p.length >= 2 ? cv(p[0].r) + cv(p[1].r) : 0;
        win = subChoice === "under" ? total < 13 : total > 13;
        break;
      }
      case "insurancebomb":
        win = d[0]?.r === "A";
        break;
      case "samerank":
        win = p.length >= 3 && p[0]?.r === p[1]?.r && p[1]?.r === p[2]?.r;
        break;
      case "suitedup":
        win = p.length >= 3 && p[0]?.s === p[1]?.s && p[1]?.s === p[2]?.s;
        break;
      case "twentyone":
        win = p.length === 3 && hs(p) === 21;
        break;
      case "godhand":
        win = isNat(p) && hs(d) > 21;
        break;
    }

    const payout = win ? amount * sb.payout : -amount;
    totalGain += payout;
    results.push({ id: betId, name: sb.name, win, payout, icon: sb.icon });
  }

  return { results, totalGain };
}

// ─── EPIC BLACKJACK ───────────────────────────────────────────────────────────
const MAX_HANDS = 3;
const BJ_MIN = 10;
const BJ_MAX = 200000;

function EpicBlackjack({ cash, onFinish }: {
  cash: number;
  onFinish: (newCash: number, profit: number) => void;
}) {
  type BJPhase = "bet" | "sidebet" | "dealing" | "play" | "done";

  const [phase, setPhase] = useState<BJPhase>("bet");
  const [deck, setDeck] = useState<BJCard[]>([]);
  const [player, setPlayer] = useState<BJCard[]>([]);
  const [dealer, setDealer] = useState<BJCard[]>([]);
  const [bet, setBet] = useState(() => Math.max(BJ_MIN, Math.min(500, Math.floor(cash * 0.1 / 10) * 10)));
  const [doubled, setDoubled] = useState(false);
  const [result, setResult] = useState<{ outcome: string; gain: number } | null>(null);
  const [localCash, setLocalCash] = useState(cash);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [sideBets, setSideBets] = useState<Record<string, { amount: number; subChoice?: string }>>({});
  const [sideBetResults, setSideBetResults] = useState<{ id: string; name: string; win: boolean; payout: number; icon: string }[]>([]);
  const [sideBetGain, setSideBetGain] = useState(0);
  const [dealIdx, setDealIdx] = useState(0);
  const [showDealer2, setShowDealer2] = useState(false);
  const [bigWin, setBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [revealingDealer, setRevealingDealer] = useState(false);
  const [underOverChoice, setUnderOverChoice] = useState<"under" | "over">("under");

  const totalSideBet = Object.values(sideBets).reduce((a, b) => a + (b.amount || 0), 0);
  const canPlayMore = handsPlayed < MAX_HANDS && localCash >= BJ_MIN;

  function runDealer(d0: BJCard[], dk: BJCard[]): BJCard[] {
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

  function deal() {
    const total = bet + totalSideBet;
    if (localCash < total) return;
    const dk = makeDeck();
    const p: BJCard[] = [];
    const d0: BJCard[] = [];
    // Cards come one at a time for suspense
    p.push(dk.pop()!);
    d0.push(dk.pop()!);
    p.push(dk.pop()!);
    d0.push(dk.pop()!);

    setDeck(dk); setPlayer(p); setDealer(d0);
    setDoubled(false); setResult(null); setSideBetResults([]); setSideBetGain(0);
    setBigWin(false); setBigWinAmount(0); setShowDealer2(false); setRevealingDealer(false);
    setLocalCash(c => c - total);
    setDealIdx(prev => prev + 1);
    setPhase("dealing");

    setTimeout(() => {
      if (isNat(p)) {
        doResolve(p, d0, dk, bet, false);
      } else {
        setPhase("play");
      }
    }, 1000);
  }

  function doResolve(p: BJCard[], d0: BJCard[], dk: BJCard[], b: number, dbl: boolean) {
    setRevealingDealer(true);
    const fd = runDealer(d0, dk);
    setTimeout(() => {
      setDealer(fd);
      setShowDealer2(true);
      const r = resolveHand(p, fd, b, dbl);
      const betsWithSubChoice = { ...sideBets };
      if (betsWithSubChoice.underover) betsWithSubChoice.underover = { ...betsWithSubChoice.underover, subChoice: underOverChoice };
      const { results: sbR, totalGain: sbG } = resolveSideBets(p, fd, betsWithSubChoice);
      setSideBetResults(sbR);
      setSideBetGain(sbG);
      setResult(r);

      const totalWin = r.gain + sbG;
      if (totalWin > b * 3 || sbG > 1000 || (sbR.some(x => x.win && SIDE_BETS.find(s => s.id === x.id)!.payout >= 15))) {
        setBigWin(true);
        setBigWinAmount(totalWin);
      }

      setLocalCash(c => c + b + r.gain + sbG);
      setHandsPlayed(h => h + 1);
      setPhase("done");
      setRevealingDealer(false);
    }, 600);
  }

  function hit() {
    const nd = [...deck]; const np = [...player, nd.pop()!];
    setDeck(nd); setPlayer(np);
    if (hs(np) >= 21) doResolve(np, dealer, nd, bet, doubled);
  }

  function stand() { doResolve(player, dealer, deck, bet, doubled); }

  function doDouble() {
    if (localCash < bet) return;
    const nd = [...deck]; const np = [...player, nd.pop()!]; const nb = bet * 2;
    setLocalCash(c => c - bet); setBet(nb); setDeck(nd); setPlayer(np); setDoubled(true);
    doResolve(np, dealer, nd, nb, true);
  }

  function playAgain() {
    setSideBets({}); setSideBetResults([]); setResult(null);
    setBigWin(false); setBigWinAmount(0); setShowDealer2(false);
    setBet(prev => Math.min(prev, localCash));
    setPhase("bet");
  }

  function collect() { onFinish(localCash, localCash - cash); }

  const ps = hs(player);
  const ds_visible = phase === "done" ? hs(dealer) : "?";

  const outcomeColor =
    result?.outcome === "win"   ? "bg-emerald-900/90 border-emerald-400 text-emerald-200" :
    result?.outcome === "push"  ? "bg-zinc-800/90 border-zinc-500 text-white/70" :
    "bg-red-900/90 border-red-400 text-red-200";

  const outcomeText =
    !result ? "" :
    result.outcome === "bust"  ? `💥 Bust! Lost ${fmt(Math.abs(result.gain))}` :
    result.outcome === "win"   ? (isNat(player) && !doubled ? `🎰 BLACKJACK! +${fmt(result.gain)}` : `✅ WIN! +${fmt(result.gain)}`) :
    result.outcome === "push"  ? "↩ Push — bet returned" :
    `❌ Lost ${fmt(Math.abs(result.gain))}`;

  const chips = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 200000]
    .filter(v => v <= Math.max(localCash, BJ_MIN));

  return (
    <div className="rounded-3xl border border-white/10 bg-black/70 overflow-hidden">
      <style>{`
        @keyframes cardSlide { from { opacity:0; transform: translateY(-28px) rotate(-8deg) scale(0.85); } to { opacity:1; transform: translateY(0) rotate(0) scale(1); } }
        @keyframes bigWinPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes goldShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(60px) rotate(720deg);opacity:0} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <div>
            <h3 className="font-black text-lg">Epic Blackjack</h3>
            <p className="text-[10px] text-white/30">Hand {handsPlayed + 1} of {MAX_HANDS} · BJ pays 3:2 · Dealer stands soft 17</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-yellow-300 font-black text-lg">{fmt(localCash)}</div>
          <div className="text-[10px] text-white/30">bankroll</div>
        </div>
      </div>

      {/* BIG WIN OVERLAY */}
      {bigWin && (
        <div className="relative overflow-hidden">
          <div className="px-5 py-4 text-center font-black text-2xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #db2777, #ea580c)",
              animation: "bigWinPulse 0.6s ease infinite",
            }}>
            {bigWinAmount > 50000 ? "⚡ LIFE-CHANGING WIN ⚡" :
             bigWinAmount > 10000 ? "🔥 MASSIVE WIN 🔥" :
             bigWinAmount > 2000  ? "💰 BIG WIN! 💰" : "🎉 GREAT WIN!"}
            <div className="text-lg mt-1">{fmt(bigWinAmount)} profit</div>
          </div>
        </div>
      )}

      {/* BET / SIDE BET PHASE */}
      {(phase === "bet" || phase === "sidebet") && (
        <div className="p-5">
          {/* Tab switch */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setPhase("bet")}
              className={`flex-1 py-2.5 rounded-2xl font-black text-sm transition ${phase === "bet" ? "bg-yellow-300 text-zinc-950" : "border border-white/10 text-white/50 hover:border-white/30"}`}>
              Main Bet
            </button>
            <button onClick={() => setPhase("sidebet")}
              className={`flex-1 py-2.5 rounded-2xl font-black text-sm transition relative ${phase === "sidebet" ? "bg-purple-500 text-white" : "border border-purple-500/40 text-purple-300 hover:bg-purple-500/10"}`}>
              Side Bets 🎰
              {totalSideBet > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-300 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {fmt(totalSideBet)}
                </span>
              )}
            </button>
          </div>

          {phase === "bet" && (
            <>
              <div className="text-5xl font-black text-yellow-300 text-center my-4">{fmt(bet)}</div>
              <input type="range" min={BJ_MIN} max={Math.min(localCash - totalSideBet, BJ_MAX)} step={10}
                value={bet} onChange={e => setBet(Number(e.target.value))}
                className="w-full mb-4 accent-yellow-300" />
              <div className="flex gap-1.5 flex-wrap mb-4 justify-center">
                {chips.filter(v => v <= localCash - totalSideBet).map(v => (
                  <button key={v} onClick={() => setBet(v)}
                    className={`px-3 py-2 rounded-2xl border font-bold text-xs transition hover:scale-105 ${bet === v ? "border-yellow-300 text-yellow-300 bg-yellow-300/10" : "border-white/10 text-white/50 hover:border-white/30"}`}>
                    {fmt(v)}
                  </button>
                ))}
                <button onClick={() => setBet(Math.min(localCash - totalSideBet, BJ_MAX))}
                  className="px-3 py-2 rounded-2xl border border-red-400/40 text-red-300 font-bold text-xs hover:bg-red-400/10">
                  ALL IN
                </button>
              </div>
              {totalSideBet > 0 && (
                <p className="text-center text-xs text-purple-300 mb-3">+ {fmt(totalSideBet)} in side bets = {fmt(bet + totalSideBet)} total risk</p>
              )}
              <button onClick={deal} disabled={localCash < bet + totalSideBet || bet < BJ_MIN}
                className="w-full rounded-2xl bg-yellow-300 py-4 font-black text-zinc-950 text-lg transition hover:scale-105 hover:bg-yellow-200 disabled:opacity-40">
                Deal Cards →
              </button>
            </>
          )}

          {phase === "sidebet" && (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              <p className="text-xs text-white/40 mb-2">Place side bets before dealing. These can be larger than your main bet. Some bets pay 500×.</p>
              {SIDE_BETS.map(sb => {
                const current = sideBets[sb.id]?.amount || 0;
                const maxAllowed = Math.min(sb.maxBet, localCash - bet - (totalSideBet - current));
                return (
                  <div key={sb.id}
                    className={`rounded-2xl border p-3 transition ${rarityStyle(sb.rarity)} ${current > 0 ? "ring-1 ring-white/20" : ""}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sb.icon}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-sm">{sb.name}</p>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${rarityBadge(sb.rarity)}`}>
                              {sb.rarity}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/50">{sb.desc}</p>
                          <p className="text-[10px] text-white/30 italic">{sb.flavor}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className={`font-black text-base ${sb.payout >= 100 ? "text-yellow-300" : sb.payout >= 25 ? "text-purple-300" : sb.payout >= 10 ? "text-blue-300" : "text-emerald-300"}`}>
                          {sb.payout}×
                        </span>
                        <p className="text-[9px] text-white/30">max {fmt(sb.maxBet)}</p>
                      </div>
                    </div>

                    {/* Sub-choice for under/over */}
                    {sb.hasSubChoice && current > 0 && (
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => setUnderOverChoice("under")}
                          className={`flex-1 py-1 rounded-lg text-xs font-black ${underOverChoice === "under" ? "bg-blue-500 text-white" : "border border-white/10 text-white/40"}`}>Under 13</button>
                        <button onClick={() => setUnderOverChoice("over")}
                          className={`flex-1 py-1 rounded-lg text-xs font-black ${underOverChoice === "over" ? "bg-red-500 text-white" : "border border-white/10 text-white/40"}`}>Over 13</button>
                      </div>
                    )}

                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {[0, 25, 100, 500, 1000, 5000, 10000, 50000].filter(a => a === 0 || a <= maxAllowed).map(amt => (
                        <button key={amt}
                          onClick={() => setSideBets(prev => ({ ...prev, [sb.id]: { ...prev[sb.id], amount: amt } }))}
                          className={`px-2 py-1 rounded-xl text-[10px] font-black transition ${current === amt ? "bg-white text-zinc-950" : "border border-white/10 text-white/50 hover:bg-white/10"}`}>
                          {amt === 0 ? "OFF" : fmt(amt)}
                        </button>
                      ))}
                      <button
                        onClick={() => setSideBets(prev => ({ ...prev, [sb.id]: { ...prev[sb.id], amount: maxAllowed } }))}
                        className="px-2 py-1 rounded-xl text-[10px] font-black border border-red-400/40 text-red-300 hover:bg-red-400/10">
                        MAX
                      </button>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setPhase("bet")}
                className="w-full rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 mt-2 transition hover:bg-yellow-200">
                ← Back to Main Bet
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME TABLE */}
      {(phase === "dealing" || phase === "play" || phase === "done") && (
        <div>
          <div className="p-5 relative"
            style={{ background: "radial-gradient(ellipse at center top, rgba(4,60,26,0.95), rgba(1,15,8,0.98))" }}>

            {/* Dealer */}
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-black">
                Dealer — {phase === "done" ? hs(dealer) : "?"}
                {phase === "done" && hs(dealer) > 21 && " 💥 BUST"}
              </p>
              <div className="flex gap-2 flex-wrap min-h-[80px] items-end">
                {dealer.map((c, i) => (
                  <AnimatedCard key={`d${dealIdx}-${i}`} card={c}
                    faceDown={i > 0 && !showDealer2 && phase !== "done"}
                    delay={i * 300} big />
                ))}
                {revealingDealer && (
                  <div className="flex items-center ml-2 text-yellow-300 text-xs font-black animate-pulse">revealing...</div>
                )}
              </div>
            </div>

            {/* Player */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-black">
                You — {ps}
                {ps > 21 ? " 💥 BUST" : ps === 21 && player.length === 2 ? " ⭐ BLACKJACK!" : ""}
              </p>
              <div className="flex gap-2 flex-wrap min-h-[80px] items-end">
                {player.map((c, i) => (
                  <AnimatedCard key={`p${dealIdx}-${i}`} card={c} delay={i * 300 + 150} big />
                ))}
              </div>
            </div>

            {/* Bet indicators */}
            <div className="flex gap-2 mt-4 text-xs">
              <span className="text-white/40">Main: <span className="text-yellow-300 font-black">{fmt(bet)}</span></span>
              {totalSideBet > 0 && <span className="text-white/40">Side: <span className="text-purple-300 font-black">{fmt(totalSideBet)}</span></span>}
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div className={`px-5 py-3 text-center font-black text-xl border-y ${outcomeColor}`}>
              {outcomeText}
            </div>
          )}

          {/* Side bet results */}
          {sideBetResults.length > 0 && (
            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-950/60 to-black/60">
              <p className="text-xs text-purple-300 font-black uppercase tracking-widest mb-3">Side Bet Results</p>
              <div className="grid grid-cols-2 gap-2">
                {sideBetResults.map((r, i) => (
                  <div key={i}
                    className={`rounded-2xl border px-3 py-2 flex items-center justify-between ${r.win ? "border-emerald-500/60 bg-emerald-900/50" : "border-red-700/40 bg-red-900/30"}`}>
                    <div className="flex items-center gap-1.5">
                      <span>{r.icon}</span>
                      <span className="text-xs font-black">{r.name}</span>
                    </div>
                    <span className={`text-sm font-black ${r.win ? "text-emerald-300" : "text-red-400"}`}>
                      {r.win ? "+" : ""}{fmt(r.payout)}
                    </span>
                  </div>
                ))}
              </div>
              {sideBetGain !== 0 && (
                <div className={`mt-2 text-center font-black text-sm ${sideBetGain > 0 ? "text-emerald-300" : "text-red-300"}`}>
                  Side bet net: {sideBetGain > 0 ? "+" : ""}{fmt(sideBetGain)}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          {phase === "play" && (
            <div className="flex gap-2 p-4 flex-wrap">
              <button onClick={hit}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-400 font-black text-zinc-950 text-sm transition hover:bg-emerald-300 active:scale-95">
                Hit
              </button>
              <button onClick={stand}
                className="flex-1 py-3.5 rounded-2xl bg-blue-500 font-black text-white text-sm transition hover:bg-blue-400 active:scale-95">
                Stand
              </button>
              {player.length === 2 && (
                <button onClick={doDouble} disabled={localCash < bet}
                  className="flex-1 py-3.5 rounded-2xl bg-yellow-400 font-black text-zinc-950 text-sm transition hover:bg-yellow-300 disabled:opacity-40 active:scale-95">
                  Double ×2
                </button>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="p-4 flex flex-col gap-2">
              {canPlayMore && (
                <button onClick={playAgain}
                  className="w-full py-3 rounded-2xl border border-yellow-300/50 text-yellow-300 font-black text-sm transition hover:bg-yellow-300/10">
                  Play Another Hand ({MAX_HANDS - handsPlayed} left) →
                </button>
              )}
              <button onClick={collect}
                className="w-full py-4 rounded-2xl bg-yellow-300 font-black text-zinc-950 text-base transition hover:scale-105 hover:bg-yellow-200">
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
function RealEstateMarket({ cash, properties, onBuy, onFlip, onSell }: {
  cash: number; properties: Property[];
  onBuy: (type: typeof PROPERTY_TYPES[number]) => void;
  onFlip: (id: string) => void;
  onSell: (id: string) => void;
}) {
  const [tab, setTab] = useState<"buy" | "portfolio">("buy");
  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 overflow-hidden">
      <div className="flex border-b border-white/10">
        <button onClick={() => setTab("buy")} className={`flex-1 py-3 font-black text-sm transition ${tab === "buy" ? "bg-yellow-300 text-zinc-950" : "text-white/50 hover:text-white"}`}>Buy Property</button>
        <button onClick={() => setTab("portfolio")} className={`flex-1 py-3 font-black text-sm transition ${tab === "portfolio" ? "bg-yellow-300 text-zinc-950" : "text-white/50 hover:text-white"}`}>Portfolio ({properties.length})</button>
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
                  <p className="font-black text-yellow-300">{fmt(pt.buyPrice)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onBuy(pt)} disabled={!canAfford}
                    className="flex-1 py-2 rounded-xl bg-emerald-400 text-zinc-950 font-black text-xs hover:bg-emerald-300 disabled:opacity-40">
                    Buy & Rent
                  </button>
                  <div className="flex-1 rounded-xl border border-white/10 px-2 py-2 text-center text-[10px] text-white/30">
                    Flip: {fmt(pt.flipGain[0])}–{fmt(pt.flipGain[1])} / {pt.flipTurns}t
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === "portfolio" && (
        <div className="p-4 space-y-3">
          {properties.length === 0 && <p className="text-white/40 text-sm text-center py-4">No properties yet.</p>}
          {properties.map(p => {
            const def = PROPERTY_TYPES.find(pt => pt.type === p.type)!;
            const appr = Math.round(p.currentValue - p.purchasePrice);
            return (
              <div key={p.id} className={`rounded-2xl border p-4 ${p.isFlipping ? "border-orange-400/40 bg-orange-900/10" : "border-white/10 bg-black/20"}`}>
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-black text-sm">{def.icon} {p.address}</p>
                    <p className="text-[10px] text-white/30">Bought {fmt(p.purchasePrice)} · Now {fmt(p.currentValue)}</p>
                    {appr > 0 && <p className="text-[10px] text-emerald-400">+{fmt(appr)} appreciation</p>}
                  </div>
                  {p.isFlipping
                    ? <div className="text-right"><p className="text-orange-300 font-black text-xs">🔨 Flipping</p><p className="text-[10px] text-white/30">{p.flipTurnsLeft}t left</p></div>
                    : <p className="text-emerald-300 font-black text-xs">+{fmt(p.rentPerTurn)}/t</p>
                  }
                </div>
                {!p.isFlipping && (
                  <div className="flex gap-2">
                    <button onClick={() => onFlip(p.id)} className="flex-1 py-2 rounded-xl bg-orange-400 text-zinc-950 font-black text-xs hover:bg-orange-300">🔨 Flip</button>
                    <button onClick={() => onSell(p.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-black text-xs hover:bg-red-400">Sell {fmt(p.currentValue)}</button>
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
      if (ex) { const ts = ex.shares + shares; ex.avgCost = (ex.shares * ex.avgCost + shares * price) / ts; ex.shares = ts; }
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
      {isFinance && <p className="text-xs text-emerald-300 bg-emerald-900/30 rounded-xl px-3 py-2 mb-2">⚡ Finance 2× leverage — buy at 50% cost</p>}
      <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
        {STOCK_DEFS.map(def => {
          const price = prices[def.id] ?? def.base;
          const hist  = history[def.id] ?? [price];
          const prev  = hist[hist.length - 2] ?? price;
          const pct   = prev > 0 ? ((price - prev) / prev * 100) : 0;
          const held  = holdings.find(h => h.id === def.id);
          return (
            <button key={def.id} onClick={() => { setSel(sel === def.id ? null : def.id); setShares(10); setMode("buy"); }}
              className={`w-full text-left rounded-2xl border p-2.5 transition ${sel === def.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[11px] w-9 text-yellow-300">{def.ticker}</span>
                  <span className="text-[9px] text-white/25 border border-white/10 rounded px-1">{def.sector}</span>
                  {held && <span className="text-[9px] text-blue-300">{held.shares}sh</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-4">
                    {hist.slice(-10).map((p, i, a) => {
                      const mx = Math.max(...a), mn = Math.min(...a);
                      const h = mx === mn ? 4 : Math.max(2, Math.round(((p - mn) / (mx - mn)) * 14));
                      return <div key={i} className="w-1 rounded-sm" style={{ height: h, background: p >= (a[i-1] ?? p) ? "#34d399" : "#f87171" }} />;
                    })}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs">{fmtP(price)}</div>
                    <div className={`text-[9px] font-bold ${pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {sel && (() => {
        const def  = STOCK_DEFS.find(s => s.id === sel)!;
        const price = prices[sel] ?? def.base;
        const held  = holdings.find(h => h.id === sel);
        const maxB  = isFinance ? Math.floor(cash * 2 / price) : Math.floor(cash / price);
        const maxS  = held?.shares ?? 0;
        const cost  = Math.round(price * shares * (isFinance && mode === "buy" ? 0.5 : 1) * 100) / 100;
        return (
          <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-4 mt-2">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode("buy")}  className={`flex-1 py-2 rounded-xl font-black text-sm ${mode === "buy" ? "bg-emerald-400 text-zinc-950" : "border border-white/10 text-white/50"}`}>Buy</button>
              <button onClick={() => setMode("sell")} disabled={!held} className={`flex-1 py-2 rounded-xl font-black text-sm disabled:opacity-30 ${mode === "sell" ? "bg-red-400 text-white" : "border border-white/10 text-white/50"}`}>Sell</button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setShares(Math.max(1, shares - 100))} className="w-9 h-9 rounded-full border border-white/10 font-black flex items-center justify-center hover:bg-white/10 text-sm">−100</button>
              <button onClick={() => setShares(Math.max(1, shares - 10))}  className="w-9 h-9 rounded-full border border-white/10 font-black flex items-center justify-center hover:bg-white/10">−</button>
              <div className="flex-1 text-center"><div className="font-black text-2xl">{shares}</div><div className="text-[10px] text-white/40">shares</div></div>
              <button onClick={() => setShares(Math.min(mode === "buy" ? maxB : maxS, shares + 10))}   className="w-9 h-9 rounded-full border border-white/10 font-black flex items-center justify-center hover:bg-white/10">+</button>
              <button onClick={() => setShares(Math.min(mode === "buy" ? maxB : maxS, shares + 100))}  className="w-9 h-9 rounded-full border border-white/10 font-black flex items-center justify-center hover:bg-white/10 text-sm">+100</button>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[1, 10, 50, 100, 500, 1000].map(n => (
                <button key={n} onClick={() => setShares(Math.min(mode === "buy" ? maxB : maxS, n))}
                  className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold hover:bg-white/10">{n}</button>
              ))}
              <button onClick={() => setShares(mode === "buy" ? maxB : maxS)} className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold hover:bg-white/10">Max</button>
            </div>
            <p className="text-xs text-white/50 mb-3 text-center">{mode === "buy" ? `Cost: ${fmt(cost)}${isFinance ? " (2× leverage)" : ""}` : `Proceeds: ${fmt(cost)}`}</p>
            <button onClick={trade}
              disabled={mode === "buy" ? shares > maxB || shares < 1 : shares > maxS || shares < 1}
              className={`w-full py-3 rounded-2xl font-black text-sm transition hover:scale-105 disabled:opacity-30 ${mode === "buy" ? "bg-emerald-400 text-zinc-950" : "bg-red-400 text-white"}`}>
              {mode === "buy" ? `Buy ${shares} shares` : `Sell ${shares} shares`}
            </button>
          </div>
        );
      })()}

      {holdings.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          {holdings.map(h => {
            const price = prices[h.id] ?? h.avgCost;
            const pnl = Math.round((price - h.avgCost) * h.shares);
            return (
              <div key={h.id} className="flex justify-between text-[10px] py-1.5 border-b border-white/5">
                <span className="font-black text-yellow-300 w-9">{h.ticker}</span>
                <span className="text-white/40">{h.shares}sh</span>
                <span className={pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</span>
                <span className="font-black">{fmt(price * h.shares)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CRYPTO PANEL ─────────────────────────────────────────────────────────────
function CryptoPanel({ cash, holdings, prices, history, onTrade }: {
  cash: number; holdings: CryptoHolding[]; prices: Record<string, number>;
  history: Record<string, number[]>;
  onTrade: (newCash: number, newHoldings: CryptoHolding[]) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  function trade() {
    if (!sel) return;
    const price = prices[sel] ?? 1;
    const newH = holdings.map(h => ({ ...h }));
    if (mode === "buy") {
      if (cash < amount) return;
      const coins = amount / price;
      const ex = newH.find(h => h.coin === sel);
      if (ex) { const tot = ex.amount + coins; ex.avgCost = (ex.amount * ex.avgCost + coins * price) / tot; ex.amount = tot; }
      else newH.push({ coin: sel, amount: coins, avgCost: price });
      onTrade(Math.round((cash - amount) * 100) / 100, newH);
    } else {
      const ex = newH.find(h => h.coin === sel);
      if (!ex || ex.amount <= 0) return;
      const sellCoins = Math.min(amount / price, ex.amount);
      const proceeds = Math.round(sellCoins * price * 100) / 100;
      ex.amount -= sellCoins;
      onTrade(Math.round((cash + proceeds) * 100) / 100, newH.filter(h => h.amount > 0.0001));
    }
    setSel(null); setAmount(100);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-yellow-300 bg-yellow-900/30 rounded-xl px-3 py-2 mb-2">⚠️ Crypto: extreme volatility. 10× gains or 80% crashes possible.</p>
      <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {CRYPTO_DEFS.map(def => {
          const price = prices[def.id] ?? def.base;
          const hist  = history[def.id] ?? [price];
          const prev  = hist[hist.length - 2] ?? price;
          const pct   = prev > 0 ? ((price - prev) / prev * 100) : 0;
          const held  = holdings.find(h => h.coin === def.id);
          return (
            <button key={def.id} onClick={() => { setSel(sel === def.id ? null : def.id); setAmount(100); setMode("buy"); }}
              className={`w-full text-left rounded-2xl border p-2.5 transition ${sel === def.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[11px] w-10 text-yellow-300">{def.ticker}</span>
                  {held && <span className="text-[9px] text-orange-300">{held.amount.toFixed(4)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-4">
                    {hist.slice(-8).map((p, i, a) => {
                      const mx = Math.max(...a), mn = Math.min(...a);
                      const h = mx === mn ? 4 : Math.max(2, Math.round(((p - mn) / (mx - mn)) * 14));
                      return <div key={i} className="w-1 rounded-sm" style={{ height: h, background: p >= (a[i-1] ?? p) ? "#f59e0b" : "#ef4444" }} />;
                    })}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs">{fmt(price)}</div>
                    <div className={`text-[9px] font-bold ${pct >= 0 ? "text-yellow-300" : "text-red-400"}`}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {sel && (() => {
        const def   = CRYPTO_DEFS.find(s => s.id === sel)!;
        const price = prices[sel] ?? def.base;
        const held  = holdings.find(h => h.coin === sel);
        const heldValue = held ? Math.round(held.amount * price) : 0;
        return (
          <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-4">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode("buy")}  className={`flex-1 py-2 rounded-xl font-black text-sm ${mode === "buy" ? "bg-yellow-400 text-zinc-950" : "border border-white/10 text-white/50"}`}>Buy ${}</button>
              <button onClick={() => setMode("sell")} disabled={!held} className={`flex-1 py-2 rounded-xl font-black text-sm disabled:opacity-30 ${mode === "sell" ? "bg-red-400 text-white" : "border border-white/10 text-white/50"}`}>Sell $</button>
            </div>
            <div className="text-3xl font-black text-yellow-300 text-center mb-2">{fmt(amount)}</div>
            <input type="range" min={10} max={mode === "buy" ? Math.min(cash, 500000) : heldValue} step={10}
              value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full mb-3 accent-yellow-300" />
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[100, 500, 1000, 5000, 10000].filter(v => v <= (mode === "buy" ? cash : heldValue)).map(n => (
                <button key={n} onClick={() => setAmount(n)} className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold hover:bg-white/10">{fmt(n)}</button>
              ))}
              <button onClick={() => setAmount(mode === "buy" ? Math.min(cash, 500000) : heldValue)}
                className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold hover:bg-white/10">All In</button>
            </div>
            <p className="text-[10px] text-white/40 mb-3 text-center">≈ {(amount / price).toFixed(6)} {def.ticker} @ {fmt(price)}</p>
            <button onClick={trade}
              disabled={mode === "buy" ? amount > cash : amount > heldValue}
              className="w-full py-3 rounded-2xl font-black text-sm bg-yellow-400 text-zinc-950 hover:bg-yellow-300 disabled:opacity-30">
              {mode === "buy" ? `Buy ${def.ticker} worth ${fmt(amount)}` : `Sell ${def.ticker} worth ${fmt(amount)}`}
            </button>
          </div>
        );
      })()}
      {holdings.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          {holdings.map(h => {
            const price = prices[h.coin] ?? h.avgCost;
            const value = Math.round(h.amount * price);
            const pnl   = Math.round((price - h.avgCost) * h.amount);
            return (
              <div key={h.coin} className="flex justify-between text-[10px] py-1.5 border-b border-white/5">
                <span className="font-black text-yellow-300 w-10">{h.coin.toUpperCase()}</span>
                <span className="text-white/40">{h.amount.toFixed(4)}</span>
                <span className={pnl >= 0 ? "text-yellow-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</span>
                <span className="font-black">{fmt(value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── BUSINESS UPGRADE PANEL ───────────────────────────────────────────────────
function BusinessPanel({ businesses, cash, onUpgrade }: {
  businesses: Business[]; cash: number; onUpgrade: (id: string) => void;
}) {
  if (businesses.length === 0) return (
    <p className="text-white/40 text-sm text-center py-4">No businesses yet. Advance your career to unlock one.</p>
  );
  return (
    <div className="space-y-3">
      {businesses.map(b => {
        const canUpgrade = cash >= b.upgradeCost && b.level < b.maxLevel;
        const pct = ((b.level - 1) / (b.maxLevel - 1)) * 100;
        return (
          <div key={b.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex justify-between mb-2">
              <div>
                <p className="font-black text-sm">🏢 {b.name}</p>
                <p className="text-[10px] text-white/40">Level {b.level} / {b.maxLevel}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-300 text-sm">+{fmt(b.incomePerTurn)}/turn</p>
                {b.level < b.maxLevel && <p className="text-[10px] text-white/40">Next: +{fmt(Math.round(b.incomePerTurn * 0.9))}/turn</p>}
              </div>
            </div>
            {/* Level bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            {b.level < b.maxLevel ? (
              <button onClick={() => onUpgrade(b.id)} disabled={!canUpgrade}
                className={`w-full py-2.5 rounded-xl font-black text-sm transition hover:scale-[1.02] ${canUpgrade ? "bg-purple-500 text-white hover:bg-purple-400" : "border border-white/10 text-white/30"}`}>
                {canUpgrade ? `Upgrade to Lvl ${b.level + 1} — ${fmt(b.upgradeCost)}` : `Need ${fmt(b.upgradeCost)} to upgrade`}
              </button>
            ) : (
              <div className="text-center text-xs text-yellow-300 font-black py-2">✦ MAXED OUT ✦</div>
            )}
          </div>
        );
      })}
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
  const [activePanel, setActivePanel] = useState<string | null>(null);
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
    const sv   = g.holdings.reduce((s, h) => s + h.shares * (g.stockPrices[h.id] ?? 0), 0);
    const cv2  = g.cryptoHoldings.reduce((s, h) => s + h.amount * (g.cryptoPrices[h.coin] ?? 0), 0);
    const pv   = g.properties.reduce((s, p) => s + p.currentValue, 0);
    const score = Math.round(g.cash + g.bonds + sv + cv2 + pv);
    saveScore({ gameId: "the-grind", score, durationSeconds: TOTAL_TURNS * 15, accuracy: 1, attemptNumber: 1 })
      .then(r => console.log("SAVE:", r));
  }, [screen, g]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0; }, [g?.log.length]);

  const career   = g ? CAREERS.find(c => c.id === g.careerId)! : null;
  const tierIdx  = g && career ? getTierIdx(career.tiers, g.xp) : 0;
  const tier     = career ? career.tiers[tierIdx] : null;
  const bm       = g && career ? getBurnoutMulti(career.special, tierIdx, g.burnout) : 1;
  const salary   = tier ? Math.round(tier.income * bm) : 0;
  const mRate    = g ? (MARKET[g.turn - 1] ?? 0) : 0;
  const ml       = mktLabel(mRate);
  const stockVal = g ? g.holdings.reduce((s, h) => s + h.shares * (g.stockPrices[h.id] ?? 0), 0) : 0;
  const cryptoVal = g ? g.cryptoHoldings.reduce((s, h) => s + h.amount * (g.cryptoPrices[h.coin] ?? 0), 0) : 0;
  const propVal  = g ? g.properties.reduce((s, p) => s + p.currentValue, 0) : 0;
  const netWorth = g ? Math.round(g.cash + g.bonds + stockVal + cryptoVal + propVal) : 0;
  const rentPT   = g ? g.properties.filter(p => !p.isFlipping).reduce((s, p) => s + p.rentPerTurn, 0) : 0;
  const bizIncome = g ? g.businesses.reduce((s, b) => s + b.incomePerTurn, 0) : 0;
  const burnoutColor = g ? (g.burnout > 70 ? "text-red-300" : g.burnout > 45 ? "text-yellow-300" : "text-emerald-300") : "text-emerald-300";

  function initGame(careerId: string): GameState {
    const c = CAREERS.find(x => x.id === careerId)!;
    const sp: Record<string, number> = {};
    const sh: Record<string, number[]> = {};
    for (const s of STOCK_DEFS) { sp[s.id] = s.base; sh[s.id] = [s.base]; }
    const cp: Record<string, number> = {};
    const ch: Record<string, number[]> = {};
    for (const s of CRYPTO_DEFS) { cp[s.id] = s.base; ch[s.id] = [s.base]; }
    return {
      turn: 1, cash: c.startCash, bonds: 0, xp: 0, burnout: 0,
      passive: 0, marketHint: false, specialised: false, prodBoost: 1.0,
      casinoProfit: 0, totalEarned: 0, totalLost: 0, careerId,
      log: [], holdings: [], stockPrices: sp, stockHistory: sh,
      properties: [], businesses: [],
      patentTurnsLeft: 0, patentIncome: 0,
      sponsorshipTurnsLeft: 0, sponsorshipIncome: 0,
      shortTermRentalTurnsLeft: 0, shortTermRentalIncome: 0,
      pharmaPassive: 0, hospitalPassive: 0,
      followers: 0, caseWins: 0,
      reitPassive: 0, merchPassive: 0,
      discountNextProperty: false, stagingBoost: false,
      topSalary: 0, redevPassive: 0,
      lawRetainerIncome: 0, lawRetainerTurns: 0,
      cryptoHoldings: [], cryptoPrices: cp, cryptoHistory: ch,
      lifeEvents: [], angelInvestments: [], angelPassive: 0,
      vcFundPassive: 0, vodkaTurnsLeft: 0, energyDrinkTurns: 0,
      networkingBonus: 0, networkingTurns: 0,
      coachingPassive: 0, podcastPassive: 0,
      ghostwritingPassive: 0, nftRoyaltyPassive: 0,
      lawsuitDefenseCost: 0, blackmarketTurns: 0, blackmarketPassive: 0,
      therapyActive: false,
    };
  }

  function lg(state: GameState, msg: string, type = ""): GameState {
    return { ...state, log: [{ turn: state.turn, msg, type }, ...state.log].slice(0, 100) };
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
    const { newPrices, newHistory }         = tickStocks(state.stockPrices, state.stockHistory, state.turn);
    const { newCryptoPrices, newCryptoHistory } = tickCrypto(state.cryptoPrices, state.cryptoHistory, state.turn);
    let ns: GameState = { ...state, stockPrices: newPrices, stockHistory: newHistory, cryptoPrices: newCryptoPrices, cryptoHistory: newCryptoHistory };

    // Angel investment payouts
    ns.angelInvestments = ns.angelInvestments.filter(inv => {
      if (ns.turn - inv.turnInvested >= 10) {
        const mult = Math.random() < 0.4 ? (5 + Math.random() * 10) : 0;
        if (mult > 0) {
          const payout = Math.round(inv.cost * mult);
          ns.cash += payout; ns.totalEarned += payout;
          ns = lg(ns, `🚀 Angel investment "${inv.company}" paid ${mult.toFixed(1)}× → +${fmt(payout)}!!!`, "special");
        } else {
          ns = lg(ns, `Angel investment "${inv.company}" went bust. Lost ${fmt(inv.cost)}.`, "neg");
        }
        return false;
      }
      return true;
    });

    // Fire global event
    const ev = EVENTS.find(e => e.turn === ns.turn);
    if (ev) {
      if (ev.amount === -999) {
        if (ev.turn === 31) { const pct = 0.12 + Math.random() * 0.12; ns.bonds = Math.round(ns.bonds * (1 - pct)); setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `-${Math.round(pct * 100)}% bonds` }); }
        else if (ev.turn === 51) { const pct = 0.18 + Math.random() * 0.1; ns.bonds = Math.round(ns.bonds * (1 - pct)); ns.cash = Math.max(0, Math.round(ns.cash * 0.88)); setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `-${Math.round(pct * 100)}% portfolio` }); }
        else if (ev.turn === 21) { ns.marketHint = true; setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: "Forecast unlocked" }); }
        else if (ev.turn === 66) { const boost = Math.round(ns.bonds * 0.15); ns.bonds += boost; ns.cash += Math.round(ns.cash * 0.1); setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `+${fmt(boost)} bonds` }); }
      } else {
        const rng = ev.amount > 0 ? ev.amount + Math.round(Math.random() * ev.amount * 0.5) : ev.amount - Math.round(Math.random() * Math.abs(ev.amount) * 0.5);
        ns.cash = Math.max(0, ns.cash + rng);
        if (rng > 0) ns.totalEarned += rng; else ns.totalLost += Math.abs(rng);
        setEventBanner({ type: ev.type, icon: ev.icon, title: ev.title, sub: ev.sub, result: `${rng >= 0 ? "+" : ""}${fmt(rng)}` });
      }
    } else setEventBanner(null);

    // All passive income
    const passiveTotal =
      ns.passive + rentPT + bizIncome + ns.reitPassive + ns.pharmaPassive + ns.hospitalPassive +
      ns.angelPassive + ns.vcFundPassive + ns.coachingPassive + ns.podcastPassive +
      ns.ghostwritingPassive + ns.nftRoyaltyPassive + ns.redevPassive +
      (ns.patentTurnsLeft > 0 ? ns.patentIncome : 0) +
      (ns.sponsorshipTurnsLeft > 0 ? ns.sponsorshipIncome : 0) +
      (ns.shortTermRentalTurnsLeft > 0 ? ns.shortTermRentalIncome : 0) +
      (ns.lawRetainerTurns > 0 ? ns.lawRetainerIncome : 0);

    if (passiveTotal > 0) { ns.cash += passiveTotal; ns.totalEarned += passiveTotal; }

    // Tick timers
    if (ns.patentTurnsLeft > 0) ns.patentTurnsLeft--;
    if (ns.sponsorshipTurnsLeft > 0) ns.sponsorshipTurnsLeft--;
    if (ns.shortTermRentalTurnsLeft > 0) ns.shortTermRentalTurnsLeft--;
    if (ns.lawRetainerTurns > 0) ns.lawRetainerTurns--;
    if (ns.energyDrinkTurns > 0) ns.energyDrinkTurns--;
    if (ns.networkingTurns > 0) ns.networkingTurns--;
    if (ns.blackmarketTurns > 0) ns.blackmarketTurns--;

    // Property appreciation every 5 turns
    if (ns.turn % 5 === 0 && ns.properties.length > 0) {
      ns.properties = ns.properties.map(p => ({ ...p, currentValue: Math.round(p.currentValue * 1.03) }));
      ns = lg(ns, "Properties appreciated +3%", "special");
    }

    // Flip resolutions
    ns.properties = ns.properties.map(p => {
      if (!p.isFlipping) return p;
      if (p.flipTurnsLeft <= 1) {
        const def = PROPERTY_TYPES.find(pt => pt.type === p.type)!;
        const mult = ns.stagingBoost ? 1.3 : 1;
        const gain = Math.round((def.flipGain[0] + Math.random() * (def.flipGain[1] - def.flipGain[0])) * mult);
        ns.cash += gain; ns.totalEarned += gain;
        ns.stagingBoost = false;
        ns = lg(ns, `🏠 Flip complete: ${p.address} → ${fmt(gain)}!`, "special");
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

    // Panel actions
    if (["casino","stocks","realestate","crypto","business"].includes(selAction)) {
      setActivePanel(selAction);
      return;
    }

    let ns = applyBondReturn({ ...g });
    const prevTier = getTierIdx(career.tiers, ns.xp);

    // ── CORE ACTIONS ───────────────────────────────────────────────────────
    if (selAction === "work") {
      ns.cash += salary; ns.totalEarned += salary;
      ns.burnout = Math.min(100, ns.burnout + career.workBurnout);
      ns = lg(ns, `${career.workName} — +${fmt(salary)}`, "pos");

    } else if (selAction === "rest") {
      const rec = Math.min(ns.burnout, 28); ns.burnout = Math.max(0, ns.burnout - 28);
      ns = lg(ns, `Rested — burnout -${rec}%`);
      if (ns.therapyActive) { ns.burnout = Math.max(0, ns.burnout - 10); ns = lg(ns, `Therapy session: extra -10% burnout`, "special"); }

    } else if (selAction === "bonds") {
      const amt = Math.round(ns.cash * 0.20);
      if (amt > 0) { ns.cash -= amt; ns.bonds += amt; ns = lg(ns, `Invested ${fmt(amt)} in bonds`); }

    } else if (selAction === "therapy") {
      if (ns.cash >= 300) {
        ns.cash -= 300; ns.burnout = Math.max(0, ns.burnout - 40); ns.therapyActive = true;
        ns = lg(ns, `Therapy session — -40% burnout, ongoing bonus`, "special");
      }

    } else if (selAction === "networking") {
      if (ns.cash >= 200) {
        ns.cash -= 200; ns.networkingBonus = Math.round(salary * 0.15); ns.networkingTurns = 5;
        ns = lg(ns, `Networking event — +${fmt(ns.networkingBonus)}/turn for 5 turns`, "special");
      }

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

    } else {
      // ── STUDY ACTIONS ────────────────────────────────────────────────────
      const sa = career.studyActions.find(a => a.id === selAction);
      const ua = career.uniqueActions?.find((a: { id: string }) => a.id === selAction);
      const ea = (career as typeof CAREERS[0]).extraActivities?.find((a: { id: string }) => a.id === selAction);

      if (sa) {
        // Per-action effects
        if (sa.id === "oss" && Math.random() < 0.25) { const b = 300 + Math.round(Math.random() * 500); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Recruiter bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "ai" && Math.random() < 0.3) { const b = 1000 + Math.round(Math.random() * 4000); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `AI consulting deal — +${fmt(b)}`, "special"); }
        else if (sa.id === "quant" && Math.random() < 0.4) { const b = 2000 + Math.round(Math.random() * 4000); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Algo strategy payout — +${fmt(b)}`, "special"); }
        else if (sa.id === "net" && Math.random() < 0.2) { const b = 400 + Math.round(Math.random() * 900); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Deal closed — +${fmt(b)}`, "special"); }
        else if (sa.id === "aud") { ns.passive += 100; ns = lg(ns, `Audience built — passive +$100/turn (total: $${ns.passive}/turn)`, "special"); }
        else if (sa.id === "prod") { ns.prodBoost += 0.20; ns = lg(ns, `Production +20% — hustle now ×${ns.prodBoost.toFixed(2)}`, "special"); }
        else if (sa.id === "col" && Math.random() < 0.4) { const g2 = 1000 + Math.round(Math.random() * 3000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `VIRAL collab — +${fmt(g2)}`, "special"); }
        else if (sa.id === "moonlight") { const inc = Math.round(salary * 0.8); ns.cash += inc; ns.totalEarned += inc; ns = lg(ns, `Moonlight shift — +${fmt(inc)}`, "pos"); }
        else if (sa.id === "research" && Math.random() < 0.3) { const b = 800 + Math.round(Math.random() * 1200); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Research grant — +${fmt(b)}`, "special"); }
        else if (sa.id === "reit" && ns.cash >= 600) { ns.cash -= 600; ns.reitPassive += 120; ns = lg(ns, `REIT purchased — +$120/turn`, "special"); }
        else if (sa.id === "merch" && ns.cash >= 400) { ns.cash -= 400; ns.merchPassive = (ns as GameState & { mechPassive?: number }).mechPassive ?? 0; ns.passive += 200; ns = lg(ns, `Merch launched — +$200/turn`, "special"); }
        else if (sa.id === "course" && ns.cash >= 200) { ns.cash -= 200; if (Math.random() < 0.7) { const g2 = 800 + Math.round(Math.random() * 2200); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Course sold — +${fmt(g2)}`, "pos"); } }
        else if (sa.id === "hedge" && Math.random() < 0.35) { const b = 1000 + Math.round(Math.random() * 2000); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Hedge bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "crypto") { const win = Math.random() < 0.5; const amt = 2500; if (win) { ns.cash += amt; ns.totalEarned += amt; ns = lg(ns, `Crypto trade WIN — +${fmt(amt)}`, "pos"); } else { ns.cash = Math.max(0, ns.cash - amt); ns.totalLost += amt; ns = lg(ns, `Crypto trade LOSS — -${fmt(amt)}`, "neg"); } }
        else if (sa.id === "cert" && Math.random() < 0.4) { const b = 500; ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Certification bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "surgery" && Math.random() < 0.2) { const b = 1500; ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Surgical bonus — +${fmt(b)}`, "special"); }
        else if (sa.id === "pharma") { ns.cash += 2000; ns.pharmaPassive += 150; ns.totalEarned += 2000; ns = lg(ns, `Pharma deal: +$2000 + $150/turn passive`, "special"); }
        else if (sa.id === "spec") { ns.specialised = true; ns = lg(ns, `Specialised — case win bonuses now active`, "special"); }
        else if (sa.id === "probono" && Math.random() < 0.3) { const b = 1000 + Math.round(Math.random() * 2500); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Landmark case — +${fmt(b)}`, "special"); }
        else if (sa.id === "bigcase") { const win = Math.random() < 0.6; if (win) { const g2 = 2000 + Math.round(Math.random() * 6000); ns.cash += g2; ns.totalEarned += g2; ns.caseWins++; ns = lg(ns, `Big case WIN — +${fmt(g2)}`, "pos"); } else { ns.cash = Math.max(0, ns.cash - 1000); ns.totalLost += 1000; ns = lg(ns, `Big case LOST — -$1,000`, "neg"); } }
        else if (sa.id === "retainer" && ns.cash >= 200) { ns.cash -= 200; ns.lawRetainerTurns += 5; ns.lawRetainerIncome = 300; ns = lg(ns, `Retainer secured — +$300/turn × 5 turns`, "special"); }
        else if (sa.id === "zoning" && Math.random() < 0.35) { ns.discountNextProperty = true; ns = lg(ns, `Zoning research: next property 20% cheaper`, "special"); }
        else if (sa.id === "network2" && Math.random() < 0.25) { const b = 500 + Math.round(Math.random() * 1000); ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Broker deal — +${fmt(b)}`, "special"); }
        else if (sa.id === "staging") { ns.stagingBoost = true; ns = lg(ns, `Staging boost: next flip +30%`, "special"); }
        else { ns = lg(ns, `${sa.name} — +${sa.xp} XP`); }

        // Business unlock check
        const newTi = getTierIdx(career.tiers, ns.xp + sa.xp);
        if (newTi >= career.businessUnlockTier && !ns.businesses.find(b => b.careerId === career.id)) {
          ns.businesses = [...ns.businesses, {
            id: `${career.id}_biz`, careerId: career.id,
            name: career.businessName, level: 1,
            incomePerTurn: career.businessBase,
            upgradeCost: career.businessUpgradeCost,
            maxLevel: career.businessMaxLevel,
          }];
          ns = lg(ns, `🏢 ${career.businessName} UNLOCKED — +${fmt(career.businessBase)}/turn!`, "special");
        }

        ns.xp = Math.round((ns.xp + sa.xp) * 10) / 10;
        ns.burnout = Math.min(100, ns.burnout + sa.burnout);

      } else if (ua) {
        // ── UNIQUE ACTIONS ──────────────────────────────────────────────────
        if (ua.cost > 0 && ns.cash < ua.cost) { ns = lg(ns, `Need ${fmt(ua.cost)} for this.`); }
        else {
          if (ua.cost > 0) ns.cash -= ua.cost;
          if (ua.id === "ipo") { if (Math.random() < 0.6) { const g2 = 6000 + Math.round(Math.random() * 12000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `IPO SUCCESS — +${fmt(g2)}!`, "special"); } else ns = lg(ns, `IPO failed.`, "neg"); }
          else if (ua.id === "patent") { ns.patentTurnsLeft = 6; ns.patentIncome = 300; ns = lg(ns, `Patent: +$300/turn × 6 turns`, "special"); }
          else if (ua.id === "acqui" && Math.random() < 0.3) { const b = 3000; ns.cash += b; ns.totalEarned += b; ns = lg(ns, `Acqui-hire +${fmt(b)}`, "special"); }
          else if (ua.id === "angel") {
            const companies = ["NeuralX","QuantumLeap","BioNest","ZeroGrav","DataPulse","AetherAI","FluxDrive","SkyLoop"];
            ns.angelInvestments = [...ns.angelInvestments, { company: companies[Math.floor(Math.random() * companies.length)], cost: ua.cost, turnInvested: ns.turn }];
            ns = lg(ns, `Angel investment made — result in ~10 turns...`, "special");
          }
          else if (ua.id === "mentor") { ns.passive += 200; ns = lg(ns, `Mentorship: +$200/turn forever`, "special"); }
          else if (ua.id === "forex") { if (Math.random() < 0.55) { ns.cash += 1800; ns.totalEarned += 1800; ns = lg(ns, `Forex WIN — +$1,800`, "pos"); } else { ns.totalLost += ua.cost; ns = lg(ns, `Forex LOSS`, "neg"); } }
          else if (ua.id === "short") { if (Math.random() < 0.45) { ns.cash += 3500; ns.totalEarned += 3500; ns = lg(ns, `Short trade WIN — +$3,500`, "pos"); } else { ns.totalLost += ua.cost; ns = lg(ns, `Short trade LOSS`, "neg"); } }
          else if (ua.id === "merger") { const g2 = 800 + Math.round(Math.random() * 1700); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `M&A fee — +${fmt(g2)}`, "pos"); }
          else if (ua.id === "options") { if (Math.random() < 0.4) { const amt = Math.round(salary * 3); ns.cash += amt; ns.totalEarned += amt; ns = lg(ns, `Options 3× WIN — +${fmt(amt)}!`, "special"); } else ns = lg(ns, `Options expired.`, "neg"); }
          else if (ua.id === "viral") { if (Math.random() < 0.5) { const g2 = 4000 + Math.round(Math.random() * 6000); ns.cash += g2; ns.totalEarned += g2; ns.followers += 1000; ns = lg(ns, `WENT VIRAL — +${fmt(g2)} + 1k followers!`, "special"); } }
          else if (ua.id === "sponsorship") { const inc = 400 + Math.round(Math.random() * 800); ns.sponsorshipTurnsLeft = 4; ns.sponsorshipIncome = inc; ns = lg(ns, `Sponsorship: +${fmt(inc)}/turn × 4 turns`, "special"); }
          else if (ua.id === "nft") { if (Math.random() < 0.35) { ns.cash += 5000; ns.totalEarned += 5000; ns = lg(ns, `NFT drop SOLD OUT — +$5,000!`, "special"); } else ns = lg(ns, `NFT flopped.`, "neg"); }
          else if (ua.id === "ghostwrite") { ns.ghostwritingPassive += 300; ns = lg(ns, `Ghost-writing: +$300/turn passive`, "special"); }
          else if (ua.id === "nftroyal" && ns.cash >= 500) { ns.cash -= 500; ns.nftRoyaltyPassive += 150; ns = lg(ns, `NFT royalties: +$150/turn forever`, "special"); }
          else if (ua.id === "trial") { if (Math.random() < 0.7) { const g2 = 5000 + Math.round(Math.random() * 7000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Clinical trial SUCCESS — +${fmt(g2)}`, "pos"); } }
          else if (ua.id === "hospital") { ns.hospitalPassive += 600; ns = lg(ns, `Hospital equity: +$600/turn forever`, "special"); }
          else if (ua.id === "patent2") { ns.patentTurnsLeft = 8; ns.patentIncome = Math.max(ns.patentIncome, 250); ns = lg(ns, `Medical patent: +$250/turn × 8 turns`, "special"); }
          else if (ua.id === "telemede") { ns.passive += 400; ns = lg(ns, `Telehealth app: +$400/turn passive`, "special"); }
          else if (ua.id === "biotech") {
            ns.angelInvestments = [...ns.angelInvestments, { company: "BioTech Startup", cost: ua.cost, turnInvested: ns.turn - 2 }];
            ns = lg(ns, `Biotech investment made — result in ~8 turns...`, "special");
          }
          else if (ua.id === "luxury") { const pid = `prop_luxury_${Date.now()}`; ns.properties = [...ns.properties, { id: pid, address: `${Math.floor(Math.random()*999)+1} Luxury Lane`, type: "luxury", purchasePrice: ua.cost, currentValue: ua.cost, rentPerTurn: 500, isFlipping: false, flipTurnsLeft: 0 }]; ns = lg(ns, `Luxury property: +$500/turn`, "special"); }
          else if (ua.id === "commercial") { ns.shortTermRentalTurnsLeft = 12; ns.shortTermRentalIncome = 400; ns = lg(ns, `Commercial lease: +$400/turn × 12 turns`, "special"); }
          else if (ua.id === "auct") { if (Math.random() < 0.55) { const g2 = 3000 + Math.round(Math.random() * 4000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Auction flip WIN — +${fmt(g2)}`, "pos"); } else ns = lg(ns, `Auction lost.`, "neg"); }
          else if (ua.id === "develop") { ns.redevPassive += 600; ns = lg(ns, `Land development: +$600/turn passive`, "special"); }
          else if (ua.id === "renoflip") { if (Math.random() < 0.65) { const g2 = 5000 + Math.round(Math.random() * 7000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Reno flip WIN — +${fmt(g2)}!`, "pos"); } else ns = lg(ns, `Reno over-budget.`, "neg"); }
          else if (ua.id === "settlement") { const g2 = 1000 + Math.round(Math.random() * 4000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Settlement — +${fmt(g2)}`, "pos"); }
          else if (ua.id === "classact") { if (Math.random() < 0.5) { const g2 = 10000 + Math.round(Math.random() * 10000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `CLASS ACTION WIN — +${fmt(g2)}!!!`, "special"); } else ns = lg(ns, `Class action dismissed.`, "neg"); }
          else if (ua.id === "arbitra" && Math.random() < 0.7) { ns.cash += 2000; ns.totalEarned += 2000; ns = lg(ns, `Arbitration WIN — +$2,000`, "pos"); }
          else if (ua.id === "ipo_law") { const g2 = 4000 + Math.round(Math.random() * 8000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `IPO legal counsel — +${fmt(g2)}`, "pos"); }
          else if (ua.id === "patent_law") { if (Math.random() < 0.65) { const g2 = 3000 + Math.round(Math.random() * 5000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Patent litigation WIN — +${fmt(g2)}`, "pos"); } else ns = lg(ns, `Patent case lost.`, "neg"); }
          if (ua.xp) ns.xp = Math.round((ns.xp + ua.xp) * 10) / 10;
        }

      } else if (ea) {
        // ── EXTRA ACTIVITIES ─────────────────────────────────────────────────
        if (ea.cost > 0 && ns.cash < ea.cost) { ns = lg(ns, `Need ${fmt(ea.cost)}.`); }
        else {
          if (ea.cost > 0) ns.cash -= ea.cost;
          if (ea.id === "podcast" || ea.id === "lawpodcast" || ea.id === "medpodcast") { ns.podcastPassive += 150; ns = lg(ns, `Podcast launched: +$150/turn passive`, "special"); }
          else if (ea.id === "course2") { if (Math.random() < 0.7) { const g2 = 800 + Math.round(Math.random() * 2200); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Online course sold — +${fmt(g2)}`, "pos"); } }
          else if (ea.id === "consult") { if (g.xp >= 10) { const g2 = 2000 + Math.round(Math.random() * 6000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `AI consulting gig — +${fmt(g2)}`, "pos"); } else ns = lg(ns, `Need more XP for consulting.`); }
          else if (ea.id === "hackathon") { if (Math.random() < 0.5) { const g2 = 1000 + Math.round(Math.random() * 3000); ns.cash += g2; ns.totalEarned += g2; ns.followers += 200; ns = lg(ns, `Hackathon WIN — +${fmt(g2)} + followers!`, "special"); } else ns = lg(ns, `Hackathon: tough competition.`); }
          else if (ea.id === "buyvc") { ns.vcFundPassive += 800; ns = lg(ns, `VC Fund: +$800/turn passive`, "special"); }
          else if (ea.id === "newsletter") { ns.passive += 250; ns = lg(ns, `Finance newsletter: +$250/turn passive`, "special"); }
          else if (ea.id === "spac") { if (Math.random() < 0.5) { const g2 = 8000 + Math.round(Math.random() * 12000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `SPAC WIN — +${fmt(g2)}!`, "special"); } else ns = lg(ns, `SPAC failed.`, "neg"); }
          else if (ea.id === "insider") { if (Math.random() < 0.6) { const g2 = 3000; ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Info arbitrage — +$3,000`, "pos"); } else { ns.cash = Math.max(0, ns.cash - 2000); ns.totalLost += 2000; ns = lg(ns, `SEC fine! -$2,000`, "neg"); } }
          else if (ea.id === "commodities") { if (Math.random() < 0.5) { ns.cash += 1500; ns.totalEarned += 1500; ns = lg(ns, `Commodities WIN — +$1,500`, "pos"); } else { ns.totalLost += ea.cost; ns = lg(ns, `Commodities LOSS`, "neg"); } }
          else if (ea.id === "onlyfans") { if (Math.random() < 0.8) { const inc = 600 + Math.round(Math.random() * 1400); ns.sponsorshipTurnsLeft = 6; ns.sponsorshipIncome = inc; ns = lg(ns, `Premium membership: +${fmt(inc)}/turn × 6 turns`, "special"); } }
          else if (ea.id === "licensing") { const g2 = 500 + Math.round(Math.random() * 1500); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `IP licensing — +${fmt(g2)}`, "pos"); }
          else if (ea.id === "concert") { if (Math.random() < 0.7) { const g2 = 2000 + Math.round(Math.random() * 4000); ns.cash += g2; ns.totalEarned += g2; ns.followers += 500; ns = lg(ns, `Live event — +${fmt(g2)} + 500 followers!`, "special"); } else ns = lg(ns, `Event was a bust.`, "neg"); }
          else if (ea.id === "collab2") { if (Math.random() < 0.6) { const g2 = 5000 + Math.round(Math.random() * 10000); ns.cash += g2; ns.totalEarned += g2; ns.followers += 2000; ns = lg(ns, `Celebrity collab — +${fmt(g2)} + 2k followers!`, "special"); } else ns = lg(ns, `Celeb collab fell through.`, "neg"); }
          else if (ea.id === "bookmd" || ea.id === "lawbook") { if (Math.random() < 0.75) { const g2 = 2000 + Math.round(Math.random() * 4000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Book royalties — +${fmt(g2)}`, "pos"); } }
          else if (ea.id === "speaking") { const g2 = 500 + Math.round(Math.random() * 1500); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Speaking fee — +${fmt(g2)}`, "pos"); }
          else if (ea.id === "wellness") { ns.passive += 300; ns = lg(ns, `Wellness brand: +$300/turn passive`, "special"); }
          else if (ea.id === "airbnb" && ns.properties.length > 0) { ns.shortTermRentalTurnsLeft = 8; ns.shortTermRentalIncome = 350; ns = lg(ns, `Airbnb rental: +$350/turn × 8 turns`, "special"); }
          else if (ea.id === "proptech") { if (Math.random() < 0.55) { const g2 = 6000 + Math.round(Math.random() * 9000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `PropTech exit — +${fmt(g2)}!`, "special"); } else ns = lg(ns, `PropTech investment written off.`, "neg"); }
          else if (ea.id === "mortgage") { if (Math.random() < 0.4) { const g2 = 1000 + Math.round(Math.random() * 2000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Mortgage commission — +${fmt(g2)}`, "pos"); } }
          else if (ea.id === "consulting") { const g2 = 1000 + Math.round(Math.random() * 3000); ns.cash += g2; ns.totalEarned += g2; ns = lg(ns, `Corp consulting — +${fmt(g2)}`, "pos"); }
          else if (ea.id === "mediation") { ns.passive += 350; ns = lg(ns, `Mediation center: +$350/turn passive`, "special"); }
          else if (ea.id === "reitsell" && ns.reitPassive > 0) { const g2 = ns.reitPassive * 20; ns.cash += g2; ns.reitPassive = 0; ns.totalEarned += g2; ns = lg(ns, `REIT units sold — +${fmt(g2)}!`, "special"); }
        }
      }
    }

    // Business upgrades from action panel
    if (selAction === "upgrade_business") {
      const biz = ns.businesses.find(b => b.careerId === career.id);
      if (biz && ns.cash >= biz.upgradeCost && biz.level < biz.maxLevel) {
        ns.cash -= biz.upgradeCost;
        biz.level++;
        biz.incomePerTurn = Math.round(biz.incomePerTurn * career.businessUpgradeMult);
        biz.upgradeCost = Math.round(biz.upgradeCost * 2.5);
        ns = lg(ns, `🏢 ${biz.name} → Lvl ${biz.level}! Now +${fmt(biz.incomePerTurn)}/turn`, "special");
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
    setG(ns); setSelAction(null); setActivePanel(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleBJFinish(newCash: number, profit: number) {
    if (!g) return;
    let ns: GameState = { ...g, cash: newCash, casinoProfit: g.casinoProfit + profit };
    if (profit > 0) { ns.totalEarned += profit; ns = lg(ns, `Casino — Won ${fmt(profit)}`, "pos"); }
    else if (profit < 0) { ns.totalLost += Math.abs(profit); ns = lg(ns, `Casino — Lost ${fmt(Math.abs(profit))}`, "neg"); }
    else ns = lg(ns, "Casino — Break even");
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setG(ns); setActivePanel(null); setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleStockTrade(newCash: number, newH: Holding[]) {
    if (!g) return; setG({ ...g, cash: newCash, holdings: newH });
  }

  function handleCryptoTrade(newCash: number, newH: CryptoHolding[]) {
    if (!g) return; setG({ ...g, cash: newCash, cryptoHoldings: newH });
  }

  function finishTradingTurn(type: string) {
    if (!g) return;
    let ns = applyBondReturn({ ...g });
    ns = lg(ns, `${type} session — reviewed positions`);
    const finished = ns.turn >= TOTAL_TURNS;
    ns = advanceTurn(ns);
    setG(ns); setActivePanel(null); setSelAction(null);
    if (finished || ns.turn > TOTAL_TURNS) setTimeout(() => setScreen("end"), 300);
  }

  function handleREBuy(type: typeof PROPERTY_TYPES[number]) {
    if (!g || g.cash < type.buyPrice) return;
    const cost = g.discountNextProperty ? Math.round(type.buyPrice * 0.8) : type.buyPrice;
    const pid = `prop_${Date.now()}`;
    const addrs = ["123 Oak St","456 Maple Ave","789 Pine Rd","321 Elm Blvd","654 Cedar Ct","987 Birch Ln","246 Walnut","135 Spruce"];
    let ns: GameState = {
      ...g, cash: g.cash - cost, discountNextProperty: false,
      properties: [...g.properties, { id: pid, address: addrs[Math.floor(Math.random() * addrs.length)], type: type.type, purchasePrice: cost, currentValue: cost, rentPerTurn: type.rentPerTurn, isFlipping: false, flipTurnsLeft: 0 }],
    };
    ns = lg(ns, `Bought ${type.name} for ${fmt(cost)} — +${fmt(type.rentPerTurn)}/turn rent`, "special");
    setG(ns);
  }

  function handleREFlip(id: string) {
    if (!g) return;
    const def = g.properties.find(p => p.id === id);
    if (!def) return;
    const ptDef = PROPERTY_TYPES.find(pt => pt.type === def.type)!;
    let ns: GameState = {
      ...g, properties: g.properties.map(p => p.id === id ? { ...p, isFlipping: true, flipTurnsLeft: ptDef.flipTurns } : p),
    };
    ns = lg(ns, `🔨 Flipping ${def.address} — ${ptDef.flipTurns} turns`, "special");
    setG(ns);
  }

  function handleRESell(id: string) {
    if (!g) return;
    const prop = g.properties.find(p => p.id === id);
    if (!prop) return;
    let ns: GameState = { ...g, cash: g.cash + prop.currentValue, properties: g.properties.filter(p => p.id !== id) };
    ns.totalEarned += Math.max(0, prop.currentValue - prop.purchasePrice);
    ns = lg(ns, `Sold ${prop.address} for ${fmt(prop.currentValue)}`, "pos");
    setG(ns);
  }

  function handleBusinessUpgrade(id: string) {
    if (!g || !career) return;
    const biz = g.businesses.find(b => b.id === id);
    if (!biz || g.cash < biz.upgradeCost || biz.level >= biz.maxLevel) return;
    const newBizzes = g.businesses.map(b => b.id === id ? {
      ...b, level: b.level + 1,
      incomePerTurn: Math.round(b.incomePerTurn * career.businessUpgradeMult),
      upgradeCost: Math.round(b.upgradeCost * 2.5),
    } : b);
    let ns: GameState = { ...g, cash: g.cash - biz.upgradeCost, businesses: newBizzes };
    ns = lg(ns, `🏢 ${biz.name} → Lvl ${biz.level + 1}! Now +${fmt(newBizzes.find(b => b.id === id)!.incomePerTurn)}/turn`, "special");
    setG(ns);
  }

  function startGame() {
    if (!selCareer) return;
    savedRef.current = false;
    setG(initGame(selCareer));
    setSelAction(null); setActivePanel(null); setEventBanner(null);
    setScreen("game");
  }

  function fullReset() {
    setSelCareer(null); setG(null); setSelAction(null); setActivePanel(null); setEventBanner(null);
    setScreen("start");
  }

  function getPhase(turn: number) {
    if (turn <= 15) return "Early Career";
    if (turn <= 35) return "Building Momentum";
    if (turn <= 55) return "Mid Career";
    if (turn <= 68) return "Final Stretch";
    return "Last Push 🔥";
  }

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      Checking login...
    </div>
  );

  // ── START ─────────────────────────────────────────────────────────────────
  if (screen === "start") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event</p>
            <h1 className="text-5xl font-black">The <span className="text-yellow-300">Grind</span></h1>
            <p className="mt-3 max-w-xl text-white/60">
              80 months. One shot. Career, crypto, properties, blackjack with insane side bets,
              angel investments, passive empires. Your net worth is your score.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black text-white transition hover:scale-105 hover:bg-white/15">Menu</Link>
            <button onClick={() => setScreen("career")} className="rounded-2xl bg-yellow-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">Choose Career →</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[["80","Months"],["6","Careers"],["14","Side Bets"],["500×","God Hand"]].map(([n,l]) => (
            <div key={l} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-3xl font-black text-yellow-300">{n}</p>
              <p className="text-xs uppercase tracking-widest text-white/40 mt-1">{l}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-black mb-4">What you can do</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["💼 Career & Hustle", "Earn salary, gain XP, unlock 7 tiers. 5 study actions + 5 extras + 5 unique moves per career."],
              ["🏠 Real Estate", "Buy, rent, flip 4 property types. Properties appreciate every 5 months."],
              ["♠ Epic Blackjack", "3 hands/visit. 14 side bets including 500× God Hand. Bets up to $200k."],
              ["📊 Stocks + Crypto", "10 stocks + 5 crypto coins. Min $10. Finance gets 2× leverage."],
              ["🏢 Business Empire", "Unlock your career's business. Upgrade 7 levels for exponential income."],
              ["😇 Angel Investing", "Invest $1500-2000. 40% chance of 5-15× payoff in 10 turns."],
              ["💸 Passive Income", "Stack podcasts, newsletters, sponsorships, royalties, REITs — forever."],
              ["🎯 Life Events", "15 random events — recessions, windfalls, bonuses, crashes."],
            ].map(([t, d]) => (
              <div key={t as string} className="rounded-2xl bg-black/30 p-4">
                <p className="font-black mb-1">{t}</p>
                <p className="text-sm text-white/50">{d}</p>
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
            <p className="mt-2 text-white/60">Each path has unique mechanics, special abilities, extra activities, and an upgradeable business.</p>
          </div>
          <button onClick={() => setScreen("start")} className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:scale-105 hover:bg-white/15">← Back</button>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {CAREERS.map(c => (
            <button key={c.id} onClick={() => setSelCareer(c.id)}
              className={`rounded-3xl border p-5 text-left transition hover:scale-[1.02] relative ${selCareer === c.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
              {selCareer === c.id && <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-300 flex items-center justify-center text-zinc-950 font-black text-xs">✓</div>}
              <div className="text-3xl mb-2">{c.icon}</div>
              <h3 className={`font-black text-lg mb-1 ${c.color}`}>{c.name}</h3>
              <p className="text-sm text-white/60 mb-3 leading-relaxed">{c.tagline}</p>
              <div className="space-y-1">{c.perks.map((p, i) => <p key={i} className="text-xs text-yellow-300">✦ {p}</p>)}</div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/40">Business: <span className="text-white/60">{c.businessName}</span></p>
                <p className="text-xs text-white/40">Peak: <span className="text-yellow-300">${c.tiers[c.tiers.length-1].income.toLocaleString()}/mo</span></p>
              </div>
            </button>
          ))}
        </div>

        {selCareer && (() => {
          const sc = CAREERS.find(c => c.id === selCareer)!;
          return (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 mb-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Career Ladder</h3>
                  {sc.tiers.map((t, i) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-white/5">
                      <span className={i === 0 ? "text-white/60" : "text-white/30"}>{t.name}</span>
                      <span className="text-yellow-300 font-black text-xs">${t.income.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Study Actions</h3>
                  {sc.studyActions.map(sa => (
                    <div key={sa.id} className="py-1 border-b border-white/5">
                      <p className="font-bold text-xs">{sa.icon} {sa.name}</p>
                      <p className="text-[10px] text-white/30">+{sa.xp} XP · +{sa.burnout}% burn</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Unique Actions</h3>
                  {sc.uniqueActions?.map((ua: { id: string; icon: string; name: string; desc: string; cost: number }) => (
                    <div key={ua.id} className="py-1 border-b border-white/5">
                      <p className="font-bold text-xs">{ua.icon} {ua.name}</p>
                      <p className="text-[10px] text-white/30">{ua.desc}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Extra Activities</h3>
                  {sc.extraActivities?.map((ea: { id: string; icon: string; name: string; desc: string; cost: number }) => (
                    <div key={ea.id} className="py-1 border-b border-white/5">
                      <p className="font-bold text-xs">{ea.icon} {ea.name}</p>
                      <p className="text-[10px] text-white/30">{ea.desc}</p>
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
    const biz = g.businesses.find(b => b.careerId === career.id);
    const allPassive = g.passive + rentPT + bizIncome + g.reitPassive + g.pharmaPassive + g.hospitalPassive +
      g.angelPassive + g.vcFundPassive + g.coachingPassive + g.podcastPassive +
      g.ghostwritingPassive + g.nftRoyaltyPassive + g.redevPassive;

    // Build the mega action list grouped by category
    type ActionItem = { id: string; icon: string; name: string; desc: string; badge: string; badgeCls: string; disabled: boolean; group: string };
    const actionList: ActionItem[] = [
      // CAREER
      { id: "work", icon: career.icon, name: career.workName, desc: `+${salary.toLocaleString()} salary`, badge: "Salary", badgeCls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", disabled: false, group: "career" },
      ...career.studyActions.map(sa => ({ id: sa.id, icon: sa.icon, name: sa.name, desc: sa.desc, badge: "+XP", badgeCls: "bg-blue-900/60 text-blue-300 border-blue-700", disabled: false, group: "career" })),
      { id: "hustle", icon: "🚀", name: career.hustleName, desc: hustleUnlocked ? "High-reward hustle" : `Needs ${career.hustleXpReq} XP`, badge: hustleUnlocked ? "Hustle" : "🔒", badgeCls: hustleUnlocked ? "bg-yellow-900/60 text-yellow-300 border-yellow-700" : "bg-zinc-800 text-white/20 border-zinc-700", disabled: !hustleUnlocked, group: "career" },
      // INVESTING
      { id: "bonds", icon: "💰", name: "Bonds / Index", desc: `Invest 20% ($${Math.round(g.cash*.2).toLocaleString()})`, badge: "Safe", badgeCls: "bg-indigo-900/60 text-indigo-300 border-indigo-700", disabled: g.cash < 100, group: "invest" },
      { id: "stocks", icon: "📊", name: "Stock Market", desc: "10 stocks · $10 min · +10/+100 buttons", badge: "Stocks", badgeCls: "bg-cyan-900/60 text-cyan-300 border-cyan-700", disabled: false, group: "invest" },
      { id: "crypto", icon: "🪙", name: "Crypto Market", desc: "BTC/ETH/SOL/DOGE/BNB · extreme volatility", badge: "Crypto", badgeCls: "bg-orange-900/60 text-orange-300 border-orange-700", disabled: false, group: "invest" },
      { id: "realestate", icon: "🏠", name: "Real Estate", desc: "Buy · rent · flip · 4 property types", badge: "RE", badgeCls: "bg-yellow-900/60 text-yellow-300 border-yellow-700", disabled: false, group: "invest" },
      { id: "casino", icon: "♠️", name: "Epic Casino", desc: "3 BJ hands · 14 side bets · 500× God Hand", badge: "Casino", badgeCls: "bg-red-900/60 text-red-300 border-red-700", disabled: g.cash < BJ_MIN, group: "invest" },
      // UNIQUE
      ...career.uniqueActions.map((ua: { id: string; icon: string; name: string; desc: string; cost: number; xp?: number }) => ({
        id: ua.id, icon: ua.icon, name: ua.name, desc: ua.desc,
        badge: "⚡ Unique", badgeCls: "bg-pink-900/60 text-pink-300 border-pink-700",
        disabled: ua.cost > g.cash, group: "unique",
      })),
      // EXTRAS
      ...((career as typeof CAREERS[0]).extraActivities ?? []).map((ea: { id: string; icon: string; name: string; desc: string; cost: number }) => ({
        id: ea.id, icon: ea.icon, name: ea.name, desc: ea.desc,
        badge: "Activity", badgeCls: "bg-purple-900/60 text-purple-300 border-purple-700",
        disabled: ea.cost > g.cash, group: "extra",
      })),
      // LIFESTYLE
      { id: "rest", icon: "😴", name: "Rest & Recover", desc: `-${Math.min(g.burnout, 28)}% burnout`, badge: "Recovery", badgeCls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", disabled: false, group: "life" },
      { id: "therapy", icon: "🛋️", name: "Therapy", desc: "Costs $300. -40% burnout + ongoing bonus.", badge: "Wellness", badgeCls: "bg-teal-900/60 text-teal-300 border-teal-700", disabled: g.cash < 300, group: "life" },
      { id: "networking", icon: "🤝", name: "Networking Event", desc: "Costs $200. +15% salary passive × 5 turns.", badge: "Network", badgeCls: "bg-sky-900/60 text-sky-300 border-sky-700", disabled: g.cash < 200, group: "life" },
      // BUSINESS
      ...(biz ? [{ id: "business", icon: "🏢", name: `${biz.name} (Lvl ${biz.level})`, desc: `+${fmt(biz.incomePerTurn)}/turn · upgrade ${biz.level < biz.maxLevel ? fmt(biz.upgradeCost) : "MAXED"}`, badge: "Business", badgeCls: "bg-violet-900/60 text-violet-300 border-violet-700", disabled: false, group: "biz" }] : []),
    ];

    const groups: { key: string; label: string; color: string }[] = [
      { key: "career", label: "Career", color: "text-blue-300" },
      { key: "invest", label: "Investing", color: "text-emerald-300" },
      { key: "unique", label: "⚡ Unique", color: "text-pink-300" },
      { key: "extra",  label: "Activities", color: "text-purple-300" },
      { key: "life",   label: "Lifestyle", color: "text-teal-300" },
      { key: "biz",    label: "Business", color: "text-violet-300" },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* Top bar */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-300">Saturday Event</p>
              <h1 className="text-2xl font-black">The <span className="text-yellow-300">Grind</span></h1>
            </div>
            <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 font-black text-sm hover:bg-white/15">Menu</Link>
          </div>

          {/* HUD */}
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8 mb-3">
            {[
              { label: "Net Worth",  value: `$${netWorth.toLocaleString()}`,         color: "text-yellow-300" },
              { label: "Cash",       value: `$${Math.round(g.cash).toLocaleString()}`,color: "text-white"      },
              { label: "Bonds",      value: `$${Math.round(g.bonds).toLocaleString()}`,color:"text-indigo-300" },
              { label: "Stocks",     value: `$${Math.round(stockVal).toLocaleString()}`,color:"text-blue-300"  },
              { label: "Crypto",     value: `$${Math.round(cryptoVal).toLocaleString()}`,color:"text-orange-300"},
              { label: "Property",   value: `$${Math.round(propVal).toLocaleString()}`, color:"text-yellow-300"},
              { label: "Passive/mo", value: `$${Math.round(allPassive).toLocaleString()}`, color:"text-emerald-300"},
              { label: "Month",      value: `${g.turn}/${TOTAL_TURNS}`,             color: "text-white"      },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
                <p className="text-[8px] uppercase tracking-widest text-white/30">{label}</p>
                <p className={`text-xs font-black ${color} truncate`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-black text-yellow-300">{getPhase(g.turn)}</span>
              <span className="text-white/40 truncate ml-2">{tier?.name} · {career.name}{biz ? ` · 🏢 Lvl${biz.level} +${fmt(biz.incomePerTurn)}/t` : ""}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full transition-all" style={{ width: `${(g.turn / TOTAL_TURNS) * 100}%` }} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-3">

              {/* Event banner */}
              {eventBanner && (
                <div className={`rounded-2xl border p-3 flex items-center gap-3 ${
                  eventBanner.type === "good" ? "border-emerald-500/30 bg-emerald-900/30 text-emerald-300" :
                  eventBanner.type === "bad"  ? "border-red-500/30 bg-red-900/30 text-red-300" :
                  "border-blue-500/30 bg-blue-900/30 text-blue-300"}`}>
                  <span className="text-2xl">{eventBanner.icon}</span>
                  <div>
                    <p className="font-black text-sm">{eventBanner.title}</p>
                    <p className="text-xs opacity-80">{eventBanner.sub} {eventBanner.result && `(${eventBanner.result})`}</p>
                  </div>
                </div>
              )}

              {/* Angel investment tracker */}
              {g.angelInvestments.length > 0 && (
                <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/5 px-4 py-2 flex gap-3 flex-wrap">
                  {g.angelInvestments.map((inv, i) => (
                    <span key={i} className="text-[10px] text-yellow-300">
                      😇 {inv.company}: {Math.max(0, 10 - (g.turn - inv.turnInvested))} turns left
                    </span>
                  ))}
                </div>
              )}

              {/* ACTIONS */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">This Month&apos;s Action</h2>

                {groups.map(grp => {
                  const items = actionList.filter(a => a.group === grp.key);
                  if (items.length === 0) return null;
                  return (
                    <div key={grp.key} className="mb-4">
                      <p className={`text-[10px] uppercase tracking-widest font-black mb-2 ${grp.color}`}>{grp.label}</p>
                      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4">
                        {items.map(a => (
                          <button key={a.id} onClick={() => !a.disabled && setSelAction(a.id)} disabled={a.disabled}
                            className={`rounded-2xl border p-2.5 text-left transition relative ${
                              selAction === a.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20"
                            } disabled:opacity-25 disabled:cursor-not-allowed hover:scale-[1.02]`}>
                            {selAction === a.id && <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-300 rounded-t-2xl" />}
                            <div className="absolute top-1.5 right-1.5">
                              <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${a.badgeCls}`}>{a.badge}</span>
                            </div>
                            <div className="text-base mb-1">{a.icon}</div>
                            <p className="font-black text-[10px] mb-0.5 leading-tight pr-8">{a.name}</p>
                            <p className="text-[8px] text-white/40 leading-tight">{a.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Bonds sub-panel */}
                {selAction === "bonds" && !activePanel && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <h3 className="font-black mb-2">Bonds & Index Funds</h3>
                    <p className="text-sm text-white/60 mb-2">Invest 20% of cash ({fmt(Math.round(g.cash * 0.2))}) into diversified bonds.</p>
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="text-white/40">Trend:</span>
                      <span className={`font-black ${ml.color}`}>{ml.text} ({mRate >= 0 ? "+" : ""}{Math.round(mRate * 100)}%)</span>
                    </div>
                    {g.marketHint && g.turn < TOTAL_TURNS && (
                      <div className="mt-2 rounded-xl bg-black/40 p-3">
                        <p className="text-xs text-yellow-300 font-black mb-2">Insider Forecast</p>
                        {Array.from({ length: 5 }, (_, i) => i + 1).map(i => {
                          const fr = MARKET[g.turn + i - 1] ?? 0;
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
                    {g.bonds > 0 && <p className="text-xs text-white/40 mt-2">Current bonds: {fmt(Math.round(g.bonds))}</p>}
                    {career.special === "marketBonus" && tierIdx >= 3 && <p className="text-xs text-yellow-300 mt-1">✦ Senior bonus: +2.5% active</p>}
                  </div>
                )}

                {/* Active sub-panels */}
                {activePanel === "casino" && (
                  <div className="mt-3">
                    <EpicBlackjack cash={g.cash} onFinish={handleBJFinish} />
                  </div>
                )}
                {activePanel === "stocks" && (
                  <div className="mt-3">
                    <StockPanel cash={g.cash} holdings={g.holdings} prices={g.stockPrices} history={g.stockHistory} isFinance={career.special === "leverage"} onTrade={handleStockTrade} />
                    <button onClick={() => finishTradingTurn("Stocks")} className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 hover:bg-yellow-200">Done trading → End month</button>
                  </div>
                )}
                {activePanel === "crypto" && (
                  <div className="mt-3">
                    <CryptoPanel cash={g.cash} holdings={g.cryptoHoldings} prices={g.cryptoPrices} history={g.cryptoHistory} onTrade={handleCryptoTrade} />
                    <button onClick={() => finishTradingTurn("Crypto")} className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 hover:bg-yellow-200">Done trading → End month</button>
                  </div>
                )}
                {activePanel === "realestate" && (
                  <div className="mt-3">
                    <RealEstateMarket cash={g.cash} properties={g.properties} onBuy={handleREBuy} onFlip={handleREFlip} onSell={handleRESell} />
                    <button onClick={() => finishTradingTurn("Real estate")} className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 hover:bg-yellow-200">Done → End month</button>
                  </div>
                )}
                {activePanel === "business" && (
                  <div className="mt-3">
                    <BusinessPanel businesses={g.businesses} cash={g.cash} onUpgrade={handleBusinessUpgrade} />
                    <button onClick={() => finishTradingTurn("Business")} className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 hover:bg-yellow-200">Done → End month</button>
                  </div>
                )}

                {/* Confirm / open panel button */}
                {!activePanel && (
                  <button
                    onClick={confirmAction}
                    disabled={!selAction}
                    className="w-full mt-3 rounded-2xl bg-yellow-300 py-3 font-black text-zinc-950 text-base transition hover:scale-105 hover:bg-yellow-200 disabled:scale-100 disabled:opacity-30">
                    {selAction
                      ? (["casino","stocks","crypto","realestate","business"].includes(selAction)
                          ? `Open ${selAction === "realestate" ? "Real Estate" : selAction.charAt(0).toUpperCase() + selAction.slice(1)} →`
                          : "Confirm action →")
                      : "Choose an action above"}
                  </button>
                )}
              </section>

              {/* Log */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest">Activity Log</h2>
                  <span className="text-xs text-white/20">{g.log.length} entries</span>
                </div>
                <div ref={logRef} className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {g.log.length === 0 && <p className="text-white/30 text-xs">No activity yet.</p>}
                  {g.log.slice(0, 15).map((e, i) => (
                    <div key={i} className={`flex gap-2 text-xs py-1 border-b border-white/5 ${
                      e.type === "pos" ? "text-emerald-300" : e.type === "neg" ? "text-red-300" : e.type === "special" ? "text-yellow-300" : "text-white/50"
                    }`}>
                      <span className="text-white/20 flex-shrink-0">T{e.turn}</span>{e.msg}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* SIDEBAR */}
            <aside className="flex flex-col gap-3">
              {/* Stats */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-3">Stats</h2>
                {[
                  { label: "Job",       value: tier?.name ?? "",                           color: "text-blue-300"   },
                  { label: "XP",        value: `${g.xp.toFixed(1)} XP`,                   color: "text-white"      },
                  { label: "Passive",   value: `$${Math.round(allPassive).toLocaleString()}/mo`, color: "text-emerald-300" },
                  ...(g.properties.length > 0 ? [{ label: "Properties", value: `${g.properties.length} owned`, color: "text-orange-300" }] : []),
                  ...(biz ? [{ label: biz.name, value: `Lvl ${biz.level}/${biz.maxLevel} · $${biz.incomePerTurn}/t`, color: "text-violet-300" }] : []),
                  ...(g.followers > 0 ? [{ label: "Followers", value: g.followers.toLocaleString(), color: "text-pink-300" }] : []),
                  ...(g.cryptoHoldings.length > 0 ? [{ label: "Crypto", value: `$${Math.round(cryptoVal).toLocaleString()}`, color: "text-orange-300" }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
                    <span className={`font-black text-xs ${color} text-right`}>{value}</span>
                  </div>
                ))}

                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-white/30">Burnout</span>
                  <span className={`font-black text-xs ${burnoutColor}`}>{Math.round(g.burnout)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${g.burnout > 70 ? "bg-red-400" : g.burnout > 45 ? "bg-yellow-300" : "bg-emerald-400"}`} style={{ width: `${g.burnout}%` }} />
                </div>
                {g.burnout > 45 && <p className="text-[9px] text-yellow-300 mt-1">⚠ -{Math.round((1 - bm) * 100)}% income penalty</p>}

                {/* Active passive streams */}
                {(g.patentTurnsLeft > 0 || g.sponsorshipTurnsLeft > 0 || g.shortTermRentalTurnsLeft > 0 || g.lawRetainerTurns > 0 || g.pharmaPassive > 0 || g.hospitalPassive > 0 || g.podcastPassive > 0 || g.ghostwritingPassive > 0 || g.vcFundPassive > 0) && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Active Streams</p>
                    {g.patentTurnsLeft > 0 && <p className="text-[9px] text-blue-300">📋 Patent: +${g.patentIncome}/t ({g.patentTurnsLeft} left)</p>}
                    {g.sponsorshipTurnsLeft > 0 && <p className="text-[9px] text-pink-300">💰 Sponsor: +${g.sponsorshipIncome}/t ({g.sponsorshipTurnsLeft} left)</p>}
                    {g.shortTermRentalTurnsLeft > 0 && <p className="text-[9px] text-orange-300">🏖️ Rental: +${g.shortTermRentalIncome}/t ({g.shortTermRentalTurnsLeft} left)</p>}
                    {g.lawRetainerTurns > 0 && <p className="text-[9px] text-purple-300">⚖️ Retainer: +${g.lawRetainerIncome}/t ({g.lawRetainerTurns} left)</p>}
                    {g.pharmaPassive > 0 && <p className="text-[9px] text-red-300">💊 Pharma: +${g.pharmaPassive}/t</p>}
                    {g.hospitalPassive > 0 && <p className="text-[9px] text-red-300">🏥 Hospital: +${g.hospitalPassive}/t</p>}
                    {g.podcastPassive > 0 && <p className="text-[9px] text-yellow-300">🎙️ Podcast: +${g.podcastPassive}/t</p>}
                    {g.ghostwritingPassive > 0 && <p className="text-[9px] text-teal-300">✍️ Writing: +${g.ghostwritingPassive}/t</p>}
                    {g.nftRoyaltyPassive > 0 && <p className="text-[9px] text-purple-300">👑 NFT Royalty: +${g.nftRoyaltyPassive}/t</p>}
                    {g.vcFundPassive > 0 && <p className="text-[9px] text-emerald-300">🏦 VC Fund: +${g.vcFundPassive}/t</p>}
                    {g.redevPassive > 0 && <p className="text-[9px] text-orange-300">🏗️ Dev: +${g.redevPassive}/t</p>}
                  </div>
                )}
              </div>

              {/* Market */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Market</h2>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-black text-xs ${ml.color}`}>{ml.text}</span>
                  <span className={`font-black text-xs ${ml.color}`}>{mRate >= 0 ? "+" : ""}{Math.round(mRate * 100)}%</span>
                </div>
                <div className="flex items-end gap-0.5 h-6 mb-2">
                  {Array.from({ length: 12 }, (_, i) => g.turn - 12 + i).filter(t => t >= 1 && t <= TOTAL_TURNS).map(t => {
                    const r = MARKET[t - 1] ?? 0;
                    const h = Math.max(3, Math.round(Math.abs(r) * 140));
                    return <div key={t} className="flex-1 rounded-sm" style={{ height: h, background: r >= 0 ? "#34d399" : "#f87171" }} />;
                  })}
                </div>
                {g.bonds > 0 && <p className="text-[10px] text-indigo-300">Bonds: {fmt(Math.round(g.bonds))}</p>}
                {stockVal > 0 && <p className="text-[10px] text-blue-300">Stocks: {fmt(Math.round(stockVal))}</p>}
                {cryptoVal > 0 && <p className="text-[10px] text-orange-300">Crypto: {fmt(Math.round(cryptoVal))}</p>}
                {propVal > 0 && <p className="text-[10px] text-yellow-300">Property: {fmt(Math.round(propVal))}</p>}
              </div>

              {/* Career path */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Career Path</h2>
                {career.tiers.map((t, i) => {
                  const done = i < tierIdx, active = i === tierIdx, next = i === tierIdx + 1;
                  return (
                    <div key={i} className={`flex items-center gap-2 py-1 border-b border-white/5 text-xs ${active ? "text-white" : done ? "text-white/40" : "text-white/15"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-yellow-300" : done ? "bg-emerald-500" : "bg-white/10"}`} />
                      <span className={`flex-1 text-[9px] ${active ? "font-black" : ""}`}>{t.name}</span>
                      {active && <span className="text-yellow-300 text-[8px]">now</span>}
                      {next && <span className="text-white/30 text-[8px]">{(t.req - g.xp).toFixed(1)} XP</span>}
                    </div>
                  );
                })}
              </div>

              {/* Properties */}
              {g.properties.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Properties</h2>
                  {g.properties.map(p => {
                    const pDef = PROPERTY_TYPES.find(pt => pt.type === p.type)!;
                    return (
                      <div key={p.id} className="flex justify-between text-[9px] py-1 border-b border-white/5">
                        <span>{pDef.icon} {p.address.split(" ").slice(0, 2).join(" ")}</span>
                        {p.isFlipping ? <span className="text-orange-300">🔨 {p.flipTurnsLeft}t</span> : <span className="text-emerald-300">+${p.rentPerTurn}/t</span>}
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-[9px] pt-1 font-black">
                    <span className="text-white/40">Value</span>
                    <span className="text-orange-300">{fmt(Math.round(propVal))}</span>
                  </div>
                </div>
              )}

              {/* Holdings */}
              {(g.holdings.length > 0 || g.cryptoHoldings.length > 0) && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
                  <h2 className="font-black text-white/40 text-xs uppercase tracking-widest mb-2">Portfolio</h2>
                  {g.holdings.map(h => {
                    const price = g.stockPrices[h.id] ?? h.avgCost;
                    const pnl = Math.round((price - h.avgCost) * h.shares);
                    return (
                      <div key={h.id} className="flex justify-between text-[9px] py-1 border-b border-white/5">
                        <span className="font-black text-yellow-300 w-8">{h.ticker}</span>
                        <span className="text-white/40">{h.shares}sh</span>
                        <span className={pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</span>
                      </div>
                    );
                  })}
                  {g.cryptoHoldings.map(h => {
                    const price = g.cryptoPrices[h.coin] ?? h.avgCost;
                    const pnl = Math.round((price - h.avgCost) * h.amount);
                    return (
                      <div key={h.coin} className="flex justify-between text-[9px] py-1 border-b border-white/5">
                        <span className="font-black text-orange-300 w-8">{h.coin.toUpperCase()}</span>
                        <span className="text-white/40">{h.amount.toFixed(3)}</span>
                        <span className={pnl >= 0 ? "text-yellow-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</span>
                      </div>
                    );
                  })}
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
    const sv   = g.holdings.reduce((s, h) => s + h.shares * (g.stockPrices[h.id] ?? 0), 0);
    const cv2  = g.cryptoHoldings.reduce((s, h) => s + h.amount * (g.cryptoPrices[h.coin] ?? 0), 0);
    const pv   = g.properties.reduce((s, p) => s + p.currentValue, 0);
    const score = Math.round(g.cash + g.bonds + sv + cv2 + pv);
    const fi = getTierIdx(career.tiers, g.xp);
    const all = [...LEADERBOARD, { name: "You", score }].sort((a, b) => b.score - a.score);
    const rank = all.findIndex(p => p.name === "You") + 1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-yellow-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">Saturday Event — Complete</p>
              <h1 className="text-5xl font-black text-yellow-300">${score.toLocaleString()}</h1>
              <p className="mt-2 text-white/60">{career.tiers[fi].name} · {career.name} · 80-month run</p>
            </div>
            <div className="flex gap-3">
              <Link href="/menu" className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black transition hover:scale-105 hover:bg-white/15">Menu</Link>
              <button onClick={fullReset} className="rounded-2xl bg-yellow-300 px-8 py-4 font-black text-zinc-950 transition hover:scale-105 hover:bg-yellow-200">Play Again</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
            {[
              ["Peak Title", career.tiers[fi].name],
              ["XP", `${g.xp.toFixed(1)} XP`],
              ["Bonds", `$${Math.round(g.bonds).toLocaleString()}`],
              ["Stocks", `$${Math.round(sv).toLocaleString()}`],
              ["Crypto", `$${Math.round(cv2).toLocaleString()}`],
              ["Property", `$${Math.round(pv).toLocaleString()}`],
              ["Casino P/L", (g.casinoProfit >= 0 ? "+" : "") + fmt(g.casinoProfit)],
              ["Business", g.businesses.map(b => `Lvl ${b.level}`).join(", ") || "None"],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-1">{l}</p>
                <p className="text-sm font-black">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 mb-6">
            <h2 className="text-2xl font-black mb-4">Wealth Breakdown</h2>
            {([
              ["Salary & career",  g.totalEarned - Math.max(0, g.casinoProfit), true],
              ["Casino net",       g.casinoProfit, g.casinoProfit >= 0],
              ["Bonds portfolio",  Math.round(g.bonds), true],
              ["Stocks portfolio", Math.round(sv), true],
              ["Crypto portfolio", Math.round(cv2), true],
              ["Property equity",  Math.round(pv), true],
              ["Total losses",     -g.totalLost, false],
            ] as [string, number, boolean][]).map(([l, v, pos]) => (
              <div key={l} className="flex justify-between py-2 border-b border-white/10 text-sm">
                <span className="text-white/60">{l}</span>
                <span className={`font-black ${v >= 0 && pos ? "text-emerald-300" : "text-red-300"}`}>
                  {v >= 0 ? "+" : ""}{fmt(Math.abs(v))}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black">Leaderboard</h2>
              <span className="rounded-full bg-yellow-300/20 px-3 py-1 text-sm font-black text-yellow-300">Rank #{rank}</span>
            </div>
            <div className="space-y-2">
              {all.map((p, i) => (
                <div key={p.name} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${p.name === "You" ? "bg-yellow-300/10 border border-yellow-300/30" : "bg-black/25"}`}>
                  <span className={`font-black w-8 text-sm ${i === 0 ? "text-yellow-300" : i === 1 ? "text-white/60" : i === 2 ? "text-amber-600" : "text-white/30"}`}>#{i + 1}</span>
                  <span className={`flex-1 font-bold ${p.name === "You" ? "text-yellow-300" : "text-white/60"}`}>{p.name === "You" ? "⭐ You" : p.name}</span>
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