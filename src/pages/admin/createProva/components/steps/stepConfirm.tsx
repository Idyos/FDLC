import ProvaInfoCard from "@/components/shared/Prova/provaInfoCard";
import { Prova } from "@/interfaces/interfaces";

export default function StepConfirm({ provaInfo }: { provaInfo: Prova; }) {
  return <ProvaInfoCard prova={provaInfo} />;
}
