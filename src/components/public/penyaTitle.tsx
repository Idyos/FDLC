import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PenyaInfo } from "@/interfaces/interfaces";

const COLLAPSED_H = 250;
const LONG_PRESS_MS = 200;

export default function PenyaTitle(penyaInfo: PenyaInfo) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pressTimer = useRef<number | null>(null);

  const [expandedH, setExpandedH] = useState(COLLAPSED_H);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgRatio, setImgRatio] = useState<number | null>(null);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImgRatio(img.naturalHeight / img.naturalWidth);
    }
  };

  const recalcExpandedHeight = () => {
    const el = containerRef.current;
    if (!el || !imgRatio) return;
    const w = el.clientWidth;
    const target = Math.round(w * imgRatio);
    setExpandedH(Math.max(target, COLLAPSED_H));
  };

  useEffect(() => {
    recalcExpandedHeight();
  }, [imgRatio]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => recalcExpandedHeight());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const expand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      controls.start({ height: expandedH * 0.9, transition: { duration: 1, ease: "backInOut" } });
    }
  };
  const collapse = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (isExpanded) {
      setIsExpanded(false);
      controls.start({ height: COLLAPSED_H, transition: { duration: 1, ease: "backInOut" } });
    } else {
      controls.start({ height: COLLAPSED_H });
    }
  };

  // 5) Long-press (retardo antes de expandir)
  const onPressStart = () => {
    if (penyaInfo.imageUrl === undefined || penyaInfo.imageUrl.length === 0) return;

    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      expand();
      pressTimer.current = null;
    }, LONG_PRESS_MS);
  };
  
  const onPressEnd = () => collapse();

  // 6) Accesibilidad teclado (mantener espacio/enter)
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!pressTimer.current) onPressStart();
    }
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onPressEnd();
    }
  };

  return (
    <motion.div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-pressed={isExpanded}
      initial={{ height: COLLAPSED_H }}
      animate={controls}
      onPointerDown={onPressStart}
      onPointerUp={onPressEnd}
      onPointerCancel={onPressEnd}
      onPointerLeave={onPressEnd}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className="min-h-[250px] relative border-gray-900 dark:border-gray-100 border-4 rounded-4xl flex flex-col justify-center space-y-4 mb-4 p-12 overflow-hidden select-none cursor-pointer"
    >
      <h1 className="text-5xl font-extrabold z-10 mb-0">{penyaInfo.name}</h1>

      {penyaInfo.description?.length ? (
        <h3 className="z-10 italic mb-0">"{penyaInfo.description}"</h3>
      ) : null}

      {penyaInfo.imageUrl?.length ? (
        <>
          <img
            ref={imgRef}
            src={penyaInfo.imageUrl}
            alt={penyaInfo.name}
            onLoad={handleImgLoad}
            // Cover cuando está colapsado (fondo bonito), Contain cuando está expandido (ver imagen completa)
            className={`absolute inset-0 w-full h-full rounded-2xl object-cover`}
          />
        <div className="absolute inset-0 dark:bg-black/50 bg-white/40" />

        </>
      ) : null}
    </motion.div>
  );
}
