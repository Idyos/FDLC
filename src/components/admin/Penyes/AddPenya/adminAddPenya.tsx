import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/Theme/theme-provider";
import { ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Ban, Check, ChevronDown, ChevronUp, LoaderCircle, Minus, Plus, X } from "lucide-react";
import { addPenyes } from "@/services/database/Admin/adminDbServices";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { cn } from "@/lib/utils";

async function extractImagesFromBuffer(buffer: ArrayBuffer): Promise<Map<number, File>> {
  const imageMap = new Map<number, File>();
  try {
    const zip = await JSZip.loadAsync(buffer);

    // Find the drawing path from the first sheet's rels
    const sheetRelsFile = zip.file('xl/worksheets/_rels/sheet1.xml.rels');
    if (!sheetRelsFile) return imageMap;

    const sheetRelsDoc = new DOMParser().parseFromString(
      await sheetRelsFile.async('text'),
      'application/xml'
    );

    let drawingPath: string | null = null;
    const sheetRels = sheetRelsDoc.getElementsByTagNameNS('*', 'Relationship');
    for (let i = 0; i < sheetRels.length; i++) {
      if (sheetRels[i].getAttribute('Type')?.includes('drawing')) {
        const target = sheetRels[i].getAttribute('Target') ?? '';
        drawingPath = 'xl/' + target.replace('../', '');
        break;
      }
    }
    if (!drawingPath) return imageMap;

    const drawingFile = zip.file(drawingPath);
    if (!drawingFile) return imageMap;

    const drawingDoc = new DOMParser().parseFromString(
      await drawingFile.async('text'),
      'application/xml'
    );

    // Map rId → media path from drawing rels
    const drawingRelsPath = drawingPath.replace(
      /xl\/drawings\/(.+)$/,
      'xl/drawings/_rels/$1.rels'
    );
    const drawingRelsFile = zip.file(drawingRelsPath);
    if (!drawingRelsFile) return imageMap;

    const drawingRelsDoc = new DOMParser().parseFromString(
      await drawingRelsFile.async('text'),
      'application/xml'
    );
    const relIdToMedia = new Map<string, string>();
    const drawingRels = drawingRelsDoc.getElementsByTagNameNS('*', 'Relationship');
    for (let i = 0; i < drawingRels.length; i++) {
      const id = drawingRels[i].getAttribute('Id') ?? '';
      const target = drawingRels[i].getAttribute('Target') ?? '';
      relIdToMedia.set(id, 'xl/' + target.replace('../', ''));
    }

    // Process each anchor (one or two cell anchors)
    const anchorTypes = ['twoCellAnchor', 'oneCellAnchor'];
    for (const anchorType of anchorTypes) {
      const anchors = drawingDoc.getElementsByTagNameNS('*', anchorType);
      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        const fromEl = anchor.getElementsByTagNameNS('*', 'from')[0];
        if (!fromEl) continue;

        const rowText = fromEl.getElementsByTagNameNS('*', 'row')[0]?.textContent;
        const row = parseInt(rowText ?? '-1', 10);
        if (row < 0) continue;

        const blipEl = anchor.getElementsByTagNameNS('*', 'blip')[0];
        if (!blipEl) continue;

        const rId = blipEl.getAttributeNS(
          'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
          'embed'
        );
        if (!rId) continue;

        const mediaPath = relIdToMedia.get(rId);
        if (!mediaPath) continue;

        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;

        const ext = mediaPath.split('.').pop() ?? 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        const blob = await mediaFile.async('blob');
        imageMap.set(row, new File([blob], `penya-row${row}.${ext}`, { type: mime }));
      }
    }
  } catch {
    // If the file has no drawings, return empty map silently
  }
  return imageMap;
}

interface PenyaFormData {
  name: string;
  description: string;
  image: File | null;
  imagePreview: string | null;
}

