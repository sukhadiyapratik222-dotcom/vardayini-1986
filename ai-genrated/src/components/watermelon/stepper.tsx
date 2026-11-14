'use client';

import * as React from 'react';
import { MaterialSymbol } from '@/components/ui/material-symbol';

export interface StepperProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (val: number) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  theme?: "gold" | "dark" | "light";
}

/**
 * Clean Product Quantity Stepper with Google Material Symbols (add / remove)
 * @see https://fonts.google.com/icons
 */
export function Stepper({
  value,
  defaultValue = 1,
  min = 1,
  max = 999,
  onChange,
  className = "",
  size = "md",
  disabled = false,
  theme = "gold",
}: StepperProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);

  const current = isControlled ? value! : internal;

  const step = (dir: number) => {
    if (disabled) return;
    const next = Math.min(max, Math.max(min, current + dir));
    if (next === current) return;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  // Dimensions based on size
  const buttonSizes = {
    sm: "h-7 w-7 sm:h-8 sm:w-8",
    md: "h-9 w-9 sm:h-10 sm:w-10",
    lg: "h-11 w-11 sm:h-13 sm:w-13",
  }[size];

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }[size];

  const fontSizes = {
    sm: "text-xs sm:text-sm font-bold min-w-[28px] sm:min-w-[32px]",
    md: "text-sm sm:text-base font-bold min-w-[36px] sm:min-w-[42px]",
    lg: "text-lg sm:text-2xl font-extrabold min-w-[44px] sm:min-w-[52px]",
  }[size];

  // Theme styles
  const themeStyles = {
    gold: {
      container: "border-amber-300/60 bg-white sm:bg-amber-50/40 shadow-xs",
      btn: "bg-[#140638] text-[#dfb755] hover:bg-[#250b5e] hover:text-white disabled:opacity-35 shadow-xs",
      digits: "text-[#140638]",
    },
    dark: {
      container: "border-[#e6bf7a]/30 bg-[#23120b] shadow-inner",
      btn: "bg-[#e6bf7a] text-[#170b05] hover:bg-white hover:text-[#170b05] disabled:opacity-30 shadow-xs",
      digits: "text-[#f6ead6]",
    },
    light: {
      container: "border-slate-200 bg-white shadow-xs",
      btn: "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 shadow-xs",
      digits: "text-slate-900",
    },
  }[theme];

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <div
        className={`inline-flex items-center gap-1 sm:gap-2 rounded-full border p-1 transition-colors ${themeStyles.container}`}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || current <= min}
          aria-label="Decrease quantity"
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 disabled:cursor-not-allowed ${buttonSizes} ${themeStyles.btn}`}
        >
          <MaterialSymbol name="remove" size={iconSizes} weight={600} />
        </button>

        <span
          className={`text-center tabular-nums leading-none flex items-center justify-center px-1 ${fontSizes} ${themeStyles.digits}`}
        >
          {current}
        </span>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || current >= max}
          aria-label="Increase quantity"
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 disabled:cursor-not-allowed ${buttonSizes} ${themeStyles.btn}`}
        >
          <MaterialSymbol name="add" size={iconSizes} weight={600} />
        </button>
      </div>
    </div>
  );
}
