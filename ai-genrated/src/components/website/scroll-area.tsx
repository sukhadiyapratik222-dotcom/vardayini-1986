"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  type?: string;
}

export function ScrollArea({ children, className, type, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn("overflow-y-auto overflow-x-hidden", className)}
      style={{ scrollbarWidth: "thin" }}
      {...props}
    >
      {children}
    </div>
  );
}
