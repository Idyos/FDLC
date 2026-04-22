import { useEffect, useState } from "react";
import { rankParticipants } from "@/utils/sorting";
import { PlusCircle, Trash2, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import { ParticipatingPenya, Prova, SubProvaConfig } from "@/interfaces/interfaces";
import {
  addSubProva,
  deleteSubProva,
  getSubProvaParticipants,
  getSubProvas,
  updateSubProvaResult,
} from "@/services/database/Admin/adminMultiProvaDbServices";
import AdminAddSubProvaDialog from "./AdminAddSubProvaDialog";
import AdminBracketPanel from "@/components/admin/Proves/Bracket/adminBracketPanel";
import AdminSingleProvaResult from "@/components/admin/Proves/ProvaPenyaSummary/adminSingleProvaResult";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { ScrollBar } from "@/components/ui/scroll-area";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

interface Props {
  year: number;
  prova: Prova;
}

// ─── Sub-prova result row ─────────────────────────────────────────────────────

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AdminMultiProvaPanel({ year, prova }: Props) {
  const [subProves, setSubProves] = useState<SubProvaConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipatingPenya[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubProvaConfig | null>(null);
  
  // Load sub-provas on mount
  useEffect(() => {
    getSubProvas(year, prova.id).then((list) => {
      setSubProves(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, [year, prova.id]);

  // Load participants whenever selected sub-prova changes (skip for Rondes — bracket handles its own data)
  useEffect(() => {
    if (!selectedId) { setParticipants([]); return; }
    const sp = subProves.find((s) => s.id === selectedId);
    if (sp?.challengeType === "Rondes") { setParticipants([]); return; }
    setLoadingParticipants(true);
    getSubProvaParticipants(year, prova.id, selectedId)
      .then((list) => setParticipants(rankParticipants(list, sp!.winDirection)))
      .finally(() => setLoadingParticipants(false));
  }, [selectedId, year, prova.id, subProves]);


  const handleAdd = async (config: Omit<SubProvaConfig, "id">) => {
    try {
      const id = await addSubProva(year, prova.id, config, prova.penyes);
      const newSubProva: SubProvaConfig = { ...config, id };
      setSubProves((prev) => [...prev, newSubProva]);
      setSelectedId(id);
      toast.success(`Subprova "${config.name}" creada!`);
    } catch (err: any) {
      toast.error("Error al crear la subprova: " + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteSubProva(year, prova.id, id);
      const remaining = subProves.filter((s) => s.id !== id);
      setSubProves(remaining);
      if (selectedId === id) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(`Subprova "${name}" eliminada.`);
    } catch (err: any) {
      toast.error("Error al eliminar la subprova: " + err.message);
    }
  };

  return (
    <div>
      {/* ── Left sidebar: sub-prova list ─────────────────── */}

      <Tabs value={selectedId ?? ""} className="max-w-[calc(100%-2rem)] mb-5">
        {subProves.length > 0 && (
          <TabsList className="ml-3 mr-3 max-w-full rounded-full">
            <Button variant="outline" className="m-1 h-7.25 shrink-0 rounded-full" disabled={prova.isFinished}  onClick={() => setShowAddDialog(true)}>
              <PlusCircle/>
            </Button>
            <ScrollAreaPrimitive.Root className="relative flex-1 min-w-0 h-full" type="auto">
              <ScrollAreaPrimitive.Viewport className="h-full w-full">
                <div className="flex">
                  {subProves.map((subProva) => (
                    <ContextMenu key={subProva.id}>
                      <ContextMenuTrigger>
                        <TabsTrigger className="rounded-full" onClick={() => setSelectedId(subProva.id)} value={subProva.id}>
                          {subProva.name}
                        </TabsTrigger>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {!prova.isFinished && (
                          <ContextMenuItem variant="destructive" onSelect={() => setDeleteTarget(subProva)}>
                            <Trash2 />
                            Eliminar
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              </ScrollAreaPrimitive.Viewport>
              <ScrollBar orientation="horizontal" />
              <ScrollAreaPrimitive.Corner />
            </ScrollAreaPrimitive.Root>
          </TabsList>

        )}
        
        {subProves.length === 0 && (
          <Button variant="outline" className="m-1 h-[90%] " disabled={prova.isFinished}  onClick={() => setShowAddDialog(true)}>
            Afegir prova
          </Button>
        )}

        {subProves.length > 0 && subProves.map((sp) => (
            <TabsContent key={sp.id} value={sp.id}>
              <div className="flex-1 overflow-y-auto p-4">
                {sp.challengeType === "Rondes" ? (
                  <AdminBracketPanel
                    year={year}
                    prova={prova}
                    subProvaId={sp.id}
                    readOnly={prova.isFinished}
                  />
                ) : (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold">{sp.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {sp.challengeType}
                        {sp.winDirection !== "NONE" && (
                          <> · {sp.winDirection === "ASC" ? "menys és millor" : "més és millor"}</>
                        )}
                      </p>
                    </div>

                    {loadingParticipants ? (
                      <p className="text-sm text-muted-foreground">Carregant participants...</p>
                    ) : participants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hi ha participants en aquesta subprova.</p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-3">
                        {participants.map((p) => (
                          <AdminSingleProvaResult
                            key={p.penyaId}
                            provaResultSummary={p}
                            challengeTypeOverride={sp.challengeType}
                            onSave={(val) => updateSubProvaResult(year, prova.id, sp.id, p.penyaId, val)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            ))}
      </Tabs>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Eliminar "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs a punt d'eliminar aquesta subprova. Aquesta acció no es pot desfer i es perdran tots els resultats associats. Estàs segur que vols continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel·lar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.name)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* <div className="w-56 flex-shrink-0 border-r dark:border-gray-700 flex flex-col">

        <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
          <span className="text-sm font-semibold">Subpruebas</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Nova subprova"
            onClick={() => setShowAddDialog(true)}
            disabled={prova.isFinished}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {subProves.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">
              Encara no hi ha subpruebas. Afegeix-ne una!
            </p>
          ) : (
            subProves.map((sp) => (
              <div
                key={sp.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedId === sp.id ? "bg-muted font-semibold" : ""
                }`}
                onClick={() => setSelectedId(sp.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{sp.name}</p>
                  <p className="text-xs text-muted-foreground">{sp.challengeType}</p>
                </div>
                {!prova.isFinished && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    title="Eliminar subprova"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sp.id, sp.name);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div> */}

      {/* ── Right panel: results for selected sub-prova ──── */}
      <AdminAddSubProvaDialog
        open={showAddDialog}
        nextOrder={subProves.length}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
