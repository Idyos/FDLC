import PageTitle from "@/components/public/pageTitle";
import PenyaSummary from "@/components/public/penyaSummary";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { PenyaRankingSummary } from "@/interfaces/interfaces";
import { getRankingRealTime } from "@/services/dbService";
import { useEffect, useRef, useState } from "react";

export default function RankingPage() {
    const previousRankingsRef = useRef<PenyaRankingSummary[]>([]);
    const [rankings, setRankings] = useState<PenyaRankingSummary[]>([]);
    const { selectedYear: year } = useYear();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setIsLoading(true);
    
      const unsubscribe = getRankingRealTime(year, (data) => {
        console.log("Ranking data:", data, year); 
        const newData = data.map((item, index) => {
          const newPosition = index + 1;
          const previousItem = previousRankingsRef.current.find((r) => r.penyaId === item.penyaId);
    
          let direction: "up" | "down" | "same" | null = null;
          if (previousItem) {
            if (previousItem.position > newPosition) direction = "up";
            else if (previousItem.position < newPosition) direction = "down";
            else direction = "same";
          }
    
          return {
            ...item,
            position: newPosition,
            directionChange: direction,
          };
        });
    
        previousRankingsRef.current = newData;
    
        setRankings(newData);
        setIsLoading(false);
      });
    
      return () => unsubscribe();
    }, [year]);
    
    return (
        <>
            <YearSelector />
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
    );
}