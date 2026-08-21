// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, ChallengeResult, Prova, EmptyProva, ParticipatingPenya, SubProvaConfig } from "@/interfaces/interfaces";
import { db } from "../../firebase/firebase";
import { collection, getDocs, getDoc, query, onSnapshot, orderBy, doc, Unsubscribe, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { toast } from "sonner";

export const getYears = async (
  onSuccess: (data: number[]) => void,
  onError?: (error: unknown) => void
) => {
  const yearsRef = collection(db, "Circuit");

  return getDocs(yearsRef)
    .then((snapshot) => {
      const years = snapshot.docs.map((doc) => parseInt(doc.id));
      
      if(!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());
      
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

/** One-shot list of penya id/name/isSecret, for UI that only needs to search
 *  by name (e.g. the favorites picker) — no need for the ranking's totalPoints
 *  or a live listener just to populate a search box. */
export const getPenyesNames = async (year: number): Promise<PenyaInfo[]> => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);
  const snapshot = await getDocs(penyesRef);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name || doc.id,
    position: 0,
    isSecret: doc.data().isSecret || false,
    imageUrl: doc.data().imageUrl || undefined,
  }));
};

/** Real-time list of penyes (name/image/secret) without points — the
 *  building block getRankingRealTime and the Dashboard both combine with
 *  Results, so a Results listener is never opened twice for the same screen. */
export const getPenyesRealTime = (
  year: number,
  callback: (data: PenyaInfo[]) => void
) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);

  return onSnapshot(penyesRef, (penyesSnap) => {
    callback(
      penyesSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        imageUrl: doc.data().imageUrl || undefined,
        position: 0,
        directionChange: null,
        isSecret: doc.data().isSecret || false,
      }))
    );
  });
};

/** Totals are always derived from Results rather than stored/incremented
 *  anywhere — that way a manual edit to a Results doc (or a bug in a write
 *  path) can never leave a stale total lying around: there is no running
 *  counter to fall out of sync, only a sum recomputed from the source data. */
export function computeRanking(penyes: PenyaInfo[], results: ChallengeResult[]): PenyaInfo[] {
  if (penyes.length === 0) return [];

  const penyaPoints = new Map<string, number>();
  results.forEach((r) => {
    penyaPoints.set(r.penyaId, (penyaPoints.get(r.penyaId) ?? 0) + (r.pointsAwarded || 0));
  });

  return penyes
    .map((p) => ({ ...p, totalPoints: penyaPoints.get(p.id) ?? 0 }))
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .map((item, index) => ({ ...item, position: index + 1 }));
}

export const getRankingRealTime = (
  year: number,
  callback: (data: PenyaInfo[]) => void
) => {
  let penyes: PenyaInfo[] = [];
  let results: ChallengeResult[] = [];

  const emit = () => callback(computeRanking(penyes, results));

  const unsubPenyes = getPenyesRealTime(year, (data) => {
    penyes = data;
    emit();
  });
  const unsubResults = getResultsInfoRealTime(year, (data) => {
    results = data;
    emit();
  });

  return () => {
    unsubPenyes();
    unsubResults();
  };
};

function mapProvaSummary(provesRefPath: string, docSnap: QueryDocumentSnapshot<DocumentData>): PenyaProvaSummary {
  const d = docSnap.data();
  const prova = new PenyaProvaSummary();

  prova.id = docSnap.id;
  prova.reference = provesRefPath;
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
}

export const getProvesRealTime = (year: number, callback: (data: PenyaProvaSummary[]) => void) => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);
  const q = query(provesRef, orderBy("startDate", "desc"));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => mapProvaSummary(provesRef.path, docSnap)));
  });
};

/** One-shot equivalent of getProvesRealTime, for screens that don't need push
 *  updates (the schedule/list view — the live detail lives in ProvaPage). */
export const getProves = async (year: number): Promise<PenyaProvaSummary[]> => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);
  const q = query(provesRef, orderBy("startDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => mapProvaSummary(provesRef.path, docSnap));
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
    prova.winDirection = d.winDirection || null;
    prova.location = d.location || undefined;
    prova.imagesLink = d.imagesLink || undefined;
    prova.rulesUrl = d.rulesUrl || undefined;
    prova.pointsRange = d.pointsRange || [];
    prova.intervalMinutes = d.intervalMinutes ?? undefined;
    prova.maxPenyesPerSlot = d.maxPenyesPerSlot ?? undefined;

    if (sort && oldWinDir !== prova.winDirection) {
      if (unsubParticipants) unsubParticipants();

      const participantsQuery =
        sort && prova.winDirection !== "NONE"
          ? query(
              participantsRef,
              orderBy("result", prova.winDirection === "ASC" ? "asc" : "desc")
            )
          : participantsRef;

            console.log(participantsQuery, participantsRef);

      unsubParticipants = onSnapshot(participantsQuery, (snap) => {
        const validPenyes: ParticipatingPenya[] = [];
        const invalidPenyes: ParticipatingPenya[] = [];

        snap.docs.forEach((p) => {
          const d = p.data();

          const rawResult = d.result;
          const penya: ParticipatingPenya = {
            penyaId: typeof d.penyaId === "string" ? d.penyaId : p.id,
            name: typeof d.penyaName === "string" ? d.penyaName : "Sense nom",
            participates: d.participates !== false,
            result: rawResult == null ? undefined
              : typeof rawResult === "number" ? (rawResult < 0 ? "" : String(rawResult))
              : String(rawResult),
            participationTime: d.participationTime?.toDate?.() ?? null,
          };

          if (!penya.participates) return;

          if (!penya.result || penya.result === "") {
            invalidPenyes.push(penya);
          } else {
            validPenyes.push(penya);
          }
        });

        if (sort && prova.winDirection !== "NONE") {
          validPenyes.sort((a, b) => {
            const resA = a.result ? parseInt(a.result) : 0;
            const resB = b.result ? parseInt(b.result) : 0;
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
          index: provaPenyaResult.position > 0 ? provaPenyaResult.position : -1,
          provaReference: provaRef,
          provaType: d.challengeType || "null",
          participates: provaPenyaResult.position > 0 ? true : false,
          penyaId: provaPenyaResult.penyaId || "",
          penyaName: provaPenyaResult.name || "NO_NAME",
          result: typeof provaPenyaResult.result === "string" ? provaPenyaResult.result : "",
          pointsAwarded: provaPenyaResult.pointsAwarded || 0,
        }));
      });

    callback(resultsData);
  });
};


