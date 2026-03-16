import * as React from "react";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="scroll-area"
    className={cn(
      "overflow-auto rounded-[inherit] pr-1 [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin]",
      className,
    )}
    {...props}
  />
));

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
