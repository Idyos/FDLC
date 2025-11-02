// pages/admin/createProva/useProvaPreviewSync.ts
import { useEffect } from "react";
import { PointsRange, ProvaInfo } from "@/interfaces/interfaces";
import { UseFormReturn } from "react-hook-form";
import { CreateChallenge } from "./createProvaData";

export function useProvaPreviewSync(
  form: UseFormReturn<CreateChallenge>,
  provaImage: File | null,
  provaInfo: ProvaInfo,
  setProvaInfo: (p: ProvaInfo) => void
) {
  useEffect(() => {
    const sub = form.watch(values => {
      const safePointsRange: PointsRange[] = (values.pointsRange ?? []).map(r => ({
        from: r?.from ?? 0,
        to: r?.to ?? 0,
        points: r?.points ?? 0,
      }));

      setProvaInfo({
        ...provaInfo,
        name: values.name ?? "",
        description: values.description ?? "",
        challengeType: values.challengeType ?? "Participació",
        startDate: values.startDate ?? new Date(),
        finishDate: values.endDate ?? undefined,
        location: values.location
          ? {
              lat: values.location.lat ?? null,
              lng: values.location.lng ?? null,
              name: values.location.name ?? null,
            }
          : undefined,
        pointsRange: safePointsRange,
        winDirection: values.winDirection ?? "NONE",
        imageUrl: provaImage ? URL.createObjectURL(provaImage) : provaInfo.imageUrl,
        isFinished: false,
        results: provaInfo.results ?? [],
        provaId: provaInfo.provaId ?? "",
      });
    });

    return () => sub.unsubscribe();
  }, [form, provaImage, provaInfo, setProvaInfo]);
}
