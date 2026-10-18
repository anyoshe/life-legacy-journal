"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Top bar that runs on every route change so navigation feels responsive. */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(t);
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-transparent"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div
        className="h-full w-full bg-primary"
        style={{
          animation: "llj-nav-progress 0.65s ease-out forwards",
          transformOrigin: "left center",
        }}
      />
      <style>{`
        @keyframes llj-nav-progress {
          0% { transform: scaleX(0); opacity: 1; }
          70% { transform: scaleX(0.9); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
