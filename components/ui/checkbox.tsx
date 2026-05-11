"use client";

import { forwardRef, type ChangeEventHandler } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      onCheckedChange?.(event.target.checked);
      onChange?.(event);
    };

    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          "h-4 w-4 rounded border border-border/60 bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          className,
        )}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";
