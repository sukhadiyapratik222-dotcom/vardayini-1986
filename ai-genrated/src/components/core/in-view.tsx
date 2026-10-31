"use client";

import { ReactNode, useRef } from "react";
import {
  motion,
  useInView,
  Variant,
  Transition,
  UseInViewOptions,
} from "motion/react";

export type InViewProps = {
  children: ReactNode;
  variants?: {
    hidden: Variant;
    visible: Variant;
  };
  transition?: Transition;
  viewOptions?: UseInViewOptions;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  once?: boolean;
};

const defaultVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0 },
};

export function InView({
  children,
  variants = defaultVariants,
  transition,
  viewOptions,
  as = "div",
  className,
  once = true,
}: InViewProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, ...viewOptions });

  const MotionComponent =
    typeof as === "string" && (motion as Record<string, any>)[as]
      ? (motion as Record<string, any>)[as]
      : motion.div;

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={transition || { duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      {children}
    </MotionComponent>
  );
}

export function InViewBasicMultiple() {
  return (
    <div className="h-[350px] w-full overflow-y-auto overflow-x-hidden">
      <div className="mb-36 py-12 text-center text-sm">Scroll down</div>
      <div className="flex h-[350px] items-end justify-center px-4 pb-24">
        <InView
          variants={{
            hidden: {
              opacity: 0,
              y: 30,
              scale: 0.95,
              filter: "blur(4px)",
            },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            },
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          viewOptions={{ margin: "0px 0px -100px 0px" }}
        >
          <div className="max-w-96 bg-zinc-100 p-4">
            <p className="text-zinc-600">
              <strong className="font-medium text-zinc-900">Athletics.</strong>{" "}
              Watch running, jumping, and throwing events. Athletes compete in
              many different activities.
            </p>
          </div>
        </InView>
      </div>
      <div className="flex h-[350px] items-end justify-center px-4 pb-24">
        <InView
          variants={{
            hidden: {
              opacity: 0,
              x: 100,
            },
            visible: {
              opacity: 1,
              x: 0,
            },
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          viewOptions={{ margin: "0px 0px -100px 0px" }}
        >
          <div className="max-w-96 bg-zinc-900 p-4">
            <p className="text-zinc-400">
              <strong className="font-medium text-zinc-50">Swimming.</strong>{" "}
              See swimmers race in water. They use different styles to swim fast
              and win medals.
            </p>
          </div>
        </InView>
      </div>
      <div className="flex h-[350px] items-end justify-center overflow-x-hidden px-4 pb-24">
        <InView
          variants={{
            hidden: {
              opacity: 0,
              scale: 1.5,
            },
            visible: {
              opacity: 1,
              scale: 1,
            },
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          viewOptions={{ margin: "0px 0px -100px 0px" }}
        >
          <div className="max-w-96 bg-zinc-100 p-4">
            <p className="text-zinc-600">
              <strong className="font-medium">Gymnastics.</strong> Gymnasts
              perform amazing flips and jumps. They show strength and balance in
              their routines.
            </p>
          </div>
        </InView>
      </div>
    </div>
  );
}