export const getPenyaInfo = async (year: number, penyaId: string): Promise<PenyaInfo | null> => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);
  const snapshot = await getDoc(penyaRef);

  if (!snapshot.exists()) {
    console.warn("No data found for penya:", penyaId);
    return null;
  }

  return {
    id: snapshot.id,
    name: snapshot.data().name || snapshot.id,
    position: 0,
    isSecret: snapshot.data().isSecret || false,
    imageUrl: snapshot.data().imageUrl || undefined,
    description: snapshot.data().description || undefined,
  };
};

/** One-shot read of a penya's history across every prova of the year.
 *  Not real-time on purpose: this is a personal-history page, and pointsAwarded/
 *  position are now denormalized onto each Participants doc at prova-close time
 *  (see generateProvaResults/generateBracketResults), so a single pass over
 *  Proves + one get per Participants doc is all that's needed — no more scanning
 *  the whole Results collection, and no more one-listener-per-prova. */
export const getPenyaProves = async (
  year: number,
  penyaId: string
): Promise<PenyaProvaSummary[]> => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);
  const provesSnap = await getDocs(provesRef);

  const summaries = await Promise.all(
    provesSnap.docs.map(async (provaDoc) => {
      const provaId = provaDoc.id;
      const provaData = provaDoc.data();

      const summary = new PenyaProvaSummary();
      summary.id = provaId;
      summary.reference = provaDoc.ref.path;
      summary.name = provaData.name || provaId;
      summary.imageUrl = provaData.imageUrl;
      summary.startDate = provaData.startDate?.toDate?.() ?? new Date(0);
      summary.finishDate = provaData.finishDate?.toDate?.() ?? undefined;
      summary.challengeType = provaData.challengeType || "null";
      summary.isFinished = provaData.isFinished || false;
      summary.isSecret = provaData.isSecret || false;

      const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);
      const participantSnap = await getDoc(participantRef);

      if (participantSnap.exists()) {
        const p = participantSnap.data();
        summary.participates = p.participates ?? false;
        summary.position = p.participates ? p.position ?? undefined : undefined;
        summary.result = p.result && p.result !== "" ? p.result : undefined;
        summary.points = p.pointsAwarded ?? undefined;
        summary.participationTime = p.participationTime?.toDate?.() ?? null;
      } else {
        summary.participates = false;
      }

      return summary;
    })
  );

  return summaries.sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));
};

export type MultiProvaFinalResult = {
  penyaId: string;
  name: string;
  position: number;
  pointsAwarded: number;
  result: string;
};

export const subscribeProvaFinalResults = (
  year: number,
  provaId: string,
  callback: (results: MultiProvaFinalResult[] | null) => void
): Unsubscribe => {
  const ref = doc(db, `Circuit/${year}/Results/${provaId}`);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback((snap.data().results ?? []) as MultiProvaFinalResult[]);
  });
};

export const subscribeSubProvas = (
  year: number,
  provaId: string,
  callback: (subProves: SubProvaConfig[]) => void
): Unsubscribe => {
  const ref = collection(db, `Circuit/${year}/Proves/${provaId}/SubProves`);
  const q = query(ref, orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubProvaConfig));
    callback(list);
  });
};

export const subscribeSubProvaParticipants = (
  year: number,
  provaId: string,
  subProvaId: string,
  callback: (participants: ParticipatingPenya[]) => void
): Unsubscribe => {
  const ref = collection(
    db,
    `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Participants`
  );
  return onSnapshot(ref, (snap) => {
    const participants = snap.docs.map((d) => {
      const r = d.data();
      const raw = r.result;
      return {
        penyaId: r.penyaId ?? d.id,
        name: r.penyaName ?? "",
        participates: r.participates ?? true,
        result: raw == null ? "" : typeof raw === "number" ? (raw < 0 ? "" : String(raw)) : String(raw),
        participationTime: r.participationTime?.toDate?.() ?? null,
      } as ParticipatingPenya;
    });
    callback(participants);
  });
};
