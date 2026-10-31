"use client";

import { motion, Transition } from "motion/react";
import React from "react";

export type BorderTrailProps = {
  className?: string;
  size?: number;
  radius?: number | string;
  borderWidth?: number | string;
  transition?: Transition;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className = "",
  size = 70,
  radius,
  borderWidth = 3.5,
  transition,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 10,
    ease: "linear",
  };

  const cornerRadius =
    radius !== undefined
      ? typeof radius === "number"
        ? `${radius}px`
        : radius
      : `${size}px`;

  const borderThickness =
    typeof borderWidth === "number" ? `${borderWidth}px` : borderWidth;

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{
        borderWidth: borderThickness,
        borderStyle: "solid",
        borderColor: "transparent",
        WebkitMask:
          "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "destination-out",
        mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
      }}
    >
      <motion.div
        className={`absolute aspect-square ${className}`}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${cornerRadius})`,
          ...style,
        }}
        animate={{
          offsetDistance: ["0%", "100%"],
        }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}

export function BorderTrailTextarea() {
  return (
    <div className="relative h-[160px] w-[260px] overflow-hidden rounded-md border border-zinc-950/10 bg-white text-zinc-700 outline-hidden dark:border-zinc-50/20 dark:bg-zinc-950 dark:text-zinc-300">
      <textarea className="h-full w-full resize-none rounded-md bg-transparent px-4 py-3 text-sm outline-hidden" />
      <BorderTrail
        className="bg-linear-to-l from-amber-300 via-amber-500 to-amber-300"
        size={120}
      />
    </div>
  );
}
