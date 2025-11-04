// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, ProvaSummary, PenyaRankingSummary, SingleProvaResultData, ProvaInfo, ProvaType, WinDirection, ChallengeResult } from "@/interfaces/interfaces";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, onSnapshot, orderBy, doc, Unsubscribe } from "firebase/firestore";
import { toast } from "sonner";



export const getYears = async (
  onSuccess: (data: number[]) => void,
  onError?: (error: unknown) => void
) => {
  const yearsRef = collection(db, "Circuit");

  return getDocs(yearsRef)
    .then((snapshot) => {
      const years = snapshot.docs.map((doc) => parseInt(doc.id));
      onSuccess(years);
    })
    .catch((error) => {
      toast.error(`Error al recuperar els anys: ${error.message}`);
      console.error("Error fetching years:", error);
      if (onError) {
        onError(error);
      }
    });
}

export const getRankingRealTime = (
  year: number,
  callback: (data: PenyaRankingSummary[]) => void
) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);
  const resultsRef = collection(db, `Circuit/${year}/Results`);

  // Estado local de ambas colecciones
  let penyes: PenyaRankingSummary[] = [];
  let resultsDocs: any[] = [];

  // 🔁 Función que recalcula el ranking combinando penyes + results
  const recomputeRanking = () => {
    if (penyes.length === 0) return;

    // 1️⃣ Crear mapa con puntos acumulados por penya
    const penyaPoints = new Map<string, number>();
    resultsDocs.forEach((docSnap) => {
      const provaData = docSnap.data();
      const results: ChallengeResult[] = provaData.results || [];
      results.forEach((r) => {
        penyaPoints.set(
          r.penyaId,
          (penyaPoints.get(r.penyaId) || 0) + (r.pointsAwarded || 0)
        );
      });
    });

    // 2️⃣ Combinar penyes + puntos
    const combined = penyes.map((p) => ({
      ...p,
      totalPoints: penyaPoints.get(p.penyaId) || 0,
    }));

    // 3️⃣ Ordenar y asignar posiciones
    const sorted = combined
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((item, index) => ({
        ...item,
        position: index + 1,
      }));

    // 4️⃣ Emitir resultado al callback
    callback(sorted);
  };

  // 1️⃣ Escucha de penyes
  const unsubPenyes = onSnapshot(penyesRef, (penyesSnap) => {
    penyes = penyesSnap.docs.map((doc) => ({
      penyaId: doc.id,
      name: doc.data().name || doc.id,
      totalPoints: 0,
      imageUrl: doc.data().imageUrl || undefined,
      position: 0,
      directionChange: null,
      isSecret: doc.data().isSecret || false,
    }));
    recomputeRanking(); // 🔁 recalcula cuando cambian penyes
  });

  // 2️⃣ Escucha de resultados
  const unsubResults = onSnapshot(resultsRef, (snapshot) => {
    resultsDocs = snapshot.docs;
    recomputeRanking(); // 🔁 recalcula cuando cambian resultados
  });

  return () => {
    unsubPenyes();
    unsubResults();
  };
};

export const getProvesRealTime = (year: number, callback: (data: ProvaSummary[]) => void) => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);
  const q = query(provesRef, orderBy("startDate", "desc"));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      provaId: doc.id,
      imageUrl: doc.data().imageUrl || undefined,
      name: doc.data().name || doc.id,
      description: doc.data().description || undefined,
      startDate: doc.data().startDate?.toDate?.() ?? null,
      finishDate: doc.data().finishDate?.toDate?.() ?? null,
      challengeType: doc.data().challengeType ?? "Temps",
    }));

    callback(data);
  });
};

