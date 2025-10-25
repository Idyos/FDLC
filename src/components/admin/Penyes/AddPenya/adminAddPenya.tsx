import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/Theme/theme-provider";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Ban, Check, Loader, Plus } from "lucide-react";
import { addPenyes } from "@/services/database/adminDbServices";


export default function AdminAddPenya() {
    const { theme } = useTheme();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [penyesNames, setPenyesNames] = useState<string[]>([]);
    const [updatePenyesNamesState, setUpdatePenyesNamesState] = useState<string[]>([]);
    const removeAllPenyesTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const penyesState = penyesNames.map(() => "3");
        setUpdatePenyesNamesState(penyesState);
    }, [penyesNames]);
    
    const handleMouseDown = () => {
        removeAllPenyesTimer.current = setTimeout(() => {
          removeAllPenyes();
        }, 1000);
      };
    
      const handleMouseUp = () => {
        if (removeAllPenyesTimer.current) {
          clearTimeout(removeAllPenyesTimer.current);
          removeAllPenyesTimer.current = null;
          if(penyesNames.length > 0) removePenya();
        }
      };

      const handleMouseOut = () => {
        if (removeAllPenyesTimer.current) {
          clearTimeout(removeAllPenyesTimer.current);
          removeAllPenyesTimer.current = null;
        }
      }

    const addNewPenya = () => {
        for(let i = 0; i < penyesNames.length - 1; i++) {
            if (!penyesNames[i].trim()) {
                toast.warning(`El nom de la Penya ${i+1} no pot estar buit.`);
                return;
            }
        }

        if(penyesNames[penyesNames.length - 1] == "") {
            toast.warning("L'ultima penya no te el nom establert.");
            return;
        }

        setPenyesNames([...penyesNames, ""]);
    }

    const removePenya = () => {
        if(penyesNames.length == 0) {
            toast.warning("No hi ha penyes per eliminar.");
            return;
        }

        setPenyesNames(penyesNames.slice(0, -1));
    }

    const removeAllPenyes = () => {
        if(penyesNames.length == 0) {
            toast.warning("No hi ha penyes per eliminar.");
            return;
        }

        setPenyesNames([]);
        setUpdatePenyesNamesState([]);
    }

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
      
        if (penyesNames.length === 0) {
          toast.warning("No hi ha cap penya afegida.");
          return;
        }
      
        for (let i = 0; i < penyesNames.length; i++) {
          if (!String(penyesNames[i]).trim()) {
            toast.warning(`El nom de la penya ${i + 1} no pot estar buit.`);
            return;
          }
        }
      
        const normalizedNames = penyesNames.map(name => name.trim().toLowerCase());
        const nameIndexMap = new Map<string, number[]>();
        
        normalizedNames.forEach((name, index) => {
          if (!nameIndexMap.has(name)) {
            nameIndexMap.set(name, []);
          }
          nameIndexMap.get(name)!.push(index);
        });
        
        const duplicateIndices: number[] = [];
        nameIndexMap.forEach(indices => {
          if (indices.length > 1) {
            duplicateIndices.push(...indices);
          }
        });
        
        if (duplicateIndices.length > 0) {
          const formatted = duplicateIndices.map(i => i + 1).join(", ");
          toast.warning(`Hi han noms idèntics a les següents posicions: ${formatted}.`);
          return;
        }
      
        try {
          const penyesState = penyesNames.map(() => "2");
          setUpdatePenyesNamesState(penyesState);
      
          addPenyes(2025, penyesNames, (results) => {
            const updatedStates = results.map(success => (success ? "1" : "0"));
            setUpdatePenyesNamesState(updatedStates);
      
            const failedPenyes = penyesNames.filter((_, index) => !results[index]);
            if (failedPenyes.length > 0) {
              toast.warning("Algunes penyes ja existien previament, observa quines están marcades com a no actualitzades.");
            } else {
              toast.success("Totes les penyes afegides correctament!");
              setIsDialogOpen(false);
            }
          });
        } catch (error) {
          toast.error("Error al guardar");
        }
      };

  const onFileAdded = (file: File) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
  
    if (!allowedTypes.includes(file.type)) {
      toast.warning("Només es permeten fitxers d'Excel (.xls o .xlsx)");
      return;
    }
  
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
  
      const sheetName = workbook.SheetNames[0]; // primera hoja
      const worksheet = workbook.Sheets[sheetName];
  
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      const penyesNamesTemp: string[] = []; 
      jsonData.forEach((row, index) => {
        const firstColumnValue = (row as any[])[0];
        if (firstColumnValue !== undefined) {
          console.log(`Fila ${index + 1}: ${firstColumnValue}`);
          penyesNamesTemp.push(String(firstColumnValue));
        }
      });
      setPenyesNames([...penyesNames, ...penyesNamesTemp]);
    };
  
    reader.readAsBinaryString(file);
  };

