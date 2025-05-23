import PageTitle from "@/components/public/pageTitle";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { PenyaInfo } from "@/interfaces/interfaces";
import { getPenyaInfoRealTime, getPenyaProvesRealTime } from "@/services/dbService";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function PenyaPage() {
    const { selectedYear } = useYear();
    const penyaInfo = useRef<PenyaInfo>({ name: "", description: "", penyaId: "", totalPoints: 0, position: 0 })
    const [isPenyaLoading, setIsPenyaLoading] = useState(true);
    const [isProvesLoading, setIsProvesLoading] = useState(true);
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const penyaId = searchParams.get("penyaId") || "";

    useEffect(() => {
        setIsPenyaLoading(true);
        setIsProvesLoading(true);

        const unsubscribe = getPenyaInfoRealTime(selectedYear, penyaId, (penyaInfoResult) => {
            if(penyaInfoResult!=null){
                penyaInfo.current = penyaInfoResult;
                getPenyaProvesRealTime(selectedYear, penyaId, (data) => {
                    console.log("Proves data:", data, selectedYear);
                    setIsProvesLoading(false);
                });
            }
            setIsPenyaLoading(false);
        });

        return () => unsubscribe();
    }, [selectedYear]);

    return ( 
        <>
            <YearSelector />
            <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
              <PageTitle title={isPenyaLoading ? "Carregant..." : penyaInfo.current.name} image="" />
              <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isProvesLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Carregant...</p>
              ) : (
                <p> JA TENIM LA INFO!!</p>
              )}
              </div>
            </div>
        </>

    );    
}  
