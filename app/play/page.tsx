"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getTodayGame } from "@/lib/games";

export default function PlayPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkLoginAndRoute() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const todayGame = getTodayGame();

      if (todayGame) {
        router.replace(todayGame.path);
        return;
      }

      router.replace("/menu");
    }

    checkLoginAndRoute();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-2xl font-black">Checking login...</p>
    </main>
  );
}