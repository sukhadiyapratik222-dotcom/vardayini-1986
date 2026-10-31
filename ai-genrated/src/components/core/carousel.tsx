"use client";

import {
  Children,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, Transition, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";

function ChevronLeft({
  className = "",
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({
  className = "",
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export type CarouselContextType = {
  index: number;
  setIndex: (newIndex: number) => void;
  itemsCount: number;
  setItemsCount: (newItemsCount: number) => void;
  visibleItemsCount: number;
  setVisibleItemsCount: (count: number) => void;
  maxIndex: number;
  disableDrag: boolean;
  loop: boolean;
};

const CarouselContext = createContext<CarouselContextType | undefined>(
  undefined
);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a CarouselProvider");
  }
  return context;
}

export type CarouselProviderProps = {
  children: ReactNode;
  initialIndex?: number;
  onIndexChange?: (newIndex: number) => void;
  disableDrag?: boolean;
  loop?: boolean;
};

export function CarouselProvider({
  children,
  initialIndex = 0,
  onIndexChange,
  disableDrag = false,
  loop = true,
}: CarouselProviderProps) {
  const [index, setIndex] = useState<number>(initialIndex);
  const [itemsCount, setItemsCount] = useState<number>(0);
  const [visibleItemsCount, setVisibleItemsCount] = useState<number>(1);

  const maxIndex = Math.max(0, itemsCount - visibleItemsCount);

  const handleSetIndex = (newIndex: number) => {
    let resolvedIndex = newIndex;
    if (loop && itemsCount > 0) {
      if (newIndex > maxIndex) resolvedIndex = 0;
      else if (newIndex < 0) resolvedIndex = maxIndex;
    } else {
      resolvedIndex = Math.max(0, Math.min(newIndex, maxIndex));
    }
    setIndex(resolvedIndex);
    onIndexChange?.(resolvedIndex);
  };

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  return (
    <CarouselContext.Provider
      value={{
        index,
        setIndex: handleSetIndex,
        itemsCount,
        setItemsCount,
        visibleItemsCount,
        setVisibleItemsCount,
        maxIndex,
        disableDrag,
        loop,
      }}
    >
      {children}
    </CarouselContext.Provider>
  );
}

export type CarouselProps = {
  children: ReactNode;
  className?: string;
  initialIndex?: number;
  index?: number;
  onIndexChange?: (newIndex: number) => void;
  disableDrag?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
};

export function Carousel({
  children,
  className,
  initialIndex = 0,
  index: externalIndex,
  onIndexChange,
  disableDrag = false,
  autoplay = false,
  autoplayInterval = 3500,
  pauseOnHover = true,
  loop = true,
}: CarouselProps) {
  const [internalIndex, setInternalIndex] = useState<number>(initialIndex);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isControlled = externalIndex !== undefined;
  const currentIndex = isControlled ? externalIndex : internalIndex;

  const handleIndexChange = (newIndex: number) => {
    if (!isControlled) {
      setInternalIndex(newIndex);
    }
    onIndexChange?.(newIndex);
  };

  return (
    <CarouselProvider
      initialIndex={currentIndex}
      onIndexChange={handleIndexChange}
      disableDrag={disableDrag}
      loop={loop}
    >
      <CarouselAutoplayController
        autoplay={autoplay}
        autoplayInterval={autoplayInterval}
        isHovered={pauseOnHover && isHovered}
      />
      <div
        className={cn("group/hover relative select-none", className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsHovered(false), 2000);
        }}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </CarouselProvider>
  );
}

function CarouselAutoplayController({
  autoplay,
  autoplayInterval,
  isHovered,
}: {
  autoplay: boolean;
  autoplayInterval: number;
  isHovered: boolean;
}) {
  const { index, setIndex, itemsCount, maxIndex, loop } = useCarousel();

  useEffect(() => {
    if (!autoplay || isHovered || itemsCount <= 1) return;

    const timer = setInterval(() => {
      setIndex(index >= maxIndex ? (loop ? 0 : index) : index + 1);
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [autoplay, autoplayInterval, isHovered, index, maxIndex, itemsCount, loop, setIndex]);

  return null;
}

export type CarouselNavigationProps = {
  className?: string;
  classNameButton?: string;
  alwaysShow?: boolean;
};

export function CarouselNavigation({
  className,
  classNameButton,
  alwaysShow,
}: CarouselNavigationProps) {
  const { index, setIndex, maxIndex, loop } = useCarousel();

  const isPrevDisabled = !loop && index === 0;
  const isNextDisabled = !loop && index >= maxIndex;

  if (maxIndex <= 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute -inset-x-2 sm:-inset-x-4 top-1/2 flex -translate-y-1/2 justify-between z-20",
        className
      )}
    >
      <button
        type="button"
        aria-label="Previous slide"
        className={cn(
          "pointer-events-auto flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-[#0b2f8a] shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200",
          alwaysShow
            ? "opacity-100"
            : "opacity-80 sm:opacity-0 sm:group-hover/hover:opacity-100",
          isPrevDisabled && "opacity-30 pointer-events-none",
          classNameButton
        )}
        disabled={isPrevDisabled}
        onClick={() => {
          setIndex(index - 1);
        }}
      >
        <ChevronLeft size={18} />
      </button>

      <button
        type="button"
        aria-label="Next slide"
        className={cn(
          "pointer-events-auto flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-[#0b2f8a] shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200",
          alwaysShow
            ? "opacity-100"
            : "opacity-80 sm:opacity-0 sm:group-hover/hover:opacity-100",
          isNextDisabled && "opacity-30 pointer-events-none",
          classNameButton
        )}
        disabled={isNextDisabled}
        onClick={() => {
          setIndex(index + 1);
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export type CarouselIndicatorProps = {
  className?: string;
  classNameButton?: string;
};

export function CarouselIndicator({
  className,
  classNameButton,
}: CarouselIndicatorProps) {
  const { index, setIndex, maxIndex } = useCarousel();
  const dotsCount = maxIndex + 1;

  if (dotsCount <= 1) return null;

  return (
    <div
      className={cn(
        "absolute -bottom-6 z-10 flex w-full items-center justify-center gap-2",
        className
      )}
    >
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/70 shadow-sm">
        {Array.from({ length: dotsCount }, (_, i) => {
          const isActive = index === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer",
                isActive
                  ? "w-6 bg-[#0b2f8a] shadow-xs"
                  : "w-2 bg-slate-300 hover:bg-slate-400",
                classNameButton
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

export type CarouselContentProps = {
  children: ReactNode;
  className?: string;
  transition?: Transition;
};

export function CarouselContent({
  children,
  className,
  transition,
}: CarouselContentProps) {
  const {
    index,
    setIndex,
    setItemsCount,
    visibleItemsCount,
    setVisibleItemsCount,
    maxIndex,
    disableDrag,
    loop,
  } = useCarousel();

  const containerRef = useRef<HTMLDivElement>(null);
  const itemsLength = Children.count(children);
  const [itemWidth, setItemWidth] = useState<number>(0);

  useEffect(() => {
    setItemsCount(itemsLength);
  }, [itemsLength, setItemsCount]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const parent = el.parentElement;
      const viewportWidth = parent ? parent.clientWidth : el.clientWidth;
      const firstChild = el.children[0] as HTMLElement | undefined;
      if (firstChild && viewportWidth > 0) {
        const rect = firstChild.getBoundingClientRect();
        const w = rect.width;
        if (w > 0) {
          setItemWidth(w);
          const count = Math.max(1, Math.min(itemsLength, Math.round(viewportWidth / w)));
          setVisibleItemsCount(count);
        }
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(el);
    if (el.parentElement) {
      resizeObserver.observe(el.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, [children, itemsLength, setVisibleItemsCount]);

  return (
    <motion.div
      drag={disableDrag ? false : "x"}
      dragConstraints={{
        left: -(maxIndex * (itemWidth || 300)),
        right: 0,
      }}
      dragElastic={0.15}
      onDragEnd={(_e, info) => {
        if (disableDrag) return;
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (offset < -40 || velocity < -250) {
          if (index < maxIndex) {
            setIndex(index + 1);
          } else if (loop) {
            setIndex(0);
          }
        } else if (offset > 40 || velocity > 250) {
          if (index > 0) {
            setIndex(index - 1);
          } else if (loop) {
            setIndex(maxIndex);
          }
        }
      }}
      animate={{
        x: -(index * itemWidth),
      }}
      transition={
        transition || {
          damping: 26,
          stiffness: 180,
          type: "spring",
        }
      }
      className={cn(
        "flex w-full items-stretch",
        !disableDrag && "cursor-grab active:cursor-grabbing",
        className
      )}
      ref={containerRef}
    >
      {children}
    </motion.div>
  );
}

export type CarouselItemProps = {
  children: ReactNode;
  className?: string;
};

export function CarouselItem({ children, className }: CarouselItemProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 shrink-0 grow-0 h-full flex flex-col",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CarouselBasic() {
  return (
    <div className="relative w-full max-w-xs">
      <Carousel autoplay={true} loop={true}>
        <CarouselContent>
          <CarouselItem className="p-4">
            <div className="flex aspect-square items-center justify-center border border-zinc-200 dark:border-zinc-800">
              1
            </div>
          </CarouselItem>
          <CarouselItem className="p-4">
            <div className="flex aspect-square items-center justify-center border border-zinc-200 dark:border-zinc-800">
              2
            </div>
          </CarouselItem>
          <CarouselItem className="p-4">
            <div className="flex aspect-square items-center justify-center border border-zinc-200 dark:border-zinc-800">
              3
            </div>
          </CarouselItem>
          <CarouselItem className="p-4">
            <div className="flex aspect-square items-center justify-center border border-zinc-200 dark:border-zinc-800">
              4
            </div>
          </CarouselItem>
        </CarouselContent>
        <CarouselNavigation alwaysShow />
        <CarouselIndicator />
      </Carousel>
    </div>
  );
}
