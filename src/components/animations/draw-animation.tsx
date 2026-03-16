import type { AnimationMode } from "@/domain/types";
import { CharScrambleAnimation } from "@/components/animations/char-scramble";
import { SlotMachineAnimation } from "@/components/animations/slot-machine";
import { WheelAnimation } from "@/components/animations/wheel";

export function DrawAnimation({
  mode,
  pool,
  winner,
  durationSeconds,
  settled = false,
  landed = false,
  size = "default",
  onDone,
}: {
  mode: AnimationMode;
  pool: string[];
  winner: string | null;
  durationSeconds: number;
  settled?: boolean;
  landed?: boolean;
  size?: "default" | "tall";
  onDone?: () => void;
}) {
  if (mode === "slot-machine") {
    return (
      <SlotMachineAnimation
        pool={pool}
        winner={winner}
        durationSeconds={durationSeconds}
        settled={settled}
        size={size}
        onDone={onDone}
      />
    );
  }

  if (mode === "char-scramble") {
    return (
      <CharScrambleAnimation
        winner={winner}
        durationSeconds={durationSeconds}
        settled={settled}
        size={size}
        onDone={onDone}
      />
    );
  }

  return (
    <WheelAnimation
      pool={pool}
      winner={winner}
      durationSeconds={durationSeconds}
      settled={settled}
      landed={landed}
      size={size}
      onDone={onDone}
    />
  );
}
