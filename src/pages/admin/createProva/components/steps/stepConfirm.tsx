import { Button } from "@/components/ui/button";
import ProvaInfoCard from "@/components/shared/Prova/provaInfoCard";
import { LoaderCircle } from "lucide-react";
import { ProvaInfo } from "@/interfaces/interfaces";

export default function StepConfirm({ provaInfo, creatingProva }:{
  provaInfo: ProvaInfo; creatingProva: number;
}) {
  return (
    <>
      <ProvaInfoCard prova={provaInfo} />
      <Button type="submit" disabled={creatingProva !== 0}>
        {creatingProva === 0 ? "Crear prova" : creatingProva === 1 ? <LoaderCircle className="animate-spin mr-2" /> : "Prova creada!"}
      </Button>
    </>
  );
}
