import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SideNavItem {
  label: string;
  icon: LucideIcon;
}

interface SideNavBarProps {
  items: SideNavItem[];
  activeIndex: number;
  expanded: boolean;
  onChange: (index: number) => void;
}

export default function SideNavBar({ items, activeIndex, expanded, onChange }: SideNavBarProps) {
  return (
    <ul className="flex flex-col gap-4 p-3">
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const Icon = item.icon;
        return (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onChange(index)}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex w-full items-center gap-3 overflow-hidden rounded-full px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="side-nav-highlight"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-foreground/10 dark:bg-white/15"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <Icon
                className={cn(
                  "relative size-6 shrink-0 transition-colors",
                  isActive ? "text-foreground fill-current" : "text-muted-foreground"
                )}
                strokeWidth={isActive ? 2.25 : 2}
              />

              <span
                className={cn(
                  "relative whitespace-nowrap text-sm font-medium transition-opacity duration-150",
                  expanded ? "opacity-100 delay-75" : "opacity-0",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
