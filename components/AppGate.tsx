"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabase, supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Login } from "./Login";
import { AppShell } from "./AppShell";
import { SetupNotice } from "./SetupNotice";

export function AppGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!hasSupabase);

  useEffect(() => {
    if (!hasSupabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Clear the previous user's in-memory data + persisted draft so the next
      // sign-in on this device starts clean.
      if (event === "SIGNED_OUT") useStore.getState().reset();
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!hasSupabase) return <SetupNotice />;

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!session) return <Login />;
  return <AppShell userEmail={session.user.email ?? ""} />;
}
