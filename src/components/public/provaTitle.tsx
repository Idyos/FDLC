import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ProvaInfoCard from "../shared/Prova/provaInfoCard";
import { Badge } from "../ui/badge";
import { useProvaStore } from "../shared/Contexts/ProvaContext";
import { Navigation } from "lucide-react";
import { Link } from "react-router-dom";
const COLLAPSED_H = 250;
const LONG_PRESS_MS = 200;

export default function ProvaTitle() {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pressTimer = useRef<number | null>(null);
  
  const prova = useProvaStore((state) => state.prova);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedH, setExpandedH] = useState(COLLAPSED_H);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgRatio, setImgRatio] = useState<number | null>(null);

  const isProvaBeingPlayed = (startDate: Date, finishDate?: Date): boolean => {
    const now = new Date();
    if (!startDate) return false;

    const effectiveFinishDate = finishDate
      ? finishDate
      : new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          23,
          59,
          59,
          999
        );

    return now >= startDate && now <= effectiveFinishDate;
  };

const buildTimeInfo = (startDate: Date, finishDate?: Date): string => {
  const now = new Date();

  if (!startDate)
    return "No hi ha data d'inici, és un error. Contacta amb una de les sombres i fes-ho saber.";

  if (startDate.getTime() === new Date(0).getTime()) return "Carregant...";

  if (prova.isFinished) {
    if (finishDate) {
      const diffMs = now.getTime() - finishDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        const hoursLeft = diffHours % 24;
        return `Finalitzada fa ${diffDays} ${diffDays > 1 ? "dies" : "dia"}${
          hoursLeft > 0 ? ` i ${hoursLeft} h` : ""
        }`;
      } else if (diffHours > 0) {
        const minutesLeft = diffMinutes % 60;
        return `Finalitzada fa ${diffHours} h${
          minutesLeft > 0 ? ` i ${minutesLeft} min` : ""
        }`;
      } else if (diffMinutes > 0) {
        return `Finalitzada fa ${diffMinutes} min`;
      } else {
        return "Finalitzada fa menys d’un minut";
      }
    }

    return "Finalitzada";
  }

  const effectiveFinishDate = finishDate
    ? finishDate
    : new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        23,
        59,
        59,
        999
      );

  if (now < startDate) {
    const diffMs = startDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const hoursLeft = diffHours % 24;
      return `Comença en ${diffDays} ${diffDays > 1 ? "dies" : "dia"}${
        hoursLeft > 0 ? ` i ${hoursLeft} h` : ""
      }`;
    } else if (diffHours > 0) {
      return `Comença en ${diffHours} h${
        diffMinutes > 0 ? ` i ${diffMinutes} min` : ""
      }`;
    } else {
      return `Comença en ${diffMinutes} min`;
    }
  }

  if (now >= startDate && now < effectiveFinishDate) {
    const diffMs = effectiveFinishDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const hoursLeft = diffHours % 24;
      return `En curs, finalitza en ${diffDays} ${diffDays > 1 ? "dies" : "dia"}${
        hoursLeft > 0 ? ` i ${hoursLeft} h` : ""
      }`;
    } else if (diffHours > 0) {
      return `En curs, finalitza en ${diffHours} h${
        diffMinutes > 0 ? ` i ${diffMinutes} min` : ""
      }`;
    } else {
      return `En curs, finalitza en ${diffMinutes} min`;
    }
  }

  // 🔚 Si ja ha acabat però no és "isFinished" o sense finishDate
  if (finishDate) {
    const diffMs = now.getTime() - finishDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const hoursLeft = diffHours % 24;
      return `Finalitzada fa ${diffDays} ${diffDays > 1 ? "dies" : "dia"}${
        hoursLeft > 0 ? ` i ${hoursLeft} h.` : "."
      } ${`Falta que es calculin els resultats.`}`;
    } else if (diffHours > 0) {
      const minutesLeft = diffMinutes % 60;
      return `Finalitzada fa ${diffHours} h${
        minutesLeft > 0 ? ` i ${minutesLeft} min.` : "."
      } ${`Falta que es calculin els resultats.`}`;
    } else if (diffMinutes > 0) {
      return `Finalitzada fa ${diffMinutes} min. ${`Falta que es calculin els resultats.`}`;
    } else {
      return `Finalitzada fa menys d’un minut. ${`Falta que es calculin els resultats.`}`;
    }
  }

  return "Finalitzada";
};


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
          {prova.location?.lat && prova.location?.lng && (
            <Badge
              asChild
              variant="secondary"
              className="bg-blue-500 absolute z-10 top-2 left-5 mt-2 w-10 h-10 flex items-center justify-center rounded-full"
            >
              <Link to={`https://www.google.com/maps/dir/?api=1&destination=${prova.location.lat},${prova.location.lng}`} target="_blank" rel="noopener noreferrer">
                <Navigation scale={500} />
              </Link>
            </Badge>
          )}

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
              {isProvaBeingPlayed(prova.startDate, prova.finishDate)}{buildTimeInfo(prova.startDate, prova.finishDate)}
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
