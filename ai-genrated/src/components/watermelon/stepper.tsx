'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HiMinus, HiPlus } from 'react-icons/hi';

export interface StepperProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (val: number) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  theme?: "light" | "gold" | "dark";
}

const digitVariants = {
  initial: (dir: number) => ({
    y: dir > 0 ? 18 : -18,
    opacity: 0,
    scale: 0.5,
    filter: 'blur(2px)',
  }),
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -18 : 18,
    opacity: 0,
    scale: 0.5,
    filter: 'blur(2px)',
  }),
};

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
  const [direction, setDirection] = React.useState(0);

  const current = isControlled ? value! : internal;
  const digits = current.toString().split('');

  const [prevDigits, setPrevDigits] = React.useState<string[]>([]);
  const [prevTicks, setPrevTicks] = React.useState<number[]>([]);

  const len = digits.length;
  const lenDiff = len - prevDigits.length;

  const nextTicks = digits.map((digit, i) => {
    const prevI = i - lenDiff;
    const prevDigit = prevI >= 0 ? prevDigits[prevI] : undefined;
    const prevTick = prevI >= 0 ? prevTicks[prevI] : 0;

    return digit !== prevDigit ? (prevTick ?? 0) + 1 : (prevTick ?? 0);
  });

  if (prevDigits.join("") !== digits.join("")) {
    setPrevTicks(nextTicks);
    setPrevDigits(digits);
  }

  const step = (dir: number) => {
    if (disabled) return;
    const next = Math.min(max, Math.max(min, current + dir));
    if (next === current) return;
    setDirection(dir);
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  // Dimensions based on size
  const buttonSizes = {
    sm: "h-7 w-7 sm:h-8 sm:w-8 text-xs",
    md: "h-9 w-9 sm:h-10 sm:w-10 text-sm",
    lg: "h-11 w-11 sm:h-14 sm:w-14 text-base",
  }[size];

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  const fontSizes = {
    sm: "text-sm sm:text-base font-bold",
    md: "text-base sm:text-lg font-bold",
    lg: "text-xl sm:text-3xl font-extrabold",
  }[size];

  const digitWidth = {
    sm: "w-2.5 sm:w-3 h-5 sm:h-6",
    md: "w-3 sm:w-3.5 h-6 sm:h-7",
    lg: "w-3.5 sm:w-4 h-8",
  }[size];

  // Theme styles
  const themeStyles = {
    gold: {
      container: "border-amber-300/60 bg-amber-50/40 shadow-xs",
      btn: "bg-[#140638] text-[#dfb755] hover:bg-[#250b5e] hover:text-white disabled:opacity-40 shadow-xs",
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
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 sm:gap-2.5 rounded-full border px-1 py-1 transition-all ${themeStyles.container}`}
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          onClick={() => step(-1)}
          disabled={disabled || current <= min}
          aria-label="Decrease quantity"
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full transition ${buttonSizes} ${themeStyles.btn}`}
        >
          <HiMinus className={iconSizes} />
        </motion.button>

        <div
          className={`relative flex shrink-0 items-center justify-center gap-0.5 tabular-nums ${fontSizes} ${themeStyles.digits}`}
        >
          {digits.map((digit, index) => (
            <div
              key={`${index}-${len}`}
              className={`relative overflow-hidden flex items-center justify-center ${digitWidth}`}
            >
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.span
                  key={nextTicks[index]}
                  custom={direction}
                  variants={digitVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 240,
                    damping: 18,
                    mass: 0.9,
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {digit}
                </motion.span>
              </AnimatePresence>
            </div>
          ))}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          onClick={() => step(1)}
          disabled={disabled || current >= max}
          aria-label="Increase quantity"
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full transition ${buttonSizes} ${themeStyles.btn}`}
        >
          <HiPlus className={iconSizes} />
        </motion.button>
      </div>
    </div>
  );
}
