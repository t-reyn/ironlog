"use client";

import { useRef } from "react";

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.id === active);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("button[role='tab']")
      ?.[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Sections"
      onKeyDown={handleKeyDown}
      className="flex w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface/70 p-1"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={[
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember",
              isActive
                ? "bg-ember text-night shadow"
                : "text-ink-soft hover:text-ink hover:bg-surface-2",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
