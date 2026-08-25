import PenyaSummary from "@/components/public/penyaSummary";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { PenyaInfo, PenyaProvaSummary} from "@/interfaces/interfaces";
import { getProves, getRankingRealTime } from "@/services/database/publicDbService";
import { usePenyesCacheStore } from "@/components/shared/Contexts/PenyesCacheContext";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProvaSummaryCard from "@/components/public/provaSummary";
import DynamicList from "@/components/shared/dynamicList";
import PenyaSummaryGrid from "@/components/public/penyaSummaryGrid";
import LoadingAnimation from "@/components/shared/loadingAnim";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { Separator } from "@/components/ui/separator";
import { publicNavItems } from "@/components/public/BottomNavBar/publicNavItems";
import SponsorBanner from "@/components/public/sponsorBanner";
import { splitProvesByDate } from "@/utils/sorting";

export default function MainPage() {
  const previousRankingsRef = useRef<PenyaInfo[]>([]);
  const [rankings, setRankings] = useState<PenyaInfo[]>([]);
  const [proves, setProves] = useState<PenyaProvaSummary[]>([]);
  const { selectedYear: year } = useYear();
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { favoritePenyes, removeFavoritePenya } = useFavoritePenyes();

  const unsubscribeRef = useRef<null | (() => void)>(null);

  const favoriteRankings = rankings.filter((r) => favoritePenyes.some((f) => f.id === r.id));
  const hasFavoritesSection = favoriteRankings.length > 0 && !isLoading;

  const { upcoming: upcomingProves, past: pastProves } = splitProvesByDate(proves);

  // Drop favorites that no longer appear in this year's ranking (e.g. the penya was removed).
  useEffect(() => {
    if (isLoading) return;
    favoritePenyes
      .filter((f) => !rankings.some((r) => r.id === f.id))
      .forEach((f) => removeFavoritePenya(f.id));
  }, [rankings, isLoading, favoritePenyes, removeFavoritePenya]);

  const steps = [
    {
      title: publicNavItems[0].label,
      icon: publicNavItems[0].icon,
      content: (
        <>
          <div className="flex-1 flex flex-col rounded-4xl mt-4">
            <div className="flex-1 md:p-6 p-3 flex flex-col items-center justify-start bg-background rounded-4xl dark:shadow-[0px_0px_30px_0px_#ffffff50] shadow-[0px_0px_30px_0px_#00000050]">
              {isLoading ? (
                <LoadingAnimation />
              ) : (
                rankings.length > 0 ? (
                  <>
                    {hasFavoritesSection && (
                      <>
                        <div className="w-full">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                            Les teves penyes
                            </p>
                            <div className="flex flex-col gap-3 md:gap-6">
                              {favoriteRankings.map((item) => (
                                <PenyaSummary key={item.id} rankingInfo={item} />
                              ))}
                            </div>
                        </div>
                          <Separator className="mt-3" />
                          <Separator />
                          <Separator className="mb-3" />
                      </>
                    )}
                    <DynamicList
                      items={rankings}
                      renderItem={(item, index) => (
                        <PenyaSummary key={index} rankingInfo={item} />
                      )}
                      renderGridItem={(item, index) => (
                        <PenyaSummaryGrid key={index} rankingInfo={item} />
                      )}
                      breakIndex={10}
                    />
                  </>
                ) : (
                  <p className="text-neutral-500 dark:text-neutral-400">{year === new Date().getFullYear() ? "Encara no hi han penyes afegides per aquest any." : `No s'han afegit penyes per a l'any ${year}.`}</p>
                )
              )}
            </div>
          </div>
        </>
      ),
    },
    {
      title: publicNavItems[1].label,
      icon: publicNavItems[1].icon,
      content: (
        <>
          <div className="flex-1 flex flex-col rounded-4xl mt-4">
            <div className="flex-1 md:p-6 p-3 gap-3 md:gap-6 flex flex-col items-center justify-start bg-background rounded-4xl dark:shadow-[0px_0px_30px_0px_#ffffff50] shadow-[0px_0px_30px_0px_#00000050]">
              {isLoading ? (
                <LoadingAnimation />
              ) : (
                proves.length > 0 ? (
                <>
                  {upcomingProves.map((item, index) => (
                    <ProvaSummaryCard key={`upcoming-${index}`} provaSummary={item} />
                  ))}
                  {pastProves.length > 0 && (
                    <>
                      {upcomingProves.length > 0 && (
                        <p className="w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Proves realitzades
                        </p>
                      )}
                      {pastProves.map((item, index) => (
                        <ProvaSummaryCard key={`past-${index}`} provaSummary={item} />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <p className="text-neutral-500 dark:text-neutral-400">{year === new Date().getFullYear() ? "Encara no hi han proves afegides per aquest any." : `No s'han afegit proves per a l'any ${year}.`}</p>
              ))}
            </div>
          </div>
        </>
      ),
    },
  ];

  const rawTab = Number(searchParams.get("tab") ?? 0);
  const selectedTab = Number.isNaN(rawTab) ? 0 : Math.min(Math.max(rawTab, 0), steps.length - 1);
  

  useEffect(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setIsLoading(true);

    if (selectedTab === 0) {
      document.title = `Ranking ${year}`;

      const unsubscribe = getRankingRealTime(year, (data) => {
        previousRankingsRef.current = data;
        setRankings(data);
        setIsLoading(false);
        usePenyesCacheStore.getState().setPenyes(year, data);
      });
      unsubscribeRef.current = unsubscribe;
    }
    else if (selectedTab === 1) {
      document.title = `Proves ${year}`;
      let cancelled = false;
      getProves(year).then((data) => {
        if (cancelled) return;
        setProves(data);
        setIsLoading(false);
      });
      unsubscribeRef.current = () => { cancelled = true; };
    }

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [selectedTab, year]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="md:px-0 px-3">
        <SponsorBanner variant="tall" className="mt-4" />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="space-y-4 flex-1 flex flex-col"
          key={selectedTab}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          {steps[selectedTab].content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
