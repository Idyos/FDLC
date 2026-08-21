import PenyaSummary from "@/components/public/penyaSummary";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { PenyaInfo, PenyaProvaSummary} from "@/interfaces/interfaces";
import { getProves, getRankingRealTime } from "@/services/database/publicDbService";
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
          <div className="flex-1 flex flex-col bg-gray-100 dark:bg-neutral-900 rounded-4xl shadow-lg mt-4">
            <div className="flex-1 p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
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
                          {favoriteRankings.map((item) => (
                            <PenyaSummary key={item.id} rankingInfo={item} />
                          ))}
                        </div>
                        <Separator className="my-3" />
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
          <div className="flex-1 flex flex-col bg-gray-100 dark:bg-neutral-900 rounded-4xl shadow-lg mt-4">
            <div className="flex-1 p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isLoading ? (
                <LoadingAnimation />
              ) : (
                proves.length > 0 ? (
                proves.map((item, index) => {
                  return <ProvaSummaryCard key={index} provaSummary={item} />;
                })
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

    //Ranking — kept real-time: cheap (bounded by nº de penyes) and it's the
    // one public screen where seeing the standings move live has real value.
    if (selectedTab === 0) {
      document.title = `Ranking ${year}`;

      const unsubscribe = getRankingRealTime(year, (data) => {
        previousRankingsRef.current = data;
        setRankings(data);
        setIsLoading(false);
      });
      unsubscribeRef.current = unsubscribe;
    }
    //Proves — just a schedule/list, the live detail lives in ProvaPage.
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
    <div className="p-2 flex-1 flex flex-col min-h-screen">
      <SponsorBanner variant="tall" className="mt-4" />
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
