"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "reppa-theme";

function read(): ThemePref {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

/** Push the preference onto <html data-theme> (absent = follow system). */
function apply(pref: ThemePref) {
  const el = document.documentElement;
  if (pref === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", pref);
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setThemePref(pref: ThemePref) {
  if (pref === "system") window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, pref);
  apply(pref);
  listeners.forEach((cb) => cb());
}

/** React hook: current preference, re-renders when it changes. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, read, () => "system");
}
