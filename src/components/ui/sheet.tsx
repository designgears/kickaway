import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);
const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within Sheet");
  }
  return context;
}

function useOverlayLifecycle(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [open, onOpenChange]);
}

function Sheet({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => onOpenChange?.(nextOpen),
    [onOpenChange],
  );

  useOverlayLifecycle(open, handleOpenChange);

  return (
    <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetOverlay({ className, ...props }: React.ComponentProps<"div">) {
  const { open, onOpenChange } = useSheetContext();

  if (!open) {
    return null;
  }

  return (
    <div
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

const sheetSideClasses = {
  top: "inset-x-0 top-0 h-auto border-b",
  right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
  bottom: "inset-x-0 bottom-0 h-auto border-t",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
} as const;

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & {
  side?: keyof typeof sheetSideClasses;
  showCloseButton?: boolean;
}) {
  const { open, onOpenChange } = useSheetContext();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector),
      );
      (focusableElements[0] ?? container).focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <SheetOverlay />
      <div
        ref={contentRef}
        data-slot="sheet-content"
        data-side={side}
        tabIndex={-1}
        className={cn(
          "fixed z-50 flex flex-col bg-background bg-clip-padding text-sm shadow-lg",
          sheetSideClasses[side],
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") {
            return;
          }

          const container = contentRef.current;
          if (!container) {
            return;
          }

          const focusableElements = Array.from(
            container.querySelectorAll<HTMLElement>(focusableSelector),
          );

          if (focusableElements.length === 0) {
            event.preventDefault();
            container.focus();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }

          if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <Button
            variant="ghost"
            className="absolute top-3 right-3"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        ) : null}
      </div>
    </>
  );
}

function SheetClose({
  render,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  render?: React.ReactElement;
}) {
  const { onOpenChange } = useSheetContext();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      onOpenChange(false);
    }
  };

  if (render && React.isValidElement(render)) {
    const renderedButton = render as React.ReactElement<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    const renderProps = renderedButton.props;
    return React.cloneElement(renderedButton, {
      ...props,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        renderProps.onClick?.(event);
        handleClick(event);
      },
      children,
    });
  }

  return (
    <button
      type="button"
      data-slot="sheet-close"
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetOverlay, SheetTitle };
