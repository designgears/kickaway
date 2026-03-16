import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AccordionValue = {
  openValues: string[];
  toggleItem: (value: string) => void;
};

type AccordionItemValue = {
  value: string;
};

const AccordionContext = React.createContext<AccordionValue | null>(null);
const AccordionItemContext = React.createContext<AccordionItemValue | null>(
  null,
);

function Accordion({
  className,
  type = "single",
  defaultValue,
  ...props
}: React.ComponentProps<"div"> & {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
}) {
  const [openValues, setOpenValues] = React.useState<string[]>(() => {
    if (Array.isArray(defaultValue)) {
      return defaultValue;
    }
    return defaultValue ? [defaultValue] : [];
  });

  return (
    <AccordionContext.Provider
      value={{
        openValues,
        toggleItem: (value) =>
          setOpenValues((current) => {
            const isOpen = current.includes(value);
            if (type === "multiple") {
              return isOpen
                ? current.filter((item) => item !== value)
                : [...current, value];
            }
            return isOpen ? [] : [value];
          }),
      }}
    >
      <div
        data-slot="accordion"
        className={cn("w-full", className)}
        {...props}
      />
    </AccordionContext.Provider>
  );
}

function AccordionItem({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div
        data-slot="accordion-item"
        className={cn("border-b last:border-b-0", className)}
        {...props}
      />
    </AccordionItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionTrigger must be used within AccordionItem");
  }

  const isOpen = accordion.openValues.includes(item.value);

  return (
    <div className="flex">
      <button
        type="button"
        data-slot="accordion-trigger"
        data-state={isOpen ? "open" : "closed"}
        aria-expanded={isOpen}
        className={cn(
          "flex flex-1 items-center justify-between gap-3 py-3 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            accordion.toggleItem(item.value);
          }
        }}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </button>
    </div>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionContent must be used within AccordionItem");
  }

  if (!accordion.openValues.includes(item.value)) {
    return null;
  }

  return (
    <div
      data-slot="accordion-content"
      data-state="open"
      className={cn("overflow-hidden text-sm", className)}
      {...props}
    >
      <div className={cn("pt-0 pb-3", className)}>{children}</div>
    </div>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
