import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 active:scale-[0.98]":
              variant === "default",
            "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white":
              variant === "outline",
            "hover:bg-white/5 text-white/70 hover:text-white":
              variant === "ghost",
            "bg-red-600/80 hover:bg-red-500 text-white shadow-lg shadow-red-900/40":
              variant === "destructive",
          },
          {
            "h-10 px-6 py-2": size === "default",
            "h-8 px-4 text-xs": size === "sm",
            "h-12 px-8 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
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
