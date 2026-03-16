import * as React from "react";

import { cn } from "@/lib/utils";

const toggleGroupItemVariantClasses = {
  default: "bg-transparent",
  outline:
    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground data-[state=on]:border-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
} as const;

const toggleGroupItemSizeClasses = {
  default: "h-9 min-w-9 px-3",
  sm: "h-8 min-w-8 px-2.5",
  lg: "h-10 min-w-10 px-3.5",
} as const;

type ToggleGroupValue = {
  disabled: boolean;
  value: string;
  onValueChange?: (value: string) => void;
};

const ToggleGroupContext = React.createContext<ToggleGroupValue | null>(null);

function ToggleGroup({
  className,
  type = "single",
  disabled = false,
  value = "",
  onValueChange,
  ...props
}: React.ComponentProps<"div"> & {
  type?: "single";
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <ToggleGroupContext.Provider value={{ disabled, value, onValueChange }}>
      <div
        data-slot="toggle-group"
        data-type={type}
        className={cn(
          "flex w-fit items-center justify-center gap-1",
          className,
        )}
        {...props}
      />
    </ToggleGroupContext.Provider>
  );
}

function ToggleGroupItem({
  className,
  variant = "default",
  size = "default",
  value,
  disabled,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  variant?: keyof typeof toggleGroupItemVariantClasses;
  size?: keyof typeof toggleGroupItemSizeClasses;
}) {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroupItem must be used within ToggleGroup");
  }

  const pressed = context.value === value;
  const isDisabled = disabled || context.disabled;

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      data-state={pressed ? "on" : "off"}
      aria-pressed={pressed}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        toggleGroupItemVariantClasses[variant],
        toggleGroupItemSizeClasses[size],
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          context.onValueChange?.(pressed ? "" : value);
        }
      }}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
