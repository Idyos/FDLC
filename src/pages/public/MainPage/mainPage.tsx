import PageTitle from "@/components/public/pageTitle";
import PenyaSummary from "@/components/public/penyaSummary";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { PenyaRankingSummary, ProvaSummary as _ProvaSummary } from "@/interfaces/interfaces";
import { getProvesRealTime, getRankingRealTime } from "@/services/dbService";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProvaSummary from "@/components/public/penyaPage/provaSummary";

export default function MainPage() {
  const previousRankingsRef = useRef<PenyaRankingSummary[]>([]);
  const [rankings, setRankings] = useState<PenyaRankingSummary[]>([]);
  const [proves, setProves] = useState<_ProvaSummary[]>([]);
//   const [comunicats, setComunicats] = useState<any[]>([]);
  const { selectedYear: year } = useYear();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const unsubscribeRef = useRef<null | (() => void)>(null);

  const steps = [
    {
      title: "Ranking",
      content: (
        <>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
            <PageTitle title="Ranking" image="" />
            <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
              ) : (
                rankings.map((item, index) => {
                  return <PenyaSummary key={index} rankingInfo={item} />;
                })
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
            <PageTitle title="Proves" image="" />
            <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
              ) : (
                proves.map((item, index) => {
                  return <ProvaSummary key={index} provaSummary={item} />;
                })
              )}
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
        const newData = data.map((item, index) => {
          const newPosition = index + 1;
          const prev = previousRankingsRef.current.find(
            (r) => r.penyaId === item.penyaId
          );
          let direction: "up" | "down" | "same" | null = null;
          if (prev) {
            if (prev.position > newPosition) direction = "up";
            else if (prev.position < newPosition) direction = "down";
            else direction = "same";
          }
          return { ...item, position: newPosition, directionChange: direction };
        });
        previousRankingsRef.current = newData;
        setRankings(newData);
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
      <YearSelector />
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

      {/* <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
        <PageTitle title="Ranking" image="" />
        <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
          {isLoading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
          ) : (
            rankings.map((item, index) => {
              return <PenyaSummary key={index} rankingInfo={item} />;
            })
          )}
        </div>
      </div> */}
    </>
  );
}
