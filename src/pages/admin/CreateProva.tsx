import { LocationSelector } from "@/components/admin/locationSelector";
import { useYear } from "@/components/shared/YearContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BaseChallenge,
  ChallengeByPoints,
  ChallengeByTime,
  PenyaInfo,
  PointsRange,
  ProvaType,
  provaTypes,
  Ubication,
} from "@/interfaces/interfaces";
import { getPenyes } from "@/services/dbService";
import { useEffect, useRef, useState } from "react";

interface CreateProvaProps {
  name: string;
  description: string;
  type: ProvaType;
  points: PointsRange[];
  penyes: Array<ParticipatingPenya>;
  location?: Ubication | null;
}

interface ParticipatingPenya {
  penya: PenyaInfo;
  participates: boolean;
}

export default function CreateProva() {
  const { selectedYear } = useYear();
  const [location, setLocation] = useState<Ubication | null>(null);

  const [provaBase, setProvaBase] = useState<CreateProvaProps>({
    name: "",
    description: "",
    type: "Ninguna",
    points: [],
    penyes: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [penyaSearch, setPenyaSearch] = useState("");

    const filteredPenyes = provaBase.penyes.filter((penya) =>
        penya.penya.name.toLowerCase().includes(penyaSearch.toLowerCase())
    );

  useEffect(() => {
    setIsLoading(true);

    getPenyes(selectedYear, (data) => {
      setProvaBase({
        ...provaBase,
        penyes: data.map((penya: PenyaInfo) => ({ penya, participates: true })),
      });
      setIsLoading(false);
    });
  }, [selectedYear]);



  return (
    <Card className="max-h-[93svh] overflow-y-auto">
      <CardHeader>
        <CardTitle>Crear una prova nova</CardTitle>
        <CardDescription>
          Afegeix tota la informació necessària per crear la prova
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">Nom:</Label>
            <Input
              value={provaBase.name}
              id="name"
              placeholder="Nom de la prova"
              onChange={(e) =>
                setProvaBase({ ...provaBase, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="desc">Descripció:</Label>
            <Textarea
              value={provaBase.description}
              id="desc"
              placeholder="Descripció de la prova "
              onChange={(e) =>
                setProvaBase({ ...provaBase, description: e.target.value })
              }
            />
          </div>
            <div className="flex flex-col space-y-1.5">
            <Label htmlFor="desc">Ubicació:</Label>
            <LocationSelector />
          </div>
            
          <div className="space-y-1.5  space-x-10 flex flex-row">
            <div className="flex flex-col space-y-1.5 ">
            <Label htmlFor="challengeType">Tipus de prova:</Label>
            <Select
              value={provaBase.type}
              onValueChange={(value) => {
                setProvaBase({ ...provaBase, type: value as ProvaType });
              }}
            >
              <SelectTrigger id="challengeType">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent position="popper">
                {provaTypes.map((type: ProvaType, index) => (
                  <SelectItem key={index} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <div className="flex flex-col space-y-1.5 ">
            <Label htmlFor="test">Guanya qui:</Label>
            <Select
              value={provaBase.type}
              onValueChange={(value) => {
                setProvaBase({ ...provaBase, type: value as ProvaType });
              }}
            >
              <SelectTrigger id="test">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent position="popper">
                {provaTypes.map((type: ProvaType, index) => (
                  <SelectItem key={index} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>
          {provaBase.type == "Ninguna" ||
          provaBase.type == "Participació" ? null : isLoading ? (
            <p>Carregant penyes...</p>
          ) : (
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="points">Penyes que hi participen:</Label>
                <Input
                    value={penyaSearch}
                    id="penya"
                    placeholder="Buscar penya"
                    onChange={(e) => setPenyaSearch(e.target.value)}
                />
              <div className="grid grid-cols-[repeat(auto-fit,_minmax(160px,_1fr))] gap-2 w-full">
                {filteredPenyes.map((penya, index) => (
                    <Button variant="outline" className="h-15 flex flex-row justify-center items-center" key={index} onClick={() => {
                        setProvaBase((prevProvaBase) => ({
                            ...prevProvaBase,
                            penyes: prevProvaBase.penyes.map((p, i) =>
                                i === index
                                ? { ...p, participates: !p.participates }
                                : p
                            ),
                        }));
                    }}>
                        <Checkbox
                        id={`penya-${index}`}
                        checked={penya.participates}
                        />
                        <label
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                        {penya.penya.name}
                        </label>
                    </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Crear Prova</Button>
      </CardFooter>
    </Card>
  );
}
