import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BANNER_SRC = {
  slim: "/banners/banner-fluid-slim.html",
  tall: "/banners/banner-fluid-tall.html",
} as const;

// Shown only until the iframe reports its real height (see postMessage handler below).
const BANNER_FALLBACK_HEIGHT_CLASS = {
  slim: "h-[58px]",
  tall: "h-[90px]",
} as const;

const HEIGHT_MESSAGE_TYPE = "eports-banner-height";

interface SponsorBannerProps {
  variant: keyof typeof BANNER_SRC;
  className?: string;
}

export default function SponsorBanner({ variant, className }: SponsorBannerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    setHeight(null);

    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== HEIGHT_MESSAGE_TYPE) return;
      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setHeight(nextHeight);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [variant]);

  return (
    <iframe
      ref={iframeRef}
      src={BANNER_SRC[variant]}
      title="eports internet"
      scrolling="no"
      style={height ? { height } : undefined}
      className={cn(
        "block w-full border-0 rounded-2xl overflow-hidden shadow-lg",
        !height && BANNER_FALLBACK_HEIGHT_CLASS[variant],
        className
      )}
    />
  );
}
