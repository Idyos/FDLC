import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ParticipatingPenya, ProvaType, provaTypes } from "@/interfaces/interfaces";
import PenyesGrid from "../penyesGrid";

type Props = {
  challengeType: ProvaType | undefined;
  penyaSearch: string; setPenyaSearch: (s: string) => void;
  filteredPenyes: ParticipatingPenya[];
  onTogglePenya: (index: number, checked: boolean) => void;
};

export default function StepTypeAndPenyes({
  challengeType, penyaSearch, setPenyaSearch, filteredPenyes, onTogglePenya
}: Props) {
  return (
    <>
      <div className="flex flex-row space-x-8">
        <FormField name="challengeType" render={({ field }) => (
          <FormItem id="challengeType">
            <FormLabel htmlFor="challengeType">Tipus de prova: *</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger id="challengeType"><SelectValue placeholder="Selecciona tipus" /></SelectTrigger></FormControl>
              <SelectContent position="popper">
                {provaTypes.map((t, idx) => <SelectItem key={idx} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {(challengeType === "Temps" || challengeType === "Punts") && (
          <FormField name="winDirection" render={({ field }) => (
            <FormItem id="winDirection">
              <FormLabel>Com es guanya: *</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl><SelectTrigger id="winDirection"><SelectValue placeholder="Selecciona forma de guanyar" /></SelectTrigger></FormControl>
                <SelectContent position="popper">
                  <SelectItem value="NONE">Cap</SelectItem>
                  <SelectItem value="DESC">{challengeType === "Punts" ? "Com més punts millor" : "Com més temps millor"}</SelectItem>
                  <SelectItem value="ASC">{challengeType === "Punts" ? "Com menys punts millor" : "Com menys temps millor"}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>

      {(!challengeType || challengeType === "Participació")
        ? null
        : (
          <FormField name="penyes" render={({ field }) => (
            <FormItem id="penyes">
              <FormLabel>Penyes que hi participen: *</FormLabel>
              <Input value={penyaSearch} id="penya" placeholder="Buscar penya" onChange={(e) => setPenyaSearch(e.target.value)} />
              <PenyesGrid
                items={filteredPenyes}
                checkedByIndex={(i) => filteredPenyes[i].participates}
                onToggle={(i, checked) => {
                  const updated = [...(field.value || [])];
                  updated[i] = { ...updated[i], participates: !!checked };
                  field.onChange(updated);
                  onTogglePenya(i, !!checked);
                }}
              />
              <FormMessage />
            </FormItem>
          )} />
        )
      }
    </>
  );
}
