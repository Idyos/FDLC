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
} from "@/components/ui/alert-dialog";
import DynamicList from "@/components/shared/dynamicList";
import LoadingAnimation from "@/components/shared/loadingAnim";
import SingleProvaResult from "@/components/admin/singleProvaResult";
import { useAuth } from "@/routes/admin/AuthContext";
import AdminSingleProvaResult from "@/components/admin/Proves/ProvaPenyaSummary/adminSingleProvaResult";
import { getProvaInfo } from "@/services/database/adminDbServices";

const emptyProva: ProvaInfo = {
    winDirection: "NONE",
    challengeType: "Temps",
    provaId: "",
    name: "",
    startDate: new Date(0),
    pointsRange: [],
    results: [],
};

export default function ProvaPage() {
    const { user } = useAuth();
    const location = useLocation();
    const isAdmin = user !== null && location.pathname.startsWith("/admin");

    const navigate = useNavigate();

    const { previousSelectedYear, selectedYear, setSelectedYear } = useYear();
    
    const [noProvaAlert, setNoProbaAlert] = useState(false);
    

    const [provaInfo, setProvaInfo] = useState<ProvaInfo>(emptyProva);

    const [isProvaLoading, setIsProvaLoading] = useState(true);

    const searchParams = new URLSearchParams(location.search);
    const provaId = searchParams.get("provaId") || "";

  useEffect(() => {
    setIsProvaLoading(true);
    document.title = `Carregant Prova`;

    let unsubscribe: (() => void) | undefined;

    if (isAdmin) {
      getProvaInfo(selectedYear, provaId)
        .then((provaInfoResult) => {
          if (!provaInfoResult) {
            setNoProbaAlert(true);
            return;
          }

          if (provaInfoResult.isSecret) {
            navigate("/");
            return;
          }

          setProvaInfo(provaInfoResult);
          document.title = `${provaInfoResult.name} ${selectedYear} - Admin`;
        })
        .catch((error) => {
          console.error("Error al obtener la prova:", error);
          setNoProbaAlert(true);
        })
        .finally(() => setIsProvaLoading(false));
    } else {
      unsubscribe = getProvaInfoRealTime(selectedYear, provaId, true, (provaInfoResult) => {
        if (provaInfoResult != null) {
          if (provaInfoResult.isSecret) {
            navigate("/");
            return;
          }

          setProvaInfo(provaInfoResult);
          document.title = `${provaInfoResult.name} ${selectedYear}`;
        } else {
          setNoProbaAlert(true);
        }
        setIsProvaLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedYear, isAdmin]);

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

              {isAdmin ? (
              <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-3 w-full">
                  {isProvaLoading ? (
                    <LoadingAnimation />
                  ) : (
                    provaInfo.results.length > 0 ? (
                      provaInfo.results.map((provaResultSummary) => (
                        <AdminSingleProvaResult key={provaResultSummary.penyaId} provaResultSummary={provaResultSummary} />
                      ))
                    ) : (<p>No s'han trobat penyes per a aquesta prova.</p>)
                  )}
                </div>
              ) : (
              <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
                {isProvaLoading ? (
                  <LoadingAnimation />
                ) : (
                  provaInfo.results.length > 0 ? (
                      <DynamicList
                        items={provaInfo.results}
                        renderItem={(provaResultSummary) => (
                          <SingleProvaResult key={provaResultSummary.penyaId} provaResultSummary={provaResultSummary} />
                        )}
                      />
                  ) : (<p>No s'han trobat penyes per a aquesta prova.</p>)
                )}
              </div>
              )}

            </div>
        </>

    );    
}  
