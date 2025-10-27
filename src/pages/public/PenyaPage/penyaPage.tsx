import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { PenyaInfo, PenyaProvaSummary } from "@/interfaces/interfaces";
import { getPenyaInfoRealTime, getPenyaProvesRealTime } from "@/services/database/publicDbService";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ProvaSummaryCard from "@/components/public/provaSummary";
import LoadingAnimation from "@/components/shared/loadingAnim";
import PenyaTitle from "@/components/public/penyaTitle";

export default function PenyaPage() {
    const navigate = useNavigate();

    const { previousSelectedYear, selectedYear, setSelectedYear } = useYear();
    
    const [noPenyaAlert, setNoPenyaAlert] = useState(false);

    const penyaInfo = useRef<PenyaInfo>({ name: "", description: "", penyaId: "", totalPoints: 0, position: 0 })
    const [penyaProves, setPenyaProves] = useState<PenyaProvaSummary[]>([]);

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
                if(penyaInfoResult.isSecret){
                    navigate("/");
                    return;
                }

                penyaInfo.current = penyaInfoResult;
                document.title = `${penyaInfo.current.name} ${selectedYear}`;

                getPenyaProvesRealTime(selectedYear, penyaId, (data) => {
                    setPenyaProves(data);
                    setIsProvesLoading(false);
                });
            }
            else {
                setNoPenyaAlert(true);
            }
            setIsPenyaLoading(false);
        }, );

        return () => unsubscribe();
    }, [selectedYear]);

    return ( 
        <>
        <AlertDialog open={noPenyaAlert} onOpenChange={setNoPenyaAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>No s'ha trobat aquesta penya.</AlertDialogTitle>
                <AlertDialogDescription>
                    No s'ha trobat cap penya amb el nom de {penyaInfo.current.name} al any {selectedYear}. Si us plau, torna a intentar-ho o contacta amb l'administrador.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>D'acord</AlertDialogCancel>
                {selectedYear == previousSelectedYear ? null : <AlertDialogAction onClick={() => setSelectedYear(previousSelectedYear)}>Tornar a l'any anterior</AlertDialogAction>}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
            <YearSelector />
            <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
                {isPenyaLoading ? <LoadingAnimation /> : <PenyaTitle {...penyaInfo.current} />}
              <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isProvesLoading ? (
                <LoadingAnimation />
              ) : (
                penyaProves.length > 0 ? (
                    penyaProves.map((provaSummary) => (
                      <ProvaSummaryCard key={provaSummary.provaId} provaSummary={provaSummary} />
                    ))
                ) : (<p>No s'han trobat proves per a aquesta penya.</p>)
              )}
              </div>
            </div>
        </>

    );    
}  
