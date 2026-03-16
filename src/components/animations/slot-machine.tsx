import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

function hashSeed(seed: string) {
  return seed
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
}

function buildSequence(pool: string[], seed: string, count: number) {
  const source = pool.length > 0 ? pool : ["Waiting…", "Loading…", "Drawing…"];
  const base = hashSeed(seed) % source.length;
  return Array.from(
    { length: count },
    (_, index) => source[(base + index) % source.length],
  );
}

export function SlotMachineAnimation({
  pool,
  winner,
  durationSeconds,
  settled = false,
  size = "default",
  onDone,
}: {
  pool: string[];
  winner: string | null;
  durationSeconds: number;
  settled?: boolean;
  size?: "default" | "tall";
  onDone?: () => void;
}) {
  const sequence = useMemo(
    () => buildSequence(pool, winner ?? "pending", 18),
    [pool, winner],
  );
  const [value, setValue] = useState(winner ?? sequence[0] ?? "Waiting…");
  const doneRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const handleDone = useEffectEvent(() => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  });
  const displayValue =
    prefersReducedMotion || settled
      ? (winner ?? sequence[0] ?? "Waiting…")
      : value;

  useEffect(() => {
    doneRef.current = false;

    if (settled) {
      return;
    }

    if (prefersReducedMotion) {
      if (winner) {
        handleDone();
      }
      return;
    }

    if (!winner) {
      let index = 0;
      const timer = window.setInterval(() => {
        setValue(sequence[index % sequence.length] ?? "Waiting…");
        index += 1;
      }, 90);
      return () => window.clearInterval(timer);
    }

    let index = 0;
    const totalSteps = Math.max(
      sequence.length,
      Math.round(durationSeconds * 12),
    );
    const intervalMs = Math.max(
      45,
      Math.round((durationSeconds * 1000) / totalSteps),
    );
    const timer = window.setInterval(() => {
      if (index >= totalSteps) {
        window.clearInterval(timer);
        setValue(winner);
        handleDone();
        return;
      }

      setValue(sequence[index % sequence.length] ?? winner);
      index += 1;
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [durationSeconds, prefersReducedMotion, sequence, settled, winner]);

  return (
    <div
      className={
        size === "tall"
          ? "flex w-full min-h-[21rem] items-center justify-center rounded-[1.35rem] border border-primary/20 bg-black/34 px-3 text-center shadow-[inset_0_0_40px_rgba(0,0,0,0.35),0_0_32px_rgba(83,255,118,0.06)]"
          : "flex w-full h-28 items-center justify-center rounded-[1.35rem] border border-primary/20 bg-black/34 px-3 text-center shadow-[inset_0_0_40px_rgba(0,0,0,0.35),0_0_32px_rgba(83,255,118,0.06)]"
      }
    >
      <div className="w-full rounded-[1.1rem] border border-white/8 bg-black/50 px-3 py-5">
        <div className="font-display text-[2rem] tracking-[0.16em] text-primary drop-shadow-[0_0_18px_rgba(83,255,118,0.28)] sm:text-4xl">
          {displayValue}
        </div>
      </div>
    </div>
  );
}
