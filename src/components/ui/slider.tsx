import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "value"
> & {
  defaultValue?: number[];
  value?: number[];
  onValueChange?: (value: number[]) => void;
};

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      defaultValue,
      value,
      min = 0,
      max = 100,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      defaultValue?.[0] ?? min,
    );
    const resolvedValue = value?.[0] ?? internalValue;

    return (
      <input
        ref={ref}
        type="range"
        data-slot="slider"
        className={cn(
          "kick-range-slider w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        min={min}
        max={max}
        value={resolvedValue}
        onChange={(event) => {
          const nextValue = Number(event.currentTarget.value);
          if (!value) {
            setInternalValue(nextValue);
          }
          onValueChange?.([nextValue]);
        }}
        {...props}
      />
    );
  },
);

Slider.displayName = "Slider";

export { Slider };
