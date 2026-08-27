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
import LoadingAnimation from "@/components/shared/loadingAnim";
import PublicResultsList from "@/components/shared/PenyaProvaResults/publicResultsList";
import AdminSingleProvaResult from "@/components/admin/Proves/ProvaPenyaSummary/adminSingleProvaResult";
import {
  getProvaInfo,
  updateParticipationTime,
  updateProvaScheduleConfig,
  clearAllParticipationTimes,
  batchUpdateParticipationTimes,
} from "@/services/database/Admin/adminDbServices";
import ProvaTitle from "@/components/public/provaTitle";
import { useProvaStore } from "@/components/shared/Contexts/ProvaContext";
import AdminFooter from "@/components/admin/Proves/Footer/adminFooter";
import { EmptyProva, ParticipatingPenya, Prova } from "@/interfaces/interfaces";
import { isAdmin } from "@/services/authService";
import { matchesSearch } from "@/utils/text";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminHoraris from "@/components/admin/Proves/Horaris/adminHoraris";
import ScheduleSortSelector from "@/components/shared/ScheduleSortSelector";
import { SortMode, sortPenyes } from "@/utils/sorting";
import { Button } from "@/components/ui/button";

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

import AdminBracketPanel from "@/components/admin/Proves/Bracket/adminBracketPanel";
import PublicBracketPanel from "@/components/admin/Proves/Bracket/PublicBracketPanel";
import AdminMultiProvaPanel from "@/components/admin/Proves/MultiProva/AdminMultiProvaPanel";
import PublicMultiProvaPanel from "@/components/admin/Proves/MultiProva/PublicMultiProvaPanel";

