// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, ChallengeResult, Prova, EmptyProva, ParticipatingPenya, PenyaProvaResultData } from "@/interfaces/interfaces";
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
  callback: (data: PenyaInfo[]) => void
) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);

  let penyes: PenyaInfo[] = [];
  let resultsDocs: ChallengeResult[] = [];

  // 🔁 Función que recalcula el ranking combinando penyes + results
  const recomputeRanking = () => {
    if (penyes.length === 0) return;

    const penyaPoints = new Map<string, ChallengeResult[]>();
    resultsDocs.forEach((resultPenya) => {
      if(!penyaPoints.has(resultPenya.penyaId)){
        penyaPoints.set(resultPenya.penyaId, []);
      }
      penyaPoints.get(resultPenya.penyaId)?.push(resultPenya);
    });

    const combined = penyes.map((p) => ({
      ...p,
      totalPoints: penyaPoints.get(p.id)?.reduce((acc, curr) => acc + (curr.pointsAwarded || 0), 0) || 0,
    }));

    // 3️⃣ Ordenar y asignar posiciones
    const sorted = combined
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .map((item, index) => ({
        ...item,
        position: index + 1,
      }));

    callback(sorted);
  };

  // 1️⃣ Escucha de penyes
  const unsubPenyes = onSnapshot(penyesRef, (penyesSnap) => {
    penyes = penyesSnap.docs.map((doc) => ({
      id: doc.id,
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
  const unsubResults = getResultsInfoRealTime(year, (results) => {
    resultsDocs = results;
    recomputeRanking(); // 🔁 recalcula cuando cambian resultados
  });

  return () => {
    unsubPenyes();
    unsubResults();
  };
};

export const getProvesRealTime = (year: number, callback: (data: PenyaProvaSummary[]) => void) => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);
  const q = query(provesRef, orderBy("startDate", "desc"));

  return onSnapshot(q, (snapshot) => {
    const proves: PenyaProvaSummary[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();

      let prova = new PenyaProvaSummary();

      prova.id = docSnap.id;
      prova.reference = provesRef.path;
      prova.name = d.name || docSnap.id;
      prova.description = d.description || "";
      prova.imageUrl = d.imageUrl || undefined;
      prova.isSecret = d.isSecret || false;
      prova.isFinished = d.isFinished || false;
      prova.startDate = d.startDate?.toDate?.() ?? new Date(0);
      prova.finishDate = d.finishDate?.toDate?.() ?? undefined;
      prova.challengeType = d.challengeType || "null";
      prova.participates = d.participates || true;

      return prova;
    });

    callback(proves);
  });
};

export const getProvaInfoRealTime = (
  year: number,
  provaId: string,
  sort: boolean = true,
  callback: (data: Prova) => void
): Unsubscribe => {
  const provaDocRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);
  const prova = new EmptyProva();

  let unsubParticipants: Unsubscribe | null = null;

  const emit = () => {
    if (prova.id) callback(prova);
  };

  const unsubDoc = onSnapshot(provaDocRef, (snap) => {
    const d = snap.data();
    if (!d) return;

    const oldWinDir = prova.winDirection;

    prova.id = snap.id;
    prova.reference = provaDocRef.path;
    prova.name = d.name || snap.id;
    prova.description = d.description || undefined;
    prova.imageUrl = d.imageUrl || undefined;
    prova.isSecret = d.isSecret || false;
    prova.isFinished = d.isFinished || false;
    prova.startDate = d.startDate?.toDate?.() ?? new Date(0);
    prova.finishDate = d.finishDate?.toDate?.() ?? undefined;
    prova.challengeType = d.challengeType || "null";
    prova.winDirection = d.winDirection || "NONE";
    prova.location = d.location || undefined;
    prova.pointsRange = d.pointsRange || [];

    if (sort && oldWinDir !== prova.winDirection) {
      if (unsubParticipants) unsubParticipants();

      const participantsQuery =
        sort && prova.winDirection !== "NONE"
          ? query(
              participantsRef,
              orderBy("result", prova.winDirection === "ASC" ? "asc" : "desc")
            )
          : participantsRef;

      unsubParticipants = onSnapshot(participantsQuery, (snap) => {
        const validPenyes: ParticipatingPenya[] = [];
        const invalidPenyes: ParticipatingPenya[] = [];

        snap.docs.forEach((p) => {
          const d = p.data();
          const penya: ParticipatingPenya = {
            penyaId: typeof d.penyaId === "string" ? d.penyaId : p.id,
            name: typeof d.penyaName === "string" ? d.penyaName : "Sense nom",
            participates: d.participates !== false,
            result:
              typeof d.result === "number"
                ? d.result
                : d.result != null
                ? Number(d.result)
                : undefined,
          };

          if (!penya.participates) return;

          if (penya.result === -1 || penya.result === undefined || penya.result === null) {
            invalidPenyes.push(penya);
          } else {
            validPenyes.push(penya);
          }
        });

        if (sort && prova.winDirection !== "NONE") {
          validPenyes.sort((a, b) => {
            const resA = a.result ?? 0;
            const resB = b.result ?? 0;
            return prova.winDirection === "ASC" ? resA - resB : resB - resA;
          });
        }

        invalidPenyes.sort((a, b) => a.name.localeCompare(b.name));

        const combined = [...validPenyes, ...invalidPenyes];
        combined.forEach((penya, index) => (penya.index = index + 1));

        prova.penyes = combined;
        emit();
      });
    }

    emit();
  });


  return () => {
    unsubDoc();
    if (unsubParticipants) unsubParticipants();
  };
};

