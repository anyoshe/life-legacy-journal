"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker and offers an optional "Install app" control
 * when the browser fires beforeinstallprompt (Chrome/Android).
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal in dev */
    });

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!show || !deferred) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 lg:bottom-4">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--border)] bg-surface px-3 py-2.5 shadow-lg">
        <p className="flex-1 text-xs text-[var(--text)] sm:text-sm">
          Install Life &amp; Legacy on your phone for quick access.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setShow(false);
            setDeferred(null);
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="shrink-0 text-xs text-secondary"
          onClick={() => setShow(false)}
          aria-label="Dismiss"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
