'use client';

import React from 'react';
import Link from 'next/link';

export const STORE_PRODUCT_NAMES: string[] = [
  'Kaju Katli (Royal Silver Foil)',
  'Shahi Gulab Jamun',
  'Kesar Peda',
  'Pure Desi Ghee Mohanthal',
  'Kalol Special Nankhatai',
  'Steamed Nylon Khaman',
  'Bhavnagari Gathiya',
  'Crispy Methi Khakhra',
  'Kaju Kesar Roll',
  'Motichoor Ladoo',
  'Anjeer Dry Fruit Barfi',
  'Farali Chevdo',
  'Flaky Butter Khari',
  'Mathura Peda',
];

export interface ProductListMarqueeProps {
  products?: string[];
  variant?: 'basil' | 'paprika' | 'cream';
  duration?: string;
  separator?: string;
  className?: string;
  linkable?: boolean;
}

export function ProductListMarquee({
  products = STORE_PRODUCT_NAMES,
  variant = 'basil',
  duration = '32s',
  separator = '✳',
  className = '',
  linkable = true,
}: ProductListMarqueeProps) {
  const variantClass =
    variant === 'paprika'
      ? 'bb-marquee--paprika'
      : variant === 'cream'
      ? 'bb-marquee--cream'
      : '';

  return (
    <aside
      className={`bb-marquee ${variantClass} ${className}`.trim()}
      style={{ '--bb-marquee-duration': duration } as React.CSSProperties}
      aria-label="Artisan product catalog list"
    >
      <div className="bb-marquee__track">
        {/* Track 1 */}
        <div className="bb-marquee__group">
          {products.map((name, index) => (
            <span key={`p1-${index}`} className="bb-marquee__item">
              {linkable ? (
                <Link
                  href={`/shop?q=${encodeURIComponent(name.split('(')[0].trim())}`}
                  className="hover:underline transition-opacity hover:opacity-90"
                >
                  {name}
                </Link>
              ) : (
                <span>{name}</span>
              )}
              <i aria-hidden="true">{separator}</i>
            </span>
          ))}
        </div>

        {/* Track 2 (Duplicate for seamless infinite animation) */}
        <div className="bb-marquee__group" aria-hidden="true">
          {products.map((name, index) => (
            <span key={`p2-${index}`} className="bb-marquee__item">
              {linkable ? (
                <Link
                  href={`/shop?q=${encodeURIComponent(name.split('(')[0].trim())}`}
                  className="hover:underline transition-opacity hover:opacity-90"
                  tabIndex={-1}
                >
                  {name}
                </Link>
              ) : (
                <span>{name}</span>
              )}
              <i>{separator}</i>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default ProductListMarquee;
