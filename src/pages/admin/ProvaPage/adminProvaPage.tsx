import PageTitle from "@/components/public/pageTitle";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { ProvaInfo } from "@/interfaces/interfaces";
import { getProvaInfoRealTime } from "@/services/database/publicDbService";
import { useEffect, useState } from "react";
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
import SingleProvaResultEditable from "@/components/admin/singleProvaResultAdmin";
import SingleProvaResult from "@/components/public/singleProvaResult";
import DynamicList from "@/components/shared/dynamicList";
import { doc } from "firebase/firestore";

const emptyProva: ProvaInfo = {
    winDirection: "NONE",
    challengeType: "Temps",
    provaId: "",
    name: "",
    startDate: new Date(0),
    pointsRange: [],
    results: [],
};

export default function AdminProvaPage() {
    const navigate = useNavigate();

    const { previousSelectedYear, selectedYear, setSelectedYear } = useYear();
    
    const [noProvaAlert, setNoProbaAlert] = useState(false);

    const [provaInfo, setProvaInfo] = useState<ProvaInfo>(emptyProva);

    const [isProvaLoading, setIsProvaLoading] = useState(true);

    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const provaId = searchParams.get("provaId") || "";

    useEffect(() => {
        setIsProvaLoading(true);

        document.title = `Carregant Prova - Admin`;


        const unsubscribe = getProvaInfoRealTime(selectedYear, provaId, true, (penyaInfoResult) => {
            if(penyaInfoResult!=null){
                if(penyaInfoResult.isSecret){
                    navigate("/");
                    return;
                }
                setProvaInfo(penyaInfoResult);
                document.title = `${penyaInfoResult.name} ${selectedYear} - Admin`;
            }
            else {
                setNoProbaAlert(true);
            }
            setIsProvaLoading(false);
        }, );

        return () => unsubscribe();
    }, [selectedYear]);

    return ( 
        <>
        <AlertDialog open={noProvaAlert} onOpenChange={setNoProbaAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>No s'ha trobat aquesta proba.</AlertDialogTitle>
                <AlertDialogDescription>
                    No s'ha trobat cap proba amb el nom de {provaInfo.name} al any {selectedYear}. Si us plau, torna a intentar-ho o contacta amb l'administrador.
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
              <PageTitle title={isProvaLoading ? "Carregant..." : provaInfo.name} image="" />
              <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isProvaLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Carregant...</p>
              ) : (
                provaInfo.results.length > 0 ? (
                    <DynamicList
                      items={provaInfo.results}
                      renderItem={(provaResultSummary) => (
                        provaResultSummary.participates ? (
                          <SingleProvaResultEditable key={provaResultSummary.penyaId} provaResultSummary={provaResultSummary} />
                        ) : null
                      )}
                    />
                ) : (<p>No s'han trobat penyes per a aquesta prova.</p>)
              )}
              </div>
            </div>
        </>

    );    
}  
