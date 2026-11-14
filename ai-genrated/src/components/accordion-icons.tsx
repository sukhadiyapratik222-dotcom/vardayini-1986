'use client';

import React from 'react';
import Link from 'next/link';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/core/accordion';
import { ChevronUp } from 'lucide-react';

interface CategoryItemConfig {
  id: string;
  label: string;
  href: string;
  icon?: string;
  isSpecial?: boolean;
  description: string;
  subLinks?: { name: string; href: string }[];
}

const CATEGORIES: CategoryItemConfig[] = [
  {
    id: 'all-items',
    label: 'All Items',
    href: '/shop',
    description:
      'Browse our complete artisan menu of traditional mithai, roasted namkeen, fresh bakery items, and exquisite festive gift hampers.',
    subLinks: [
      { name: 'Browse Full Menu', href: '/shop' },
      { name: 'Best Sellers', href: '/shop?sort=popular' },
      { name: 'Pure Ghee Sweets', href: '/shop?group=sweets' },
      { name: 'Gift Hampers', href: '/shop?category=hampers' },
    ],
  },
  {
    id: 'new-launches',
    label: 'New Launches',
    icon: '✨',
    isSpecial: true,
    href: '/new-products',
    description:
      'Explore fresh culinary additions, innovative sweet creations, seasonal delicacies, and limited-edition artisan preparations.',
    subLinks: [
      { name: 'All New Arrivals', href: '/new-products' },
      { name: 'Chef Special Mithai', href: '/new-products' },
      { name: 'Trending Delicacies', href: '/shop?sort=new' },
    ],
  },
  {
    id: 'festive-season',
    label: 'Festive Season',
    icon: '🪔',
    href: '/festivals',
    description:
      'Make your celebrations memorable with curated royal gift boxes, Diwali celebration platters, Rakhi assortments, and puja sweets.',
    subLinks: [
      { name: 'Festive Hampers', href: '/festivals' },
      { name: 'Celebration Sweet Boxes', href: '/festivals' },
      { name: 'Corporate & Bulk Gifting', href: '/festivals' },
    ],
  },
  {
    id: 'sweets',
    label: 'Sweets',
    href: '/shop?group=sweets',
    description:
      'Handcrafted traditional Indian sweets prepared with 100% pure desi ghee, rich mawa, and premium dry fruits.',
    subLinks: [
      { name: 'Kaju Katli & Cashew Delights', href: '/shop?category=kaju-sweets' },
      { name: 'Mawa & Khoya Sweets', href: '/shop?category=mawa-sweets' },
      { name: 'Traditional Penda', href: '/shop?category=penda' },
      { name: 'Sugar-Free Sweets', href: '/shop?category=sugarless-sweets' },
      { name: 'Pure Desi Ghee Mithai', href: '/shop?category=indian-ghee-sweets' },
    ],
  },
  {
    id: 'namkeen-farsan',
    label: 'Namkeen & Farsan',
    href: '/shop?category=namkeen-farsan',
    description:
      'Authentic Gujarati savouries, crisp daily snacks, steaming nylon khaman, bhavnagari gathiya, and crunchy khakhras.',
    subLinks: [
      { name: 'Crispy Khakhra', href: '/shop?category=khakhra' },
      { name: 'Nylon Khaman & Farsan', href: '/shop?category=gujarati' },
      { name: 'Bhavnagari Gathiya & Sev', href: '/shop?category=sev' },
      { name: 'Farali Fasting Snacks', href: '/shop?category=farali' },
      { name: 'Roasted Spiced Mixtures', href: '/shop?category=mixture' },
    ],
  },
  {
    id: 'bakery',
    label: 'Bakery',
    href: '/shop?group=bakery',
    description:
      'Artisanal bakery fresh delights, authentic Kalol nankhatai, melt-in-mouth butter khari, and crispy tea-time rusks.',
    subLinks: [
      { name: 'Kalol Nankhatai', href: '/shop?category=biscuits-and-cookies' },
      { name: 'Flaky Butter Khari', href: '/shop?category=toast-and-khari' },
      { name: 'Artisan Cookies & Biscuits', href: '/shop?category=biscuits-and-cookies' },
    ],
  },
  {
    id: 'stores',
    label: 'Stores',
    href: '/stores',
    description:
      'Visit our physical counter in Kalol (6A, Navjivan Shopping Center) & Rupal. View live timings, directions, and tasting counters.',
    subLinks: [
      { name: 'Kalol Flagship Counter', href: '/stores' },
      { name: 'Rupal Mandir Counter', href: '/stores' },
      { name: 'Store Timings & Contact', href: '/stores' },
    ],
  },
];

interface AccordionIconsProps {
  className?: string;
  onItemClick?: () => void;
}

export function AccordionIcons({ className, onItemClick }: AccordionIconsProps) {
  return (
    <Accordion
      className={`flex w-full flex-col divide-y divide-slate-200 ${className || ''}`}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {CATEGORIES.map((category) => (
        <AccordionItem key={category.id} value={category.id} className='py-2'>
          <AccordionTrigger className='w-full text-left text-slate-900 hover:text-[#0b2f8a] transition-colors py-1'>
            <div className='flex items-center justify-between w-full pr-1'>
              <div className='flex items-center gap-2 font-bold text-sm text-slate-900'>
                {category.isSpecial ? (
                  <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/60 text-[#0b2f8a] text-xs font-bold shadow-xs'>
                    {category.icon && <span>{category.icon}</span>}
                    <span>{category.label}</span>
                  </span>
                ) : (
                  <span className='flex items-center gap-1.5 text-slate-900'>
                    {category.icon && <span>{category.icon}</span>}
                    <span>{category.label}</span>
                  </span>
                )}
              </div>
              <ChevronUp className='h-4 w-4 text-slate-600 transition-transform duration-200 group-data-expanded:-rotate-180 group-data-[expanded]:-rotate-180' />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className='pt-2 pb-1 space-y-2.5'>
              <p className='text-xs leading-relaxed text-slate-600'>
                {category.description}
              </p>

              {category.subLinks && category.subLinks.length > 0 && (
                <div className='flex flex-wrap gap-1.5 pt-1'>
                  {category.subLinks.map((sub) => (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      onClick={onItemClick}
                      className='inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 hover:bg-[#0b2f8a]/10 hover:text-[#0b2f8a] transition-colors'
                    >
                      {sub.name} →
                    </Link>
                  ))}
                </div>
              )}

              <div className='pt-1'>
                <Link
                  href={category.href}
                  onClick={onItemClick}
                  className='inline-flex items-center gap-1 text-xs font-bold text-[#0b2f8a] hover:underline'
                >
                  Explore all in {category.label}
                  <span aria-hidden='true'>→</span>
                </Link>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
