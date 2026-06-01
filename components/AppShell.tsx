"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { TabBar, type TabDef } from "./TabBar";
import { Dashboard } from "./Dashboard";
import { WorkoutLogger } from "./WorkoutLogger";
import { History } from "./History";
import { Progress } from "./Progress";
import { Tools } from "./Tools";
import { RestTimer } from "./RestTimer";
import { StartModal } from "./StartModal";

type TabId = "dashboard" | "log" | "progress" | "tools";

const TABS: TabDef<TabId>[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "log", label: "Log" },
  { id: "progress", label: "Progress" },
  { id: "tools", label: "Tools" },
];

export function AppShell({ userEmail }: { userEmail: string }) {
  const [active, setActive] = useState<TabId>("dashboard");
  const loaded = useStore((s) => s.loaded);
  const hydrate = useStore((s) => s.hydrate);
  const draft = useStore((s) => s.draft);
  const [error, setError] = useState("");
  const [showStart, setShowStart] = useState(false);
  const [showLogger, setShowLogger] = useState(false);

  useEffect(() => {
    hydrate().catch((e) => setError(e.message ?? String(e)));
  }, [hydrate]);

  function openLogger() {
    setShowLogger(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Iron<span className="text-ember">Log</span>
        </h1>
        <span className="hidden text-xs text-ink-faint sm:block">{userEmail}</span>
      </header>

      <button
        onClick={draft ? openLogger : () => setShowStart(true)}
        className="rounded-xl bg-ember py-3 text-center font-semibold text-night hover:bg-ember-soft"
      >
        {draft ? "Continue workout →" : "Start workout"}
      </button>

      <TabBar tabs={TABS} active={active} onChange={setActive} />

      {error && (
        <div className="rounded-lg border border-ember/40 bg-ember/10 p-3 text-sm text-ember-soft">
          {error}
        </div>
      )}

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center text-ink-soft">
          Loading your data…
        </div>
      ) : (
        <main className="flex-1">
          {active === "dashboard" && <Dashboard />}
          {active === "log" && <History onStart={openLogger} />}
          {active === "progress" && <Progress />}
          {active === "tools" && <Tools />}
        </main>
      )}

      <RestTimer />

      {showStart && (
        <StartModal
          onClose={() => setShowStart(false)}
          onStart={() => {
            setShowStart(false);
            setShowLogger(true);
          }}
        />
      )}

      {showLogger && draft && (
        <WorkoutLogger onClose={() => setShowLogger(false)} />
      )}
    </div>
  );
}