export const getProvaInfoRealTime = (
  year: number,
  provaId: string,
  sort: boolean = true,
  callback: (data: ProvaInfo) => void
): Unsubscribe => {
  const provaDocRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);

  let base: (Omit<ProvaInfo, "results"> & { challengeType?: ProvaType; winDirection?: WinDirection }) | null = null;
  let participants: Array<Omit<SingleProvaResultData, "provaType">> = [];

  let unsubParticipants: Unsubscribe | null = null;

  const emit = () => {
    if (!base) return;
    const results: SingleProvaResultData[] = participants.map((p) => ({
      ...p,
      provaType: base?.challengeType ?? "Temps",
    }));
    callback({ ...base, results });
  };

  // 1) Snapshot del documento principal
  const unsubDoc = onSnapshot(provaDocRef, (snap) => {
    const d = snap.data();
    if (!d) return;

    base = {
      provaId: snap.id,
      name: d.name || snap.id,
      description: d.description || undefined,
      isSecret: d.isSecret || false,
      imageUrl: d.imageUrl || undefined,
      location: d.location || undefined,
      winDirection: d.winDirection || "NONE",
      isFinished: d.isFinished || false,
      startDate: d.startDate?.toDate?.() ?? new Date(0),
      finishDate: d.finishDate?.toDate?.() ?? undefined,
      pointsRange: Array.isArray(d.pointsRange) ? d.pointsRange : [],
      challengeType: d.challengeType,
    };

    if (unsubParticipants) {
      unsubParticipants();
    }

  const participantsQuery =
    sort && base.winDirection !== "NONE"
      ? query(
          participantsRef,
          orderBy("result", base.winDirection === "ASC" ? "asc" : "desc"),
        )
      : participantsRef;
       
    unsubParticipants = onSnapshot(participantsQuery, (snap) => {
      let penyaIndex = 0;
      participants = snap.docs.map((p) => {
        const r = p.data() as any;
        if (r.participates === false) return null;
        penyaIndex++;

        return {
          index: penyaIndex,
          provaReference: provaDocRef.path,
          participates: r.participates ?? true,
          penyaName: r.penyaName ?? "",
          penyaId: r.penyaId ?? p.id,
          result: r.result == -1 ? "0" : r.result ?? "",
        };
      })
      .filter((p): p is NonNullable<typeof p> => !!p);

      emit();
    });

    emit();
  });

  return () => {
    unsubDoc();
    if (unsubParticipants) unsubParticipants();
  };
};

export const getPenyaInfoRealTime = (year: number, penyaId: string, callback: (data: PenyaInfo | null) => void) => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);

  return onSnapshot(penyaRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("No data found for penya:", penyaId);
      callback(null);
      return;
    }

    const data : PenyaInfo = {
      penyaId: snapshot.id,
      name: snapshot.data().name || snapshot.id,
      position: 0,
      isSecret: snapshot.data().isSecret || false,
      imageUrl: snapshot.data().imageUrl || undefined,
      description: snapshot.data().description || undefined,
    };

    callback(data);
  });
};

export const getPenyaProvesRealTime = (
  year: number,
  penyaId: string,
  callback: (data: PenyaProvaSummary[]) => void
) => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);

  const unsubscribes: (() => void)[] = [];
  const provisionalResults: Record<string, PenyaProvaSummary> = {};

  const unsubscribeProves = onSnapshot(provesRef, (snapshot) => {
    snapshot.docs.forEach((provaDoc) => {
      const provaId = provaDoc.id;
      const provaData = provaDoc.data();

      const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);

      const unsubscribeParticipant = onSnapshot(participantRef, (participantSnap) => {
        if (!participantSnap.exists()) return;

        const p = participantSnap.data();

        provisionalResults[provaId] = {
          provaId,
          imageUrl: provaData.imageUrl,
          name: provaData.name || provaId,
          startDate: provaData.startDate?.toDate?.() ?? null,
          finishDate: provaData.finishDate?.toDate?.() ?? null,
          provaReference: provaDoc.ref.path,
          result: p.result ?? null,
          participates: p.participates ?? false,
          challengeType: provaData.challengeType,
        };

        callback(Object.values(provisionalResults));
      });

      unsubscribes.push(unsubscribeParticipant);
    });
  });

  // devuelve una función que limpia todos los listeners
  return () => {
    unsubscribeProves();
    unsubscribes.forEach((u) => u());
  };
};