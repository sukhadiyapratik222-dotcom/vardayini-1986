"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useAnimate } from "motion/react";

const ui = { type: "spring", stiffness: 305, damping: 33 } as const;
const lively = { type: "spring", stiffness: 622, damping: 17 } as const;

const red = "#ff3b5c";

const heartPath =
  "M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z";

const particles = Array.from(
  { length: 8 },
  (_, i) => (i / 8) * Math.PI * 2 - Math.PI / 2,
);

interface Burst {
  id: number;
  x: number;
  y: number;
  rotate: number;
}

export interface DoubleTapProductImageProps {
  src: string;
  alt: string;
  productId?: number;
  initialLikesCount?: number;
  priority?: boolean;
  className?: string;
  showFooter?: boolean;
  children?: React.ReactNode;
}

function HeartBurst({ x, y, rotate, onDone }: Burst & { onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const heart = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const element = heart.current;
    if (!element || !scope.current) return;

    // A bouncy spring overshoots, so the heart pops
    animate(
      element,
      { scale: [0, 1], opacity: [0, 1], rotate: [0, rotate] },
      {
        type: "spring",
        visualDuration: 0.3,
        bounce: 0.6,
        opacity: { duration: 0.1 },
      },
    );

    // The exit runs on the container, so it doesn't stop the pop
    animate(
      scope.current,
      { y: -52, scale: 0.75, opacity: 0 },
      { duration: 0.4, ease: "easeIn", delay: 0.5 },
    ).then(onDone);
  }, [animate, onDone, rotate, scope]);

  return (
    <div ref={scope} className="dt-burst" style={{ left: x, top: y }}>
      {particles.map((angle, i) => (
        <motion.span
          key={i}
          className="dt-particle"
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos(angle) * 64,
            y: Math.sin(angle) * 64,
            scale: 0,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1], delay: 0.06 }}
        />
      ))}
      <svg
        ref={heart}
        className="dt-heart"
        width="96"
        height="96"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d={heartPath} fill="#ffffff" />
      </svg>
    </div>
  );
}

