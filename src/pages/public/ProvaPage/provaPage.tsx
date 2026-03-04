import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/Contexts/YearContext";
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
import SingleProvaResult from "@/components/shared/PenyaProvaResults/singleProvaResult";
import AdminSingleProvaResult from "@/components/admin/Proves/ProvaPenyaSummary/adminSingleProvaResult";
import { getProvaInfo } from "@/services/database/Admin/adminDbServices";
import ProvaTitle from "@/components/public/provaTitle";
import { useProvaStore } from "@/components/shared/Contexts/ProvaContext";
import AdminFooter from "@/components/admin/Proves/Footer/adminFooter";
import { EmptyProva, ParticipatingPenya, Prova } from "@/interfaces/interfaces";
import { isAdmin } from "@/services/authService";
import SingleProvaResultGrid from "@/components/shared/PenyaProvaResults/singleProvaResultGrid";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import AdminHoraris from "@/components/admin/Proves/Horaris/adminHoraris";
import PublicHoraris from "@/components/public/Horaris/publicHoraris";

function computeSlotStatuses(
  penyes: ParticipatingPenya[],
  intervalMinutes: number,
  maxPenyesPerSlot: number,
  startDate: Date
): Record<string, 'ok' | 'overflow'> {
  const groups: Record<number, string[]> = {};
  penyes.forEach((p) => {
    if (!p.participationTime) return;
    const diffMins = (p.participationTime.getTime() - startDate.getTime()) / 60000;
    const slot = Math.floor(diffMins / intervalMinutes);
    (groups[slot] ??= []).push(p.penyaId);
  });
  const out: Record<string, 'ok' | 'overflow'> = {};
  Object.values(groups).forEach((group) => {
    const status = group.length > maxPenyesPerSlot ? 'overflow' : 'ok';
    group.forEach((id) => (out[id] = status));
  });
  return out;
}

type SortMode = "name-asc" | "name-desc" | "result-asc" | "result-desc" | "time-asc" | "time-desc";

function sortPenyes(penyes: ParticipatingPenya[], mode: SortMode): ParticipatingPenya[] {
  return [...penyes].sort((a, b) => {
    switch (mode) {
      case "name-asc":  return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "result-asc":  return (a.result ?? 0) - (b.result ?? 0);
      case "result-desc": return (b.result ?? 0) - (a.result ?? 0);
      case "time-asc": {
        if (!a.participationTime && !b.participationTime) return 0;
        if (!a.participationTime) return 1;
        if (!b.participationTime) return -1;
        return a.participationTime.getTime() - b.participationTime.getTime();
      }
      case "time-desc": {
        if (!a.participationTime && !b.participationTime) return 0;
        if (!a.participationTime) return 1;
        if (!b.participationTime) return -1;
        return b.participationTime.getTime() - a.participationTime.getTime();
      }
    }
  });
}