export const getPenyaResultsInfoRealTime = (
  year: number,
  penyaId: string,
  callback: (data: ChallengeResult[]) => void
) => {
  const resultsRef = collection(db, `Circuit/${year}/Results`);

  return onSnapshot(resultsRef, (proves) => {
    
    const resultsData: ChallengeResult[] = proves.docs
      .map((prova) => {
        const d = prova.data();
        const provaRef = `Circuit/${year}/Proves/${d.provaId}`;
        const results: any[] = d.results || [];
        const penyaResult = results.find((r) => r.penyaId === penyaId);

        if (!penyaResult) return undefined;

        const base = new PenyaProvaResultData(
          provaRef,
          d.challengeType || "null",
          penyaResult.penyaId || "",
          penyaResult.name || "NO_NAME",
          penyaResult.result || 0,
          penyaResult.position > 0,
          penyaResult.position ?? -1
        );

        return new ChallengeResult(base, penyaResult.pointsAwarded || 0);
      })
      .filter((r): r is ChallengeResult => r !== undefined);

    callback(resultsData);
  });
};


export const getResultsInfoRealTime = (
  year: number,
  callback: (data: ChallengeResult[]) => void
) => {
  const resultsRef = collection(db, `Circuit/${year}/Results`);

  return onSnapshot(resultsRef, (proves) => {
    const resultsData: ChallengeResult[] = proves.docs
      .flatMap((prova) => {
        const d = prova.data();
        const provaRef = `Circuit/${year}/Proves/${d.provaId}`;
        const results: any[] = d.results || [];

        return results.map((provaPenyaResult) => ({
          index: provaPenyaResult.position ?? -1,
          provaReference: provaRef,
          provaType: d.challengeType || "null", 
          participates: provaPenyaResult.position > 0 ? true : false,
          penyaId: provaPenyaResult.penyaId || "",
          penyaName: provaPenyaResult.name || "NO_NAME",
          result: provaPenyaResult.result || 0,
          pointsAwarded: provaPenyaResult.pointsAwarded || 0,
        }));
      });

    callback(resultsData);
  });
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
      id: snapshot.id,
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

  // 🔹 1️⃣ Escuchar todas las proves
  const unsubscribeProves = onSnapshot(provesRef, (snapshot) => {
    snapshot.docs.forEach((provaDoc) => {
      const provaId = provaDoc.id;
      const provaData = provaDoc.data();

      // 🔹 Crear la instancia base del resumen
      const provaSummary = new PenyaProvaSummary();
      provaSummary.id = provaId;
      provaSummary.reference = provaDoc.ref.path;
      provaSummary.name = provaData.name || provaId;
      provaSummary.imageUrl = provaData.imageUrl;
      provaSummary.startDate = provaData.startDate?.toDate?.() ?? new Date(0);
      provaSummary.finishDate = provaData.finishDate?.toDate?.() ?? undefined;
      provaSummary.challengeType = provaData.challengeType || "null";
      provaSummary.isFinished = provaData.isFinished || false;
      provaSummary.isSecret = provaData.isSecret || false;
      provaSummary.participates = false;
      provaSummary.position = undefined;
      provaSummary.result = undefined;
      provaSummary.points = undefined;

      // Guardar provisionalmente (en caso de que no haya resultados aún)
      provisionalResults[provaId] = provaSummary;

      // 🔹 2️⃣ Escuchar la participación de esta penya
      const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);
      const unsubscribeParticipant = onSnapshot(participantRef, (participantSnap) => {
        if (!participantSnap.exists()) return;

        const p = participantSnap.data();
        const summary = provisionalResults[provaId] ?? new PenyaProvaSummary();

        summary.participates = p.participates ?? false;
        summary.position = p.participates ? p.index || undefined : undefined;
        summary.result = p.result ?? undefined;

        // 🔹 3️⃣ Si la prova está finalizada, obtener puntos desde los Results
        if (provaData.isFinished) {
          const unsubResult = getPenyaResultsInfoRealTime(year, penyaId, (results) => {
            const match = results.find((r) => r.provaReference === provaDoc.ref.path);
            if (match) {
              summary.points = match.pointsAwarded ?? 0;
              summary.position = match.index ?? summary.position;
              summary.result = match.result ?? summary.result;
            }

            provisionalResults[provaId] = summary;
            callback(Object.values(provisionalResults));
          });

          unsubscribes.push(unsubResult);
        } else {
          provisionalResults[provaId] = summary;
          callback(Object.values(provisionalResults));
        }
      });

      unsubscribes.push(unsubscribeParticipant);
    });
  });

  return () => {
    unsubscribeProves();
    unsubscribes.forEach((u) => u());
  };
};
