"use client";

import { useEffect, useState } from "react";
import { ShojinIcon } from "./ShojinLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY_DISMISSED = "shojin-install-dismissed";
const KEY_LAUNCHES = "shojin-launches";
const DELAY_MS = 8000; // let people look around before nudging

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Dismissable "add to home screen" guide. Never shows in the installed PWA,
 * never on a user's first launch, and only after a short in-session delay —
 * so people explore the app before being nudged.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY_DISMISSED) === "1";
    } catch {}
    if (dismissed) return;

    let launches = 0;
    try {
      launches = (parseInt(localStorage.getItem(KEY_LAUNCHES) ?? "0", 10) || 0) + 1;
      localStorage.setItem(KEY_LAUNCHES, String(launches));
    } catch {}
    // Don't nudge on the very first visit — let them get a feel for it.
    if (launches < 2) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const t = setTimeout(() => {
      setIos(isIOS());
      setVisible(true);
    }, DELAY_MS);

    const onInstalled = () => {
      setVisible(false);
      try {
        localStorage.setItem(KEY_DISMISSED, "1");
      } catch {}
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(KEY_DISMISSED, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 z-30 px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 6.75rem)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[24px] border border-line-2 bg-surface p-3.5 shadow-[var(--rp-shadow)]">
        <ShojinIcon size={44} radius={13} shadow={false} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold tracking-[-0.01em] text-ink">Add Shojin to your home screen</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
            {ios ? (
              <>Tap the Share icon, then <span className="font-semibold text-ink">Add to Home Screen</span>.</>
            ) : (
              <>Full-screen, faster, and works offline.</>
            )}
          </div>
        </div>
        {!ios && deferred && (
          <button
            onClick={install}
            className="shrink-0 rounded-full bg-amber px-4 py-2 text-sm font-bold text-on-amber"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base text-ink-faint hover:bg-surface-2 hover:text-ink"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