function SortSelector({ provaInfo, sortMode, setSortMode }: {
  provaInfo: Prova;
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
}) {
  return (
    <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name-asc">Nom A→Z</SelectItem>
        <SelectItem value="name-desc">Nom Z→A</SelectItem>
        {provaInfo.challengeType !== "Participació" && (
          <>
            <SelectItem value="result-asc">Resultat ↑</SelectItem>
            <SelectItem value="result-desc">Resultat ↓</SelectItem>
          </>
        )}
        {provaInfo.intervalMinutes && (
          <>
            <SelectItem value="time-asc">Ordre de joc ↑</SelectItem>
            <SelectItem value="time-desc">Ordre de joc ↓</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

export default function ProvaPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { previousSelectedYear, selectedYear, setSelectedYear } = useYear();

    const admin = isAdmin();

    const setProva = useProvaStore((state) => state.setProva);
    const [penyesSearch, setPenyesSearch] = useState("");
    const [filteredPenyes, setFilteredPenyes] = useState<ParticipatingPenya[]>([]);
    const [slotStatuses, setSlotStatuses] = useState<Record<string, 'ok' | 'overflow'>>({});
    const [sortMode, setSortMode] = useState<SortMode>("name-asc");

    const [noProvaAlert, setNoProbaAlert] = useState(false);
    const [provaInfo, setProvaInfo] = useState<Prova>(new EmptyProva());
    const [isProvaLoading, setIsProvaLoading] = useState(true);

    const searchParams = new URLSearchParams(location.search);
    const provaId = searchParams.get("provaId") || "";

    useEffect(() => {
        const newFilteredPenyes = penyesSearch.length == 0 ? provaInfo.penyes : provaInfo.penyes.filter((penya) =>
            penya.name.toLowerCase().includes(penyesSearch.toLowerCase())
        );
        setFilteredPenyes(sortPenyes(newFilteredPenyes, sortMode));
    }, [penyesSearch, provaInfo.penyes, sortMode]);

    useEffect(() => {
        if (provaInfo.intervalMinutes && provaInfo.maxPenyesPerSlot) {
            setSlotStatuses(
                computeSlotStatuses(
                    provaInfo.penyes,
                    provaInfo.intervalMinutes,
                    provaInfo.maxPenyesPerSlot,
                    provaInfo.startDate
                )
            );
        } else {
            setSlotStatuses({});
        }
    }, [provaInfo.penyes, provaInfo.intervalMinutes, provaInfo.maxPenyesPerSlot]);

  useEffect(() => {
    setIsProvaLoading(true);
    document.title = `Carregant Prova`;

    let unsubscribe: (() => void) | undefined;

    if (admin) {
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

          setProva(provaInfoResult);
          console.log(provaInfoResult);
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

          const clonedProva = Object.assign(
            Object.create(Object.getPrototypeOf(provaInfoResult)),
            provaInfoResult
          );

          setProva(clonedProva);
          setProvaInfo(clonedProva);
          document.title = `${clonedProva.name} ${selectedYear}`;
        } else {
          setNoProbaAlert(true);
        }
        setIsProvaLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedYear, admin]);

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
              <ProvaTitle />

              {provaInfo.intervalMinutes ? (
                <Tabs defaultValue="resultats" className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <TabsList>
                      <TabsTrigger value="resultats">Resultats</TabsTrigger>
                      <TabsTrigger value="horaris">Horaris</TabsTrigger>
                    </TabsList>
                    <SortSelector provaInfo={provaInfo} sortMode={sortMode} setSortMode={setSortMode} />
                  </div>

                  <TabsContent value="resultats">
                    {admin ? (
                      <>
                        <Input className="p-4 mb-4" type="search" value={penyesSearch} placeholder="Buscar penya..." onChange={(e) => setPenyesSearch(e.target.value)}/>
                        <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-3 w-full">
                          {isProvaLoading ? (
                            <LoadingAnimation />
                          ) : (
                            filteredPenyes.length > 0 ? (
                              filteredPenyes.map((penya) => (
                                <AdminSingleProvaResult key={penya.penyaId} provaResultSummary={penya} slotStatus={slotStatuses[penya.penyaId] ?? 'none'} />
                              ))
                            ) : (<p>No s'han trobat penyes per a aquesta prova.</p>)
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-3.5 flex flex-col items-end justify-start">
                        {isProvaLoading ? (
                          <LoadingAnimation />
                        ) : (
                          provaInfo.penyes.length > 0 ? (
                            <DynamicList
                              items={sortPenyes(provaInfo.penyes, sortMode)}
                              renderItem={(provaResultSummary) => (
                                <SingleProvaResult
                                  key={provaResultSummary.penyaId}
                                  provaResultSummary={provaResultSummary}
                                />
                              )}
                              renderGridItem={(item, index) => (
                                <SingleProvaResultGrid key={index} provaResultSummary={item} />
                              )}
                            />
                          ) : (
                            <p>No s'han trobat penyes per a aquesta prova.</p>
                          )
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="horaris">
                    {admin ? (
                      <AdminHoraris
                        prova={provaInfo}
                        onProvaConfigUpdated={(intervalMinutes, maxPenyesPerSlot) => {
                          setProvaInfo((prev) =>
                            Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, {
                              intervalMinutes,
                              maxPenyesPerSlot,
                              penyes: prev.penyes.map((p) => ({ ...p, participationTime: null })),
                            })
                          );
                        }}
                      />
                    ) : (
                      <PublicHoraris penyes={provaInfo.penyes} />
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  <div className="px-4 pt-4 flex justify-end">
                    <SortSelector provaInfo={provaInfo} sortMode={sortMode} setSortMode={setSortMode} />
                  </div>
                  {admin ? (
                    <>
                      <Input className="p-4 mb-4" type="search" value={penyesSearch} placeholder="Buscar penya..." onChange={(e) => setPenyesSearch(e.target.value)}/>
                      <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-3 w-full">
                        {isProvaLoading ? (
                          <LoadingAnimation />
                        ) : (
                          filteredPenyes.length > 0 ? (
                            filteredPenyes.map((penya) => (
                              <AdminSingleProvaResult key={penya.penyaId} provaResultSummary={penya} />
                            ))
                          ) : (<p>No s'han trobat penyes per a aquesta prova.</p>)
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-3.5 flex flex-col items-end justify-start ">
                      {isProvaLoading ? (
                        <LoadingAnimation />
                      ) : (
                        provaInfo.penyes.length > 0 ? (
                          <DynamicList
                            items={sortPenyes(provaInfo.penyes, sortMode)}
                            renderItem={(provaResultSummary) => (
                              <SingleProvaResult
                                key={provaResultSummary.penyaId}
                                provaResultSummary={provaResultSummary}
                              />
                            )}
                            renderGridItem={(item, index) => (
                              <SingleProvaResultGrid key={index} provaResultSummary={item} />
                            )}
                          />
                        ) : (
                          <p>No s'han trobat penyes per a aquesta prova.</p>
                        )
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
            {admin && <AdminFooter />}
        </>

    );    
}  
