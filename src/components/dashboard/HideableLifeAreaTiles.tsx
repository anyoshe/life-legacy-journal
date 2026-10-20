"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "llj.dashboard.hiddenEmptyAreas";

export type LifeAreaTileData = {
  area: string;
  label: string;
  gradient: string;
  goalCount: number;
  topGoalId: string | null;
  topGoalTitle: string | null;
};

function readHidden(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeHidden(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Same tiles as before. Only empty ("Begin when ready") can be hidden on this device.
 */
export function HideableLifeAreaTiles({ tiles }: { tiles: LifeAreaTileData[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(readHidden());
    setReady(true);
  }, []);

  const visible = useMemo(() => {
    if (!ready) return tiles;
    return tiles.filter((tile) => {
      if (tile.goalCount > 0) return true;
      return !hidden.includes(tile.area);
    });
  }, [tiles, hidden, ready]);

  const hiddenEmpty = useMemo(() => {
    const set = new Set(hidden);
    return tiles.filter((tile) => tile.goalCount === 0 && set.has(tile.area));
  }, [tiles, hidden]);

  const hide = useCallback((area: string) => {
    setHidden((prev) => {
      const next = Array.from(new Set([...prev, area]));
      writeHidden(next);
      return next;
    });
  }, []);

  const restore = useCallback((area: string) => {
    setHidden((prev) => {
      const next = prev.filter((a) => a !== area);
      writeHidden(next);
      return next;
    });
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Goals by life area
        </h2>
        <Link href="/goals" className="text-xs font-medium text-primary">
          All goals
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {visible.map((tile) => (
          <div
            key={tile.area}
            className="group relative min-h-[7.5rem] overflow-hidden rounded-2xl shadow-sm transition hover:shadow-md"
            style={{ background: tile.gradient }}
          >
            <Link
              href={tile.topGoalId ? `/goals/${tile.topGoalId}` : "/goals"}
              className="absolute inset-0 z-0"
              aria-label={tile.label}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-3.5 text-white">
              {tile.goalCount === 0 ? (
                <div className="mb-auto flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      hide(tile.area);
                    }}
                    className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-sm leading-none text-white/90 opacity-90 transition hover:bg-black/50"
                    title="Hide until I am ready"
                    aria-label={`Hide ${tile.label}`}
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/80">
                {tile.label}
              </p>
              {tile.topGoalTitle ? (
                <>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">
                    {tile.topGoalTitle}
                  </p>
                  <p className="mt-1 text-[0.65rem] text-white/75">
                    {tile.goalCount} goal{tile.goalCount === 1 ? "" : "s"}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-sm text-white/85">Begin when ready</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {hiddenEmpty.length > 0 ? (
        <p className="mt-3 text-xs text-secondary">
          Hidden (not ready yet):{" "}
          {hiddenEmpty.map((tile, i) => (
            <span key={tile.area}>
              {i > 0 ? " · " : ""}
              <button
                type="button"
                onClick={() => restore(tile.area)}
                className="font-medium text-primary hover:underline"
              >
                Show {tile.label}
              </button>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