//   const closeDialog = () => {
//     setIsDialogOpen(false);
//   }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild className="w-full h-full " onClick={() => setIsDialogOpen(true)}>
            {/* Contenido */}
            <div className="cursor-pointer w-full h-fullrelative z-10 flex items-center justify-center h-full dark:text-white text-gray-900">
                <div className="dark:bg-gray-800 bg-gray-200 flex justify-center items-center p-8 rounded-full shadow-lg w-24 h-24">
                    <Plus size={40} color={theme == "dark" ? "white" : "black"} />
                </div>
            </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear penya/es</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Aquí pots crear penyes d'una en una o si ho tens, amb un excel. Els noms de les penyes han d'estar a la primera columna de l'excel.
          </DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Afegir llista de penyes
              </Label>
              <Input
                type="file"
                id="name"
                className="col-span-3"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileAdded(file);
                }}
                />
            </div>
          </div>
          <div className="max-h-[35vh] overflow-y-auto">
                {penyesNames.map((penya, index) => (
                    <div key={index} className="flex flex-row items-center gap-4 mb-2">
                      <Badge variant="outline" className="hover: cursor-pointer" onClick={() => {
                        const updated = [...penyesNames];
                        updated.splice(index, 1);
                        setPenyesNames(updated);
                      }}> - </Badge>
                        <Label htmlFor="name" className="text-right">
                            Penya {index + 1}
                        </Label>
                        <Input
                            id="name"
                            value={penya}
                            className="col-span-3 flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                const isEmpty = penyesNames[index] === "";

                                if (isEmpty) {
                                  const updated = [...penyesNames];
                                  updated.splice(index, 1);
                                  setPenyesNames(updated);
                                }
                              }
                            }}

                            onChange={(e) => {
                                const newPenyesNames = [...penyesNames];

                                if(e.target.value.length > newPenyesNames[index].length && index == newPenyesNames.length - 1) 
                                  newPenyesNames.push("");
                                
                                newPenyesNames[index] = e.target.value;
                                setPenyesNames(newPenyesNames);
                            }}
                        />

                        {index < updatePenyesNamesState.length && updatePenyesNamesState[index] != "3" ? (
                            <Badge variant="default" className="h-7">
                                {updatePenyesNamesState[index] == "2" ? <Loader className="h-8 w-4" /> : null}
                                {updatePenyesNamesState[index] == "1" ? <Check color="green" size={30} /> : null}
                                {updatePenyesNamesState[index] == "0" ? <Ban color="red" className="h-8 w-4" /> : null}
                            </Badge>
                        ) : null}

                    </div>
                ))}
            </div>
            <div className="flex flex-row items-center mt-4">
                <Button variant="default" className="mr-2" onClick={() => addNewPenya()}>+</Button>
                <Button
                    variant="outline"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseOut}
                    >
                    -
                    </Button>
            </div>
          <DialogFooter>
            <Button disabled={penyesNames.length == 0} type="submit" onClick={handleClick}>{penyesNames.length == 1 ? "Crear penya" : "Crear Penyes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
    );
}
