import PenyaSummary from "@/components/public/penyaSummary";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { PenyaInfo, PenyaProvaSummary} from "@/interfaces/interfaces";
import { getProves, getRankingRealTime } from "@/services/database/publicDbService";
import { usePenyesCacheStore } from "@/components/shared/Contexts/PenyesCacheContext";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  const [isProvesLoading, setIsProvesLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { favoritePenyes, removeFavoritePenya } = useFavoritePenyes();

  // Which year's proves are already sitting in `proves` — lets the effect
  // below skip re-fetching when the user just switches tabs back and forth.
  const provesLoadedYearRef = useRef<number | null>(null);

  // Same idea for the ranking listener: which year it's currently subscribed
  // to (or null if never subscribed yet), plus the unsubscribe fn itself.
  const rankingSubscribedYearRef = useRef<number | null>(null);
  const rankingUnsubRef = useRef<null | (() => void)>(null);

  const favoriteRankings = rankings.filter((r) => favoritePenyes.some((f) => f.id === r.id));
  const hasFavoritesSection = favoriteRankings.length > 0 && !isRankingLoading;

  const { upcoming: upcomingProves, past: pastProves } = splitProvesByDate(proves);

  // Drop favorites that no longer appear in this year's ranking (e.g. the penya was removed).
  useEffect(() => {
    if (isRankingLoading) return;
    favoritePenyes
      .filter((f) => !rankings.some((r) => r.id === f.id))
      .forEach((f) => removeFavoritePenya(f.id));
  }, [rankings, isRankingLoading, favoritePenyes, removeFavoritePenya]);

  const steps = [
    {
      title: publicNavItems[0].label,
      icon: publicNavItems[0].icon,
      content: (
        <>
          <div className="flex-1 flex flex-col rounded-4xl mt-4">
            <div className="flex-1 md:p-6 p-3 flex flex-col items-center justify-start bg-background rounded-4xl dark:shadow-[0px_0px_30px_0px_#ffffff50] shadow-[0px_0px_30px_0px_#00000050]">
              {isRankingLoading ? (
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
                              {favoriteRankings.map((item, index) => (
                                <PenyaSummary key={item.id} rankingInfo={item} index={index} />
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
                        <PenyaSummary key={index} rankingInfo={item} index={index} />
                      )}
                      renderGridItem={(item, index) => (
                        <PenyaSummaryGrid key={index} rankingInfo={item} index={index} />
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
              {isProvesLoading ? (
                <LoadingAnimation />
              ) : (
                proves.length > 0 ? (
                <>
                  {upcomingProves.map((item, index) => (
                    <ProvaSummaryCard key={`upcoming-${index}`} provaSummary={item} index={index} />
                  ))}
                  {pastProves.length > 0 && (
                    <>
                      {upcomingProves.length > 0 && (
                        <p className="w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Proves realitzades
                        </p>
                      )}
                      {pastProves.map((item, index) => (
                        <ProvaSummaryCard key={`past-${index}`} provaSummary={item} index={index} />
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

  // Tab title only — no data fetching here, so switching tabs never triggers a read.
  useEffect(() => {
    document.title = selectedTab === 0 ? `Ranking ${year}` : `Proves ${year}`;
  }, [selectedTab, year]);

  // Opens the ranking listener for `yr` unless it's already open for that
  // exact year — safe to call as many times as React (or StrictMode) wants.
  const ensureRankingSubscription = useCallback((yr: number) => {
    if (rankingSubscribedYearRef.current === yr) return;

    rankingUnsubRef.current?.();
    rankingSubscribedYearRef.current = yr;
    setIsRankingLoading(true);
    rankingUnsubRef.current = getRankingRealTime(yr, (data) => {
      previousRankingsRef.current = data;
      setRankings(data);
      setIsRankingLoading(false);
      usePenyesCacheStore.getState().setPenyes(yr, data);
    });
  }, []);

  // Lazy: only opens the listener the first time the Ranking tab is visited.
  // Switching away and back is a no-op (the guard above), so it stays alive
  // across tab switches instead of being torn down and reopened.
  useEffect(() => {
    if (selectedTab === 0) ensureRankingSubscription(year);
  }, [selectedTab, year, ensureRankingSubscription]);

  // The only place that actually tears the listener down: real unmount. It
  // also clears the "subscribed" marker in the same tick as the teardown —
  // that's what keeps StrictMode's dev-only mount→cleanup→mount dance safe:
  // if it fires this cleanup, the marker and the live listener go out of
  // sync together, so the next mount pass correctly sees "not subscribed"
  // and reopens it, instead of skipping re-subscription and getting stuck
  // in the loading state forever.
  useEffect(() => {
    return () => {
      rankingUnsubRef.current?.();
      rankingUnsubRef.current = null;
      rankingSubscribedYearRef.current = null;
    };
  }, []);

  // Proves: one-shot fetch, but lazy (only once the tab is first visited) and
  // cached in memory per year — switching back to this tab afterwards reuses
  // what's already loaded instead of re-reading the whole collection.
  useEffect(() => {
    if (selectedTab !== 1 || provesLoadedYearRef.current === year) return;

    setIsProvesLoading(true);
    let cancelled = false;

    getProves(year).then((data) => {
      if (cancelled) return;
      setProves(data);
      provesLoadedYearRef.current = year;
      setIsProvesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedTab, year]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="md:px-0 px-3">
        <SponsorBanner variant="tall" className="mt-4" />
      </div>
      <AnimatePresence mode="wait">
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
