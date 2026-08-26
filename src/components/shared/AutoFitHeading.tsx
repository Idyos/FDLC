import { useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AutoFitHeadingProps {
  children: ReactNode;
  as?: ElementType;
  /** Typography classes for the heading itself, e.g. responsive base size + weight. */
  className?: string;
  /** Layout classes for the measuring wrapper, e.g. max-width, margin, z-index. */
  containerClassName?: string;
  /** Never shrink below this size, even if a word still doesn't fit. */
  minFontSizePx?: number;
}

/**
 * Heading that wraps by whole words and only shrinks its font size when a
 * single word is too wide to fit on its own line at the CSS-defined size.
 * Avoids mid-word breaks (e.g. "Penyaoli\nmpiades") on narrow screens.
 */
export default function AutoFitHeading({
  children,
  as = "h1",
  className,
  containerClassName,
  minFontSizePx = 16,
}: AutoFitHeadingProps) {
  const Tag = as;
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const heading = headingRef.current;
    if (!container || !heading) return;

    const fit = () => {
      // Reset to the CSS-defined size so we re-measure fresh at the current breakpoint.
      heading.style.fontSize = "";
      const baseSize = parseFloat(getComputedStyle(heading).fontSize);
      let size = baseSize;

      heading.style.fontSize = `${size}px`;
      while (size > minFontSizePx && heading.scrollWidth > container.clientWidth) {
        size -= 1;
        heading.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children, minFontSizePx]);

  return (
    <div ref={containerRef} className={cn("min-w-0", containerClassName)}>
      <Tag
        ref={headingRef}
        className={className}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          overflowWrap: "normal",
          wordBreak: "normal",
        }}
      >
        {children}
      </Tag>
    </div>
  );
}
