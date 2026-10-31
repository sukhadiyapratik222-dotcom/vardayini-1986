'use client';

import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence, Transition } from 'motion/react';
import { cn } from '@/lib/utils';

type AccordionContextType = {
  expandedValue: React.Key | React.Key[] | null;
  toggleItem: (value: React.Key) => void;
  variants?: {
    expanded: { height: string | number; opacity: number };
    collapsed: { height: string | number; opacity: number };
  };
  transition?: Transition;
};

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('useAccordion must be used within an Accordion component');
  }
  return context;
}

type AccordionItemContextType = {
  value: React.Key;
  isExpanded: boolean;
};

const AccordionItemContext = createContext<AccordionItemContextType | undefined>(undefined);

function useAccordionItem() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('useAccordionItem must be used within an AccordionItem component');
  }
  return context;
}

export type AccordionProps = {
  children: React.ReactNode;
  multiple?: boolean;
  defaultValue?: React.Key | React.Key[] | null;
  value?: React.Key | React.Key[] | null;
  onValueChange?: (value: React.Key | React.Key[] | null) => void;
  className?: string;
  transition?: Transition;
  variants?: {
    expanded: { height: string | number; opacity: number };
    collapsed: { height: string | number; opacity: number };
  };
};

export function Accordion({
  children,
  multiple = false,
  defaultValue = null,
  value,
  onValueChange,
  className,
  transition = { duration: 0.2, ease: 'easeInOut' },
  variants = {
    expanded: { height: 'auto', opacity: 1 },
    collapsed: { height: 0, opacity: 0 },
  },
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<React.Key | React.Key[] | null>(
    defaultValue ?? (multiple ? [] : null)
  );

  const expandedValue = value !== undefined ? value : internalValue;

  const toggleItem = (itemValue: React.Key) => {
    let newValue: React.Key | React.Key[] | null;
    if (multiple) {
      const arr = Array.isArray(expandedValue) ? [...expandedValue] : [];
      const index = arr.indexOf(itemValue);
      if (index > -1) {
        arr.splice(index, 1);
      } else {
        arr.push(itemValue);
      }
      newValue = arr;
    } else {
      newValue = expandedValue === itemValue ? null : itemValue;
    }

    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <AccordionContext.Provider
      value={{
        expandedValue,
        toggleItem,
        variants,
        transition,
      }}
    >
      <div className={cn('relative', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = {
  value: React.Key;
  children: React.ReactNode;
  className?: string;
};

export function AccordionItem({
  value,
  children,
  className,
}: AccordionItemProps) {
  const { expandedValue } = useAccordion();
  const isExpanded = Array.isArray(expandedValue)
    ? expandedValue.includes(value)
    : expandedValue === value;

  return (
    <AccordionItemContext.Provider value={{ value, isExpanded }}>
      <div
        className={cn('overflow-hidden', className)}
        data-expanded={isExpanded ? '' : undefined}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export type AccordionTriggerProps = {
  children: React.ReactNode;
  className?: string;
};

export function AccordionTrigger({
  children,
  className,
}: AccordionTriggerProps) {
  const { toggleItem } = useAccordion();
  const { value, isExpanded } = useAccordionItem();

  return (
    <button
      type='button'
      aria-expanded={isExpanded}
      data-expanded={isExpanded ? '' : undefined}
      className={cn(
        'group flex w-full items-center justify-between text-left font-medium transition-all cursor-pointer',
        className
      )}
      onClick={() => toggleItem(value)}
    >
      {children}
    </button>
  );
}

export type AccordionContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function AccordionContent({
  children,
  className,
}: AccordionContentProps) {
  const { isExpanded } = useAccordionItem();
  const { variants, transition } = useAccordion();

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial='collapsed'
          animate='expanded'
          exit='collapsed'
          variants={variants}
          transition={transition}
          className='overflow-hidden'
        >
          <div className={cn('pt-0 pb-3', className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
