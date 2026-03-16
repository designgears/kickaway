import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const ITEM_HEIGHT = 52;
const DISPLAY_COUNT = 14;
const REPEAT_CYCLES = 18;

const topEdgeBlurStyle = {
  WebkitMaskImage:
    "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.62) 58%, black 100%)",
  maskImage:
    "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.62) 58%, black 100%)",
} satisfies CSSProperties;

const bottomEdgeBlurStyle = {
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.62) 58%, black 100%)",
  maskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.62) 58%, black 100%)",
} satisfies CSSProperties;

function hashSeed(seed: string) {
  return seed
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
}

function normalizeEntry(entry: string | null) {
  return entry?.trim().toLocaleLowerCase() ?? "";
}

function samplePool(pool: string[], winner: string | null) {
  const winnerKey = normalizeEntry(winner);
  const seen = new Set<string>();
  const source = pool.filter((entry) => {
    const normalized = normalizeEntry(entry);

    if (!normalized || normalized === winnerKey || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
  const fallback =
    source.length > 0 ? source : ["Waiting…", "Loading…", "Drawing…"];
  const desiredCount = Math.max(
    6,
    Math.min(DISPLAY_COUNT, fallback.length || DISPLAY_COUNT),
  );
  const start = hashSeed(winner ?? fallback[0] ?? "pending") % fallback.length;
  const step = Math.max(1, Math.floor(fallback.length / desiredCount));
  const sampled: string[] = [];
  let cursor = start;

  while (sampled.length < desiredCount && sampled.length < fallback.length) {
    const next = fallback[cursor % fallback.length];
    if (next && !sampled.includes(next)) {
      sampled.push(next);
    }
    cursor += step;

    if (cursor - start > fallback.length * 4) {
      break;
    }
  }

  for (const entry of fallback) {
    if (sampled.length >= desiredCount) {
      break;
    }

    if (!sampled.includes(entry)) {
      sampled.push(entry);
    }
  }

  while (sampled.length < desiredCount) {
    sampled.push(
      fallback[sampled.length % fallback.length] ??
        `Entry ${sampled.length + 1}`,
    );
  }

  return sampled;
}

function readTranslateY(element: HTMLElement) {
  const transform = window.getComputedStyle(element).transform;
  if (transform === "none") {
    return 0;
  }

  const matrix3dMatch = transform.match(/matrix3d\(([^)]+)\)/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1]
      .split(",")
      .map((value) => Number.parseFloat(value.trim()));
    return values[13] ?? 0;
  }

  const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
  if (!matrixMatch) {
    return 0;
  }

  const values = matrixMatch[1]
    .split(",")
    .map((value) => Number.parseFloat(value.trim()));
  return values[5] ?? 0;
}

function getOvershootDistance(seed: string | null) {
  if (!seed) {
    return 18;
  }

  return 10 + (hashSeed(seed) % 33);
}

export function WheelAnimation({
  pool,
  winner,
  durationSeconds,
  settled = false,
  landed = false,
  size = "default",
  onDone,
}: {
  pool: string[];
  winner: string | null;
  durationSeconds: number;
  settled?: boolean;
  landed?: boolean;
  size?: "default" | "tall";
  onDone?: () => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const visibleRows = size === "tall" ? 7 : 5;
  const centerRow = Math.floor(visibleRows / 2);
  const entries = useMemo(() => samplePool(pool, winner), [pool, winner]);
  const winnerIndex = winner
    ? Math.abs(hashSeed(winner) % Math.max(entries.length, 1))
    : 0;
  const cycleHeight = entries.length * ITEM_HEIGHT;
  const targetIndex = entries.length * 12 + winnerIndex;
  const initialIndex =
    entries.length * 4 + ((winnerIndex + 2) % Math.max(entries.length, 1));
  const repeatedEntries = useMemo(() => {
    const next = Array.from(
      { length: entries.length * REPEAT_CYCLES },
      (_, index) => entries[index % entries.length],
    );

    if (winner) {
      next[targetIndex] = winner;
    }

    return next;
  }, [entries, targetIndex, winner]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);
  const handleDone = useEffectEvent(() => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  });

  useEffect(() => {
    doneRef.current = false;
    const element = trackRef.current;

    if (!element) {
      return;
    }

    if (prefersReducedMotion || settled) {
      element.style.transform = `translateY(-${(winner ? targetIndex : initialIndex) * ITEM_HEIGHT}px)`;
      if (winner && prefersReducedMotion) {
        handleDone();
      }
      return;
    }

    if (!winner) {
      const from = -initialIndex * ITEM_HEIGHT;
      const to = from - cycleHeight;
      element.style.transform = `translateY(${from}px)`;
      const animation = element.animate(
        [
          { transform: `translateY(${from}px)` },
          { transform: `translateY(${to}px)` },
        ],
        {
          duration: 950,
          easing: "linear",
          iterations: Number.POSITIVE_INFINITY,
        },
      );

      return () => {
        animation.cancel();
      };
    }

    const current = readTranslateY(element);
    const finalOffset = -targetIndex * ITEM_HEIGHT;
    const totalDurationMs = Math.max(durationSeconds * 1000, 450);
    const bounceDurationMs = Math.min(
      240,
      Math.max(140, totalDurationMs * 0.12),
    );
    const spinDurationMs = Math.max(200, totalDurationMs - bounceDurationMs);
    const overshootOffset = finalOffset - getOvershootDistance(winner);
    const spinAnimation = element.animate(
      [
        { transform: `translateY(${current}px)` },
        { transform: `translateY(${overshootOffset}px)` },
      ],
      {
        duration: spinDurationMs,
        easing: "cubic-bezier(0.08,0.82,0.24,1)",
        fill: "forwards",
      },
    );

    let cancelled = false;
    let bounceAnimation: Animation | null = null;

    const finish = async () => {
      if (cancelled) {
        return;
      }

      bounceAnimation = element.animate(
        [
          { transform: `translateY(${overshootOffset}px)` },
          { transform: `translateY(${finalOffset}px)` },
        ],
        {
          duration: bounceDurationMs,
          easing: "cubic-bezier(0.22,1.2,0.36,1)",
          fill: "forwards",
        },
      );

      await bounceAnimation.finished.catch(() => undefined);
      if (cancelled) {
        return;
      }

      element.style.transform = `translateY(${finalOffset}px)`;
      handleDone();
    };

    spinAnimation.finished.then(finish).catch(() => undefined);

    return () => {
      cancelled = true;
      spinAnimation.cancel();
      bounceAnimation?.cancel();
    };
  }, [
    cycleHeight,
    durationSeconds,
    initialIndex,
    prefersReducedMotion,
    settled,
    targetIndex,
    winner,
  ]);

  return (
    <div className="w-full space-y-3">
      <div
        className="relative overflow-hidden rounded-[1.35rem] border border-primary/20 bg-black/34 shadow-[inset_0_0_50px_rgba(0,0,0,0.38),0_0_36px_rgba(83,255,118,0.06)]"
        style={{ height: `${ITEM_HEIGHT * visibleRows}px` }}
      >
        <div
          className={
            landed && winner
              ? "absolute inset-x-3 top-1/2 z-20 isolate h-[52px] -translate-y-1/2 overflow-hidden rounded-[1rem] border border-white/45 bg-[#74f47f] shadow-[0_10px_28px_rgba(83,255,118,0.18)]"
              : "absolute inset-x-3 top-1/2 z-20 h-[52px] -translate-y-1/2 rounded-xl border border-primary/45 bg-primary/12 shadow-[0_0_28px_rgba(83,255,118,0.1)]"
          }
        >
          {landed && winner ? (
            <>
              <div className="winner-lock-basic absolute inset-px rounded-[inherit]" />
              <div className="winner-lock-basic-border absolute inset-0 rounded-[inherit]" />
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                <span className="block max-w-full truncate text-[1.22rem] font-black tracking-[0.01em] text-[#051007] drop-shadow-[0_1px_0_rgba(255,255,255,0.24)] sm:text-[1.42rem]">
                  {winner}
                </span>
              </div>
            </>
          ) : null}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-[#09110b]/82 backdrop-blur-[8px]"
          style={topEdgeBlurStyle}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[#09110b]/82 backdrop-blur-[8px]"
          style={bottomEdgeBlurStyle}
        />
        <div
          ref={trackRef}
          className="px-3"
          style={{
            paddingBlock: `${ITEM_HEIGHT * centerRow}px`,
          }}
        >
          {repeatedEntries.map((entry, index) => {
            const isWinnerRow = Boolean(winner) && index === targetIndex;

            return (
              <div
                key={`${entry}-${index}`}
                className="flex items-center justify-center"
                style={{ height: `${ITEM_HEIGHT}px` }}
              >
                <div
                  className={
                    isWinnerRow && landed
                      ? "w-full rounded-xl border border-transparent px-4 py-3 text-center text-[0.98rem] font-medium text-white/0"
                      : "w-full rounded-xl border border-transparent px-4 py-3 text-center text-[0.98rem] font-medium text-white/76"
                  }
                >
                  <span className="block truncate">{entry}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
