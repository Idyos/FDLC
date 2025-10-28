// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, ProvaSummary, PenyaRankingSummary, SingleProvaResultData, ProvaInfo, ProvaType, WinDirection } from "@/interfaces/interfaces";
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


export const getRankingRealTime = (year: number, callback: (data: PenyaRankingSummary[]) => void) => {
  const rankingsRef = collection(db, `Circuit/${year}/Penyes`);
  const q = query(rankingsRef, orderBy("totalPoints", "desc"));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc, index) => ({
      penyaId: doc.id,
      name: doc.data().name || doc.id,
      totalPoints: doc.data().totalPoints || 0,
      imageUrl: doc.data().imageUrl || undefined,
      position: index + 1,
      directionChange: null,
      isSecret: doc.data().isSecret || false,
    }));

    callback(data);
  });
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
      startDate: d.startDate?.toDate?.() ?? new Date(0),
      finishDate: d.finishDate?.toDate?.() ?? undefined,
      pointsRange: Array.isArray(d.pointsRange) ? d.pointsRange : [],
      challengeType: d.challengeType,
    };

    if (unsubParticipants) {
      unsubParticipants();
    }

    const participantsQuery = sort && base.winDirection !== "NONE" 
    ? query(participantsRef, orderBy("result", base.winDirection === "ASC" ? "asc" : "desc"))
    : participantsRef; 
       
    unsubParticipants = onSnapshot(participantsQuery, (snap) => {
      participants = snap.docs.map((p) => {
        const r = p.data() as any;
        return {
          provaReference: provaDocRef.path,
          participates: r.participates ?? true,
          penyaName: r.penyaName ?? "",
          penyaId: r.penyaId ?? p.id,
          result: r.result ?? "",
        };
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
      penyaId: snapshot.id,
      name: snapshot.data().name || snapshot.id,
      totalPoints: snapshot.data().totalPoints || 0,
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
          position: p.position ?? null,
          points: p.points ?? null,
          participates: p.participates ?? false,
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