import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ProvaInfo } from "@/interfaces/interfaces";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ProvaInfoCard from "../shared/Prova/provaInfoCard";
import { Badge } from "../ui/badge";
const COLLAPSED_H = 250;
const LONG_PRESS_MS = 200;

interface ProvaInfoTitleProps {
  prova: ProvaInfo;
}

export default function ProvaTitle({ prova }: ProvaInfoTitleProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pressTimer = useRef<number | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      controls.start({
        height: expandedH * 0.9,
        transition: { duration: 1, ease: "backInOut" },
      });
    }
  };
  const collapse = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (isExpanded) {
      setIsExpanded(false);
      controls.start({
        height: COLLAPSED_H,
        transition: { duration: 1, ease: "backInOut" },
      });
    } else {
      controls.start({ height: COLLAPSED_H });
    }
  };

  // 5) Long-press (retardo antes de expandir)
  const onPressStart = () => {
    if (prova.imageUrl === undefined || prova.imageUrl.length === 0) return;

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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild onClick={() => setIsDialogOpen(true)}>
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
          <Badge
            variant="secondary"
            className="absolute z-10 top-2 right-5 mt-2 text-sm font-medium rounded-4xl"
          >
            {prova.challengeType}
          </Badge>
          <Badge
            variant="secondary"
            className="absolute z-10 bottom-2 right-5 mt-2 text-sm font-medium rounded-4xl"
          >
            {prova.startDate.toLocaleDateString()} |{" "}
            {prova.startDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {prova.finishDate
              ? prova.startDate.toLocaleDateString() ==
                prova.finishDate.toLocaleDateString()
                ? " - " +
                  prova.finishDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ` – ${prova.finishDate.toLocaleDateString()} | ${prova.finishDate.toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  )}`
              : ""}
          </Badge>
            <h1 className="text-5xl font-extrabold z-10 mb-0">{prova.name}</h1>

            {prova.description?.length ? (
              <h3 className="z-10 italic mb-0">"{prova.description}"</h3>
            ) : null}

            {prova.imageUrl?.length ? (
              <>
                <img
                  ref={imgRef}
                  src={prova.imageUrl}
                  alt={prova.name}
                  onLoad={handleImgLoad}
                  className="absolute inset-0 w-full h-full rounded-2xl object-cover"
                />
                <div className="absolute inset-0 dark:bg-black/50 bg-white/40" />
              </>
            ) : null}
          
        </motion.div>
        </DialogTrigger>
        <DialogContent className="p-0 ">
          <ProvaInfoCard prova={prova} />
        </DialogContent>
    </Dialog>
  );
}
