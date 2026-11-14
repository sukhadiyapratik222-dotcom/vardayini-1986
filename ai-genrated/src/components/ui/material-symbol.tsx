"use client";

import React from "react";

export interface MaterialSymbolProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  fill?: boolean;
  size?: number | string;
  weight?: number;
  className?: string;
}

/**
 * Official Google Fonts Material Symbols & Icons wrapper
 * @see https://fonts.google.com/icons
 */
export function MaterialSymbol({
  name,
  fill = false,
  size,
  weight = 400,
  className = "",
  style,
  ...rest
}: MaterialSymbolProps) {
  const customStyles: React.CSSProperties = {
    fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    fontSize: size ? (typeof size === "number" ? `${size}px` : size) : undefined,
    ...style,
  };

  return (
    <span
      className={`material-symbols-outlined select-none inline-flex items-center justify-center leading-none ${className}`}
      style={customStyles}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}
