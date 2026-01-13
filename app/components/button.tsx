import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-normal ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--teal-primary)] text-white hover:bg-[var(--teal-dark)]":
              variant === "default",
            "border border-[var(--border-color)] bg-[var(--background)] hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 hover:border-[var(--teal-primary)] text-[var(--text-primary)] focus-visible:border-[var(--teal-primary)]":
              variant === "outline",
            "hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 hover:text-[var(--text-primary)]": variant === "ghost",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
