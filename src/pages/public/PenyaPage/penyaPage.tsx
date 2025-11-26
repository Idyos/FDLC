import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/Contexts/YearContext";
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

    const penyaInfo = useRef<PenyaInfo>(new PenyaInfo());
    const [penyaProves, setPenyaProves] = useState<PenyaProvaSummary[]>([]);

    const [isPenyaLoading, setIsPenyaLoading] = useState(true);


    const [isProvesLoading, setIsProvesLoading] = useState(true);
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const penyaId = searchParams.get("penyaId") || "";

    useEffect(() => {
        setIsPenyaLoading(true);
        setIsProvesLoading(true);

        console.log(penyaId);
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

    const groupedByDay = penyaProves.reduce((acc, prova) => {
        const date = prova.startDate
            ? prova.startDate.toLocaleDateString("ca-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
            })
            : "Data desconeguda";

        if (!acc[date]) acc[date] = [];
        acc[date].push(prova);
        return acc;
    }, {} as Record<string, PenyaProvaSummary[]>);

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
              <div className="flex m-1 p-2 flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isProvesLoading ? (
                <LoadingAnimation />
              ) : (
                penyaProves.length > 0 ? (
                Object.entries(groupedByDay).map(([day, proves]) => (
                    <div key={day} className="w-full">

                    {/* Separador del día */}
                    <div className="flex items-center my-4 w-full text-gray-500 dark:text-gray-400">
                        <div className="flex-grow border-t border-gray-500"></div>
                        <span className="px-4 whitespace-nowrap">
                        {day}
                        </span>
                        <div className="flex-grow border-t border-gray-500"></div>
                    </div>

                    {/* Proves de ese día */}
                    {proves.map((provaSummary) => (
                        <div className="pl-2 pr-2">
                            <ProvaSummaryCard
                            key={provaSummary.id}
                            provaSummary={provaSummary}
                            />
                        </div>
                    ))}
                    </div>
                ))
                ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">
                    Aquesta penya no ha participat en cap prova aquest any.
                </p>
))}
              </div>
            </div>
        </>

    );    
}  
