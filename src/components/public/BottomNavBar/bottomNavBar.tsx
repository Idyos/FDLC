import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PILL_VISIBLE_MS = 1500;

export interface BottomNavItem {
  label: string;
  icon: LucideIcon;
}

interface BottomNavBarProps {
  items: BottomNavItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export default function BottomNavBar({ items, activeIndex, onChange, className }: BottomNavBarProps) {
  const [pillIndex, setPillIndex] = useState<number | null>(null);
  const pillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pillTimeoutRef.current) clearTimeout(pillTimeoutRef.current);
  }, []);

  const handleSelect = (index: number) => {
    onChange(index);
    setPillIndex(index);
    if (pillTimeoutRef.current) clearTimeout(pillTimeoutRef.current);
    pillTimeoutRef.current = setTimeout(() => setPillIndex(null), PILL_VISIBLE_MS);
  };

  return (
    <nav
      aria-label="Navegació principal"
      className={cn(
        "relative rounded-full border border-border/50",
        "bg-background/70 dark:bg-background/60",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-lg shadow-black/10",
        className
      )}
    >
      <ul className="flex items-stretch justify-around gap-1 p-1.5">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex-1">
              <button
                type="button"
                onClick={() => handleSelect(index)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className="relative flex w-full flex-col items-center justify-center py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-full"
              >
                <AnimatePresence>
                  {pillIndex === index && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      aria-hidden="true"
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-highlight"
                      className="absolute inset-0 rounded-full bg-foreground/10 dark:bg-white/15"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                <Icon
                  className={cn("relative size-6 transition-colors", isActive ? "text-foreground fill-current" : "text-muted-foreground")}
                  strokeWidth={isActive ? 2.25 : 2}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