export default function ProvaPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { previousSelectedYear, selectedYear, setSelectedYear } = useYear();

    const admin = isAdmin();

    const setProva = useProvaStore((state) => state.setProva);
    const [penyesSearch, setPenyesSearch] = useState("");
    const [filteredPenyes, setFilteredPenyes] = useState<ParticipatingPenya[]>([]);
    const [slotStatuses, setSlotStatuses] = useState<Record<string, 'ok' | 'overflow'>>({});
    const [sortMode, setSortMode] = useState<SortMode>("time-asc");

    const [noProvaAlert, setNoProbaAlert] = useState(false);
    const [provaInfo, setProvaInfo] = useState<Prova>(new EmptyProva());
    const [isProvaLoading, setIsProvaLoading] = useState(true);
    const [showStaleCacheRecovery, setShowStaleCacheRecovery] = useState(false);

    const searchParams = new URLSearchParams(location.search);
    const provaId = searchParams.get("provaId") || "";

    useEffect(() => {
        const newFilteredPenyes = penyesSearch.length == 0 ? provaInfo.penyes : provaInfo.penyes.filter((penya) =>
            matchesSearch(penya.name, penyesSearch)
        );
        setFilteredPenyes(newFilteredPenyes);
    }, [penyesSearch, provaInfo.penyes]);

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
  }, [selectedYear, admin, provaId]);

  // Si la càrrega es queda penjada (típicament per una caché local de
  // Firestore en mal estat), oferim una via de sortida en lloc d'una
  // pantalla en blanc sense cap pista de què ha passat.
  useEffect(() => {
    if (!isProvaLoading) {
      setShowStaleCacheRecovery(false);
      return;
    }
    const timeoutId = setTimeout(() => setShowStaleCacheRecovery(true), 10000);
    return () => clearTimeout(timeoutId);
  }, [isProvaLoading, selectedYear, provaId]);

  const handleStaleCacheRecovery = async () => {
    try {
      const dbs = await indexedDB.databases?.();
      dbs?.forEach((d) => d.name && indexedDB.deleteDatabase(d.name));
    } finally {
      window.location.reload();
    }
  };

    return (
        <div className="md:p-2">
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
            <div className="flex-1 flex flex-col bg-background rounded-4xl mt-4 dark:shadow-[0px_0px_30px_0px_#ffffff25] shadow-[0px_0px_30px_0px_#00000025]">
              <ProvaTitle />

              {isProvaLoading && showStaleCacheRecovery ? (
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-muted-foreground">
                    Està tardant més del compte a carregar. Pot ser un problema amb les dades desades al navegador.
                  </p>
                  <Button onClick={handleStaleCacheRecovery}>Netejar caché i recarregar</Button>
                </div>
              ) : provaInfo.intervalMinutes ? (
                admin ? (
                  <Tabs defaultValue="resultats">
                    <TabsList className="px-4 w-full gap-2">
                      <TabsTrigger value="resultats">Resultats</TabsTrigger>
                      <TabsTrigger value="horaris">Horaris</TabsTrigger>
                    </TabsList>

                    <TabsContent value="resultats">
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
                    </TabsContent>

                    <TabsContent value="horaris">
                      <div className="flex justify-end mb-3">
                        <ScheduleSortSelector
                          sortMode={sortMode}
                          setSortMode={setSortMode}
                          showResultSort={provaInfo.challengeType !== "Participació"}
                        />
                      </div>
                      <AdminHoraris
                        resourceKey={provaInfo.id}
                        penyes={provaInfo.penyes}
                        startDate={provaInfo.startDate}
                        intervalMinutes={provaInfo.intervalMinutes ?? 0}
                        maxPenyesPerSlot={provaInfo.maxPenyesPerSlot ?? 1}
                        sortMode={sortMode}
                        updateParticipationTime={(penyaId, time) =>
                          updateParticipationTime(provaInfo.reference, penyaId, time)
                        }
                        updateScheduleConfig={(interval, maxSlot) =>
                          updateProvaScheduleConfig(provaInfo.reference, interval, maxSlot)
                        }
                        clearAllParticipationTimes={(penyaIds) =>
                          clearAllParticipationTimes(provaInfo.reference, penyaIds)
                        }
                        batchUpdateParticipationTimes={(assignments) =>
                          batchUpdateParticipationTimes(provaInfo.reference, assignments)
                        }
                        onConfigUpdated={(intervalMinutes, maxPenyesPerSlot) => {
                          setProvaInfo((prev) => {
                            const updated = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, {
                              intervalMinutes,
                              maxPenyesPerSlot,
                              penyes: prev.penyes.map((p) => ({ ...p, participationTime: null })),
                            });
                            setProva(updated);
                            return updated;
                          });
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="p-3.5 flex flex-col items-end justify-start">
                    <div className="flex justify-end mb-3 w-full">
                      <ScheduleSortSelector
                        sortMode={sortMode}
                        setSortMode={setSortMode}
                        showResultSort={provaInfo.challengeType !== "Participació"}
                      />
                    </div>
                    {isProvaLoading ? (
                      <LoadingAnimation />
                    ) : (
                      <PublicResultsList penyes={sortPenyes(provaInfo.penyes, sortMode)} />
                    )}
                  </div>
                )
              ) : (
                <>
                  {admin ? (
                    provaInfo.challengeType === "Rondes" ? (
                      provaInfo.isFinished ? (
                        <Tabs defaultValue="resultats" className="p-4">
                          <TabsList>
                            <TabsTrigger value="resultats">Resultats</TabsTrigger>
                            <TabsTrigger value="quadre">Quadre</TabsTrigger>
                          </TabsList>
                          <TabsContent value="resultats">
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
                          </TabsContent>
                          <TabsContent value="quadre">
                            <AdminBracketPanel year={selectedYear} prova={provaInfo} readOnly />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <AdminBracketPanel year={selectedYear} prova={provaInfo} />
                      )
                    ) : provaInfo.challengeType === "MultiProva" ? (
                      <AdminMultiProvaPanel year={selectedYear} prova={provaInfo} />
                    ) : (
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
                    )
                  ) : (
                    provaInfo.challengeType === "Rondes" ? (
                      provaInfo.isFinished ? (
                        <Tabs defaultValue="resultats" className="p-4">
                          <TabsList>
                            <TabsTrigger value="resultats">Resultats</TabsTrigger>
                            <TabsTrigger value="quadre">Quadre</TabsTrigger>
                          </TabsList>
                          <TabsContent value="resultats">
                            <div className="p-3.5 flex flex-col items-end justify-start">
                              {isProvaLoading ? (
                                <LoadingAnimation />
                              ) : (
                                <PublicResultsList penyes={provaInfo.penyes} />
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="quadre">
                            <PublicBracketPanel year={selectedYear} prova={provaInfo} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <PublicBracketPanel year={selectedYear} prova={provaInfo} />
                      )
                    ) : provaInfo.challengeType === "MultiProva" ? (
                      <PublicMultiProvaPanel year={selectedYear} provaId={provaInfo.id} />
                    ) : (
                      <div className="p-3.5 flex flex-col items-end justify-start ">
                        {isProvaLoading ? (
                          <LoadingAnimation />
                        ) : (
                          <PublicResultsList penyes={provaInfo.penyes} />
                        )}
                      </div>
                    )
                  )}
                </>
              )}

            </div>
            {admin && <AdminFooter />}
        </div>

    );
}
