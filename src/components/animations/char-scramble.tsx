import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?*&%";

function seededChar(seed: string, index: number) {
  const code =
    seed
      .split("")
      .reduce((total, character) => total + character.charCodeAt(0), 0) +
    index * 17;
  return CHARSET[code % CHARSET.length] ?? "X";
}

export function CharScrambleAnimation({
  winner,
  durationSeconds,
  settled = false,
  size = "default",
  onDone,
}: {
  winner: string | null;
  durationSeconds: number;
  settled?: boolean;
  size?: "default" | "tall";
  onDone?: () => void;
}) {
  const [value, setValue] = useState("##########");
  const doneRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const handleDone = useEffectEvent(() => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  });
  const displayValue =
    prefersReducedMotion || settled ? (winner ?? "##########") : value;

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
      let frame = 0;
      const timer = window.setInterval(() => {
        setValue(
          Array.from({ length: 10 }, (_, index) =>
            seededChar(`pending-${frame}`, index),
          ).join(""),
        );
        frame += 1;
      }, 60);
      return () => window.clearInterval(timer);
    }

    let frame = 0;
    const totalFrames = Math.max(
      18,
      Math.round(durationSeconds * 24),
      winner.length * 6,
    );
    const intervalMs = Math.max(
      30,
      Math.round((durationSeconds * 1000) / totalFrames),
    );
    const timer = window.setInterval(() => {
      const next = winner
        .split("")
        .map((character, index) => {
          const threshold = Math.min(
            1,
            frame / (totalFrames * 0.6 + index * 3),
          );
          return threshold >= 1
            ? character
            : seededChar(`${winner}-${frame}`, index);
        })
        .join("");

      setValue(next);
      frame += 1;

      if (frame > totalFrames) {
        window.clearInterval(timer);
        setValue(winner);
        handleDone();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [durationSeconds, prefersReducedMotion, settled, winner]);

  return (
    <div
      className={
        size === "tall"
          ? "flex w-full min-h-[21rem] items-center justify-center rounded-[1.35rem] border border-primary/20 bg-black/34 px-3 text-center shadow-[inset_0_0_44px_rgba(0,0,0,0.4),0_0_28px_rgba(83,255,118,0.06)]"
          : "flex w-full h-28 items-center justify-center rounded-[1.35rem] border border-primary/20 bg-black/34 px-3 text-center shadow-[inset_0_0_44px_rgba(0,0,0,0.4),0_0_28px_rgba(83,255,118,0.06)]"
      }
    >
      <div className="font-mono text-2xl font-semibold tracking-[0.18em] text-primary sm:text-3xl">
        {displayValue}
      </div>
    </div>
  );
}
