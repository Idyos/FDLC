import PageTitle from "@/components/public/pageTitle";
import PenyaSummary from "@/components/public/penyaSummary";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { getRankingRealTime } from "@/services/database/publicDbService";
import { useEffect, useRef, useState } from "react";
import DynamicList from "@/components/shared/dynamicList";
import LoadingAnimation from "@/components/shared/loadingAnim";
import { PenyaInfo } from "@/interfaces/interfaces";

export default function RankingPage() {
    const previousRankingsRef = useRef<PenyaInfo[]>([]);
    const [rankings, setRankings] = useState<PenyaInfo[]>([]);
    const { selectedYear: year } = useYear();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setIsLoading(true);
    
      const unsubscribe = getRankingRealTime(year, (data) => {
        console.log("Ranking data:", data, year); 
        const newData = data.map((item, index) => {
          const newPosition = index + 1;
          const previousItem = previousRankingsRef.current.find((r) => r.id === item.id);
    
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
                <LoadingAnimation />
              ) : (
                <DynamicList
                  items={rankings}
                  renderItem={(item, index) => (
                    <PenyaSummary key={index} rankingInfo={item} />
                  )}
                  breakIndex={10}
                />
              )}
              </div>
            </div>
        </>
    );
}