import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ParticipatingPenya, ProvaType, provaTypes } from "@/interfaces/interfaces";
import PenyesGrid from "../penyesGrid";

type Props = {
  challengeType: ProvaType | undefined;
  penyaSearch: string; setPenyaSearch: (s: string) => void;
  filteredPenyes: ParticipatingPenya[];
  onTogglePenya: (penyaId: string, checked: boolean) => void;
};

export default function StepTypeAndPenyes({
  challengeType, penyaSearch, setPenyaSearch, filteredPenyes, onTogglePenya
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField name="challengeType" render={({ field }) => (
          <FormItem id="challengeType">
            <FormLabel htmlFor="challengeType">Tipus de prova: *</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger id="challengeType"><SelectValue placeholder="Selecciona tipus" /></SelectTrigger></FormControl>
              <SelectContent position="popper">
                {provaTypes
                  .filter((t) => t !== "null")
                  .map((t, idx) => <SelectItem key={idx} value={t}>{t}</SelectItem>)}
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

      {(challengeType === "Temps" || challengeType === "Participació" || challengeType === "Punts") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField name="intervalMinutes" render={({ field }) => (
            <FormItem>
              <FormLabel>Interval entre torns (min):</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="p. ex. 20"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField name="maxPenyesPerSlot" render={({ field }) => (
            <FormItem>
              <FormLabel>Penyes simultànies màximes:</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="p. ex. 4"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

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
                  const penyaId = filteredPenyes[i].penyaId;
                  const updated = [...(field.value || [])];
                  const realIdx = updated.findIndex(p => p.penya.id === penyaId);
                  if (realIdx !== -1) {
                    updated[realIdx] = { ...updated[realIdx], participates: !!checked };
                    field.onChange(updated);
                  }
                  onTogglePenya(penyaId, !!checked);
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
