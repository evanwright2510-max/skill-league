"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlayPage() {
  const router = useRouter();

  useEffect(() => {
    const day = new Date().getDay();

    if (day === 1) {
      router.replace("/games/word-rush");
    } else if (day === 2) {
      router.replace("/games/memory-grid");
    } else if (day === 3) {
      router.replace("/games/precision-trace");
    } else if (day === 4) {
      router.replace("/games/match-rush");
    } else if (day === 5) {
      router.replace("/games/reaction-lock");
    } else if (day === 6) {
      router.replace("/finals");
    } else {
      router.replace("/menu");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-xl font-bold">Loading game...</p>
    </main>
  );
}