export function DoubleTapProductImage({
  src,
  alt,
  productId,
  initialLikesCount = 1248,
  priority = false,
  className = "",
  showFooter = true,
  children,
}: DoubleTapProductImageProps) {
  const photo = useRef<HTMLDivElement>(null);
  const [likeButton, animateLike] = useAnimate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);
  const lastTapRef = useRef<number>(0);

  // Read initial liked state from localStorage if productId provided
  useEffect(() => {
    if (productId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("vsm_wishlist_ids");
        if (stored) {
          const map = JSON.parse(stored);
          if (map[productId]) {
            setIsLiked(true);
          }
        }
      } catch {}
    }
  }, [productId]);

  const triggerLikeEffect = useCallback(
    (clientX: number, clientY: number) => {
      if (!photo.current) return;
      const rect = photo.current.getBoundingClientRect();
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      if (x <= 0 || y <= 0 || x >= rect.width || y >= rect.height) {
        x = rect.width / 2;
        y = rect.height / 2;
      }

      setBursts((current) => [
        ...current,
        { id: nextId.current++, x, y, rotate: Math.random() * 30 - 15 },
      ]);

      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        if (likeButton.current) {
          animateLike(likeButton.current, { scale: [1, 1.35, 1] }, { duration: 0.35, ease: "easeInOut" });
        }

        // Sync with Wishlist API if productId exists
        if (productId) {
          try {
            const stored = localStorage.getItem("vsm_wishlist_ids");
            const map = stored ? JSON.parse(stored) : {};
            map[productId] = true;
            localStorage.setItem("vsm_wishlist_ids", JSON.stringify(map));

            const storedItems = localStorage.getItem("vsm_guest_wishlist_items");
            const itemsMap: Record<number, any> = storedItems ? JSON.parse(storedItems) : {};
            itemsMap[productId] = {
              id: productId,
              productId,
              name: alt,
              imageUrl: src,
              slug: alt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            };
            localStorage.setItem("vsm_guest_wishlist_items", JSON.stringify(itemsMap));

            fetch("/api/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId }),
            }).catch(() => {});
          } catch {}
        }
      }
    },
    [alt, animateLike, isLiked, likeButton, productId, src],
  );

  const toggleLiked = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState && likeButton.current) {
      animateLike(likeButton.current, { scale: [1, 1.35, 1] }, { duration: 0.35, ease: "easeInOut" });
    }

    if (productId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("vsm_wishlist_ids");
        const map = stored ? JSON.parse(stored) : {};
        if (nextState) {
          map[productId] = true;
        } else {
          delete map[productId];
        }
        localStorage.setItem("vsm_wishlist_ids", JSON.stringify(map));

        const storedItems = localStorage.getItem("vsm_guest_wishlist_items");
        const itemsMap: Record<number, any> = storedItems ? JSON.parse(storedItems) : {};
        if (nextState) {
          itemsMap[productId] = {
            id: productId,
            productId,
            name: alt,
            imageUrl: src,
            slug: alt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          };
        } else {
          delete itemsMap[productId];
        }
        localStorage.setItem("vsm_guest_wishlist_items", JSON.stringify(itemsMap));

        fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        }).catch(() => {});
      } catch {}
    }
  };

  // Double pointer/touch handler for iOS/Android & double-click for desktop
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      triggerLikeEffect(e.clientX, e.clientY);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div className={`dt-wrapper w-full ${className}`}>
      {/* Product Image Frame */}
      <motion.div
        ref={photo}
        className="dt-photo relative aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-amber-900/10 bg-white select-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onDoubleClick={(e) => triggerLikeEffect(e.clientX, e.clientY)}
        aria-label="Double tap image to like"
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover transition-transform duration-700 hover:scale-105 pointer-events-none"
          sizes="(min-width: 1024px) 50vw, 100vw"
          draggable={false}
        />

        {/* Custom badges or overlays */}
        {children}

        {/* Heart Bursts */}
        {bursts.map((burst) => (
          <HeartBurst
            key={burst.id}
            {...burst}
            onDone={() =>
              setBursts((current) => current.filter((b) => b.id !== burst.id))
            }
          />
        ))}
      </motion.div>

      {/* Social Like Bar */}
      {showFooter && (
        <div className="dt-footer flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-2xl bg-white/90 border border-amber-900/10 shadow-2xs">
          <motion.button
            ref={likeButton}
            type="button"
            className="dt-like h-9 w-9 flex items-center justify-center rounded-full bg-transparent hover:bg-rose-50 transition cursor-pointer"
            onClick={toggleLiked}
            whileTap={{ scale: 0.85 }}
            transition={ui}
            aria-label={isLiked ? "Unlike" : "Like"}
            aria-pressed={isLiked}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <motion.path
                d={heartPath}
                initial={false}
                animate={{
                  fill: isLiked ? red : "rgba(255, 59, 92, 0)",
                  stroke: isLiked ? red : "#18222e",
                }}
                transition={{ duration: 0.2 }}
                strokeWidth={1.75}
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>

          <div className="dt-count flex items-baseline gap-1 text-xs sm:text-sm font-semibold text-[#18222e] tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isLiked ? "liked" : "unliked"}
                initial={{
                  y: isLiked ? 8 : -8,
                  opacity: 0,
                  filter: "blur(4px)",
                }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: isLiked ? -8 : 8, opacity: 0, filter: "blur(4px)" }}
                transition={ui}
                className="font-bold"
              >
                {likesCount.toLocaleString()}
              </motion.span>
            </AnimatePresence>
            <span className="text-slate-500 font-normal">likes</span>
          </div>

          <span className="dt-hint ml-auto text-[11px] sm:text-xs text-slate-400 font-medium">
            Double tap photo to like ♥
          </span>
        </div>
      )}

      {/* Scoped Styles for Particles & Heart Drop Shadow */}
      <style jsx global>{`
        .dt-photo {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .dt-burst {
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
          z-index: 40;
        }

        .dt-heart {
          opacity: 0;
          transform: scale(0);
          position: absolute;
          left: -48px;
          top: -48px;
          filter: drop-shadow(0 8px 24px rgba(255, 59, 92, 0.45)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
        }

        .dt-particle {
          position: absolute;
          left: -4px;
          top: -4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.9), 0 0 16px rgba(255, 59, 92, 0.6);
        }
      `}</style>
    </div>
  );
}

export default DoubleTapProductImage;
