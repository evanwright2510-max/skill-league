"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canPlayOfficial } from "@/lib/gameAccess";
import { createClient } from "@/utils/supabase/client";

export default function GameGate({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (!canPlayOfficial(gameId)) {
        router.push("/play");
        return;
      }

      setChecking(false);
    }

    checkAccess();
  }, [gameId, router, supabase]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Checking game access...</p>
      </main>
    );
  }

  return <>{children}</>;
}