export default function AdminAddPenya({ triggerElement }: { triggerElement?: ReactNode } = {}) {
  const { selectedYear } = useYear();
  const { theme } = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [penyes, setPenyes] = useState<PenyaFormData[]>([]);
  const [updateStates, setUpdateStates] = useState<string[]>([]);
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const removeAllTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseDown = () => {
    removeAllTimer.current = setTimeout(() => {
      removeAllPenyes();
    }, 1000);
  };

  const handleMouseUp = () => {
    if (removeAllTimer.current) {
      clearTimeout(removeAllTimer.current);
      removeAllTimer.current = null;
      if (penyes.length > 0) removeLastPenya();
    }
  };

  const handleMouseOut = () => {
    if (removeAllTimer.current) {
      clearTimeout(removeAllTimer.current);
      removeAllTimer.current = null;
    }
  };

  const addNewPenya = () => {
    for (let i = 0; i < penyes.length - 1; i++) {
      if (!penyes[i].name.trim()) {
        toast.warning(`El nom de la Penya ${i + 1} no pot estar buit.`);
        return;
      }
    }

    if (penyes.length > 0 && penyes[penyes.length - 1].name === "") {
      toast.warning("L'ultima penya no te el nom establert.");
      return;
    }

    const newIndex = penyes.length;
    setPenyes(prev => [...prev, { name: "", description: "", image: null, imagePreview: null }]);
    setUpdateStates(prev => [...prev, "3"]);
    setExpandedIndices(prev => new Set([...prev, newIndex]));
  };

  const removePenyaAt = (index: number) => {
    setPenyes(prev => prev.filter((_, i) => i !== index));
    setUpdateStates(prev => prev.filter((_, i) => i !== index));
    setExpandedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const removeLastPenya = () => {
    if (penyes.length === 0) {
      toast.warning("No hi ha penyes per eliminar.");
      return;
    }
    removePenyaAt(penyes.length - 1);
  };

  const removeAllPenyes = () => {
    if (penyes.length === 0) {
      toast.warning("No hi ha penyes per eliminar.");
      return;
    }
    setPenyes([]);
    setUpdateStates([]);
    setExpandedIndices(new Set());
  };

  const updatePenya = (index: number, changes: Partial<PenyaFormData>) => {
    setPenyes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...changes };
      return updated;
    });
  };

  const handleImageChange = (index: number, file: File | null) => {
    const imagePreview = file ? URL.createObjectURL(file) : null;
    updatePenya(index, { image: file, imagePreview });
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (penyes.length === 0) {
      toast.warning("No hi ha cap penya afegida.");
      return;
    }

    for (let i = 0; i < penyes.length; i++) {
      if (!penyes[i].name.trim()) {
        toast.warning(`El nom de la penya ${i + 1} no pot estar buit.`);
        return;
      }
    }

    const normalizedNames = penyes.map(p => p.name.trim().toLowerCase());
    const nameIndexMap = new Map<string, number[]>();
    normalizedNames.forEach((name, index) => {
      if (!nameIndexMap.has(name)) nameIndexMap.set(name, []);
      nameIndexMap.get(name)!.push(index);
    });

    const duplicateIndices: number[] = [];
    nameIndexMap.forEach(indices => {
      if (indices.length > 1) duplicateIndices.push(...indices);
    });

    if (duplicateIndices.length > 0) {
      const formatted = duplicateIndices.map(i => i + 1).join(", ");
      toast.warning(`Hi han noms idèntics a les següents posicions: ${formatted}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setUpdateStates(penyes.map(() => "2"));

      const penyesData = penyes.map(p => ({
        name: p.name.trim(),
        description: p.description.trim(),
        image: p.image,
      }));

      await addPenyes(
        selectedYear,
        penyesData,
        (index, success) => {
          setUpdateStates(prev => {
            const updated = [...prev];
            updated[index] = success ? "1" : "0";
            return updated;
          });
        },
        (results) => {
          const failedCount = results.filter(s => !s).length;
          if (failedCount > 0) {
            toast.warning("Algunes penyes ja existien previament o no s'han pogut actualitzar, observa quines están marcades com a no actualitzades.");
          } else {
            toast.success("Totes les penyes afegides correctament!");
            setIsDialogOpen(false);
          }
        }
      );
    } catch {
      toast.error("Error al guardar");
      setUpdateStates(penyes.map(() => "0"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFileAdded = async (file: File) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.warning("Només es permeten fitxers d'Excel (.xls o .xlsx)");
      return;
    }

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const imageMap = await extractImagesFromBuffer(buffer);

    const newPenyes: PenyaFormData[] = [];
    jsonData.forEach((row, rowIndex) => {
      const name = (row as unknown[])[0];
      if (name !== undefined) {
        const descRaw = (row as unknown[])[1];
        const description = descRaw !== undefined ? String(descRaw) : "";
        const imgFile = imageMap.get(rowIndex) ?? null;
        const imagePreview = imgFile ? URL.createObjectURL(imgFile) : null;
        newPenyes.push({ name: String(name), description, image: imgFile, imagePreview });
      }
    });

    setPenyes(prev => [...prev, ...newPenyes]);
    setUpdateStates(prev => [...prev, ...newPenyes.map(() => "3")]);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Crear penya/es</DialogTitle>
      </DialogHeader>
      <DialogDescription>
        Aquí pots crear penyes d'una en una o amb un excel. Columna A = nom, Columna B = descripció, Columna C = imatge (incrustada).
      </DialogDescription>
      <div className={cn("grid gap-4 py-4", isSubmitting && "pointer-events-none opacity-60")}>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="excel-input" className="text-right">
            Afegir des d'Excel
          </Label>
          <Input
            type="file"
            id="excel-input"
            className="col-span-3"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileAdded(file);
            }}
          />
        </div>
      </div>
      <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
        {penyes.map((penya, index) => (
          <Collapsible
            key={index}
            open={expandedIndices.has(index)}
            onOpenChange={(open) => {
              setExpandedIndices(prev => {
                const next = new Set(prev);
                if (open) next.add(index);
                else next.delete(index);
                return next;
              });
            }}
          >
            <div className={cn("border rounded-lg overflow-hidden", isSubmitting && "pointer-events-none")}>
              <div className="flex flex-row items-center gap-2 p-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer shrink-0 h-6 w-6 flex items-center justify-center p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePenyaAt(index);
                  }}
                >
                  <X size={12} />
                </Badge>
                <span className="shrink-0 text-xs text-muted-foreground w-5 text-right">
                  {index + 1}.
                </span>
                <Input
                  value={penya.name}
                  className="flex-1 h-8 text-sm"
                  placeholder="Nom de la penya"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && penya.name === "") {
                      removePenyaAt(index);
                    }
                  }}
                  onChange={(e) => {
                    const newName = e.target.value;
                    if (newName.length > penya.name.length && index === penyes.length - 1) {
                      setPenyes(prev => {
                        const updated = [...prev];
                        updated[index] = { ...updated[index], name: newName };
                        return [...updated, { name: "", description: "", image: null, imagePreview: null }];
                      });
                      setUpdateStates(prev => [...prev, "3"]);
                    } else {
                      updatePenya(index, { name: newName });
                    }
                  }}
                />
                {index < updateStates.length && updateStates[index] !== "3" && (
                  <Badge variant="default" className="h-7 shrink-0 px-1">
                    {updateStates[index] === "2" && <LoaderCircle className="animate-spin" />}
                    {updateStates[index] === "1" && <Check color="green" size={16} />}
                    {updateStates[index] === "0" && <Ban color="red" className="h-4 w-4" />}
                  </Badge>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                    {expandedIndices.has(index) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="border-t px-3 pb-3 pt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs shrink-0 w-20 text-right">Imatge</Label>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-xs flex-1 min-w-0"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          handleImageChange(index, file);
                        }}
                      />
                      {penya.imagePreview && (
                        <img
                          src={penya.imagePreview}
                          alt="preview"
                          className="h-8 w-8 rounded object-cover shrink-0"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Label className="text-xs shrink-0 w-20 text-right pt-2">Descripció</Label>
                    <Textarea
                      value={penya.description}
                      placeholder="Descripció de la penya (opcional)"
                      className="flex-1 text-sm"
                      onChange={(e) => updatePenya(index, { description: e.target.value })}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
      <div className={cn("flex flex-row items-center", isSubmitting && "pointer-events-none opacity-60")}>
        <Button variant="default" className="mr-2 flex-1" onClick={addNewPenya}><Plus size={16} /></Button>
        <Button
          variant="outline"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseOut}
          className="flex-1"
        >
          <Minus size={16} />
        </Button>
      </div>
      <DialogFooter>
        <Button
          disabled={penyes.length === 0 || isSubmitting}
          type="submit"
          onClick={handleClick}
        >
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {penyes.length === 1 ? "Crear penya" : "Crear Penyes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (triggerElement) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}>
        <DialogTrigger asChild>{triggerElement}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}>
        <DialogTrigger asChild className="w-full h-full" onClick={() => setIsDialogOpen(true)}>
          <div className="cursor-pointer w-full h-full relative z-10 flex items-center justify-center dark:text-white text-gray-900">
            <div className="dark:bg-neutral-800 bg-gray-200 flex justify-center items-center p-8 rounded-full shadow-lg w-24 h-24">
              <Plus size={40} color={theme === "dark" ? "white" : "black"} />
            </div>
          </div>
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    </motion.div>
  );
}
