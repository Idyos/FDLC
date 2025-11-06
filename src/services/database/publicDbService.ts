// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, ProvaSummary, ProvaType, WinDirection, ChallengeResult, Prova, EmptyProva, ProvaResultData, ParticipatingPenya } from "@/interfaces/interfaces";
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
  const resultsRef = collection(db, `Circuit/${year}/Results`);

  // Estado local de ambas colecciones
  let penyes: PenyaInfo[] = [];
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
      totalPoints: penyaPoints.get(p.id) || 0,
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
    const proves: Prova[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();

      let prova = new EmptyProva();

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
      prova.winDirection = d.winDirection || "NONE";
      prova.location = d.location || undefined;
      prova.pointsRange = d.pointsRange || [];

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
    if (!prova.id) return;
    callback(prova);
  };

  // 1) Snapshot del documento principal
  const unsubDoc = onSnapshot(provaDocRef, (snap) => {
    const d = snap.data();
    if (!d) return;

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

    if (unsubParticipants) {
      unsubParticipants();
    }

  const participantsQuery =
    sort && prova.winDirection !== "NONE"
      ? query(
          participantsRef,
          orderBy("result", prova.winDirection === "ASC" ? "asc" : "desc"),
        )
      : participantsRef;
       
    unsubParticipants = onSnapshot(participantsQuery, (snap) => {
      let penyaIndex = 0;
      snap.docs.forEach((p) => {
        const d = p.data();

        const penya: ParticipatingPenya = {
          penyaId: typeof d.penyaId === "string" ? d.penyaId : p.id,
          name: typeof d.penyaName === "string" ? d.penyaName : "Sense nom",
          participates: d.participates !== false, // default true
          result:
            typeof d.result === "number"
              ? d.result
              : d.result != null
              ? Number(d.result)
              : undefined,
        };

        if (!penya.participates) return;

        penyaIndex++;
        penya.index = penyaIndex;

        prova.penyes.push(penya);
        });

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

  const unsubscribeProves = onSnapshot(provesRef, (snapshot) => {
    snapshot.docs.forEach((provaDoc) => {
      const provaId = provaDoc.id;
      const provaData = provaDoc.data();
      const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);

      const unsubscribeParticipant = onSnapshot(participantRef, (participantSnap) => {
        if (!participantSnap.exists()) return;

        const p = participantSnap.data();

        provisionalResults[provaId] = {
            id: provaId,
            name: provaData.name || provaId,
            reference: provaDoc.ref.path,
            imageUrl: provaData.imageUrl,
            startDate: provaData.startDate?.toDate?.() ?? null,
            finishDate: provaData.finishDate?.toDate?.() ?? null,
            challengeType: provaData.challengeType,
            isFinished: provaData.isFinished,
            isSecret: provaData.isSecret,
            position: p.participates ? p.index || undefined : undefined,
            participates: p.participates,
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