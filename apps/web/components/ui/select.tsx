import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-9 text-sm text-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            // Style native options for dark bg (Chrome/Edge support)
            "[&>option]:bg-[#0f0c1a] [&>option]:text-white",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {/* Chevron icon */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

const SelectItem = ({ children, ...props }: SelectItemProps) => (
  <option {...props}>{children}</option>
);
SelectItem.displayName = "SelectItem";

export { Select, SelectItem };
