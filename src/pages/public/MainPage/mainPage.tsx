import PenyaSummary from "@/components/public/penyaSummary";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { PenyaInfo, PenyaProvaSummary} from "@/interfaces/interfaces";
import { getProvesRealTime, getRankingRealTime } from "@/services/database/publicDbService";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProvaSummaryCard from "@/components/public/provaSummary";
import DynamicList from "@/components/shared/dynamicList";
import PenyaSummaryGrid from "@/components/public/penyaSummaryGrid";
import LoadingAnimation from "@/components/shared/loadingAnim";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { Separator } from "@/components/ui/separator";

export default function MainPage() {
  const previousRankingsRef = useRef<PenyaInfo[]>([]);
  const [rankings, setRankings] = useState<PenyaInfo[]>([]);
  const [proves, setProves] = useState<PenyaProvaSummary[]>([]);
  const { selectedYear: year } = useYear();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const { favoritePenyes } = useFavoritePenyes();

  const unsubscribeRef = useRef<null | (() => void)>(null);

  const favoriteRankings = rankings.filter((r) => favoritePenyes.some((f) => f.id === r.id));
  const missingFavorites = favoritePenyes.filter((f) => !rankings.some((r) => r.id === f.id));
  const hasFavoritesSection = favoritePenyes.length > 0 && !isLoading;

  const steps = [
    {
      title: "Ranking",
      content: (
        <>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
            <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
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
                          {missingFavorites.map((f) => (
                            <p key={f.id} className="text-sm text-muted-foreground italic px-1 py-1">
                              {f.name} no té dades per a l'any {year}
                            </p>
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
                  <p className="text-gray-500 dark:text-gray-400">{year === new Date().getFullYear() ? "Encara no hi han penyes afegides per aquest any." : `No s'han afegit penyes per a l'any ${year}.`}</p>
                )
              )}
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Proves",
      content: (
        <>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
            <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isLoading ? (
                <LoadingAnimation />
              ) : (
                proves.length > 0 ? (
                proves.map((item, index) => {
                  return <ProvaSummaryCard key={index} provaSummary={item} />;
                })
              ) : (
                <p className="text-gray-500 dark:text-gray-400">{year === new Date().getFullYear() ? "Encara no hi han proves afegides per aquest any." : `No s'han afegit proves per a l'any ${year}.`}</p>
              ))}
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Comunicats",
      content: (
        <>
          <p>Pàgina de comunicats</p>
        </>
      ),
    },
  ];

  useEffect(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setIsLoading(true);

    //Ranking
    if (selectedTab === 0) {
      document.title = `Ranking ${year}`;

      const unsubscribe = getRankingRealTime(year, (data) => {
        previousRankingsRef.current = data;
        setRankings(data);
        setIsLoading(false);
      });
      unsubscribeRef.current = unsubscribe;
    }
    //Proves
    else if (selectedTab === 1) {
      document.title = `Proves ${year}`;
      const unsubscribe = getProvesRealTime(year, (data) => {
        setProves(data);
        setIsLoading(false);
      });
      unsubscribeRef.current = unsubscribe;
    }
    //Comunicats
    else if(selectedTab === 2) {
      document.title = `Comunicats ${year}`;
    }

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [selectedTab, year]);

  return (
    <>
      <Tabs
        defaultValue={steps[0].title}
        value={steps[selectedTab].title}
        className="w-full mt-4"
      >
        <TabsList className="rounded-3xl w-full mb-4 pl-1 pr-1">
          {steps.map((step, index) => (
            <TabsTrigger
              className="rounded-2xl"
              key={index}
              value={step.title}
              onClick={() => setSelectedTab(index)}
            >
              {step.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="space-y-4"
          key={selectedTab}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          {steps[selectedTab].content}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
