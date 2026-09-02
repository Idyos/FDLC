// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, ChallengeResult, Prova, EmptyProva, ParticipatingPenya, SubProvaConfig } from "@/interfaces/interfaces";
import { db } from "../../firebase/firebase";
import { collection, getDocs, getDoc, query, onSnapshot, orderBy, doc, Unsubscribe, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { rankParticipants } from "@/utils/sorting";

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
      console.error("Error fetching years:", error);
      if (onError) {
        onError(error);
      }
    });
}

/** One-shot list of penya id/name/isSecret (e.g. the favorites picker), sourced
 *  from the same denormalized Ranking/current doc as getRankingRealTime — the
 *  public side must never run a collection scan over Penyes just to get names. */
export const getPenyesNames = async (year: number): Promise<PenyaInfo[]> => {
  const rankingRef = doc(db, `Circuit/${year}/Ranking/current`);
  const snapshot = await getDoc(rankingRef);
  const entries = (snapshot.data()?.penyes ?? []) as Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    isSecret: boolean;
    totalPoints: number;
    position: number;
  }>;

  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    position: e.position,
    isSecret: e.isSecret,
    imageUrl: e.imageUrl ?? undefined,
    totalPoints: e.totalPoints,
  }));
};

/** Real-time list of penyes (name/image/secret) without points — ADMIN ONLY
 *  (the Dashboard, which needs it to reflect its own writes instantly rather
 *  than waiting on the Ranking Cloud Function's round trip; it combines this
 *  with a Results listener via computeRanking). The public side must never
 *  scan the Penyes collection — see getPenyesNames above. */
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

/** Public ranking, read from a single aggregated doc (Circuit/{year}/Ranking/current)
 *  kept up to date by a Cloud Function on every Penyes/Results write — 1 read
 *  per visit/reconnect instead of 1-per-penya. Not used by the admin Dashboard,
 *  which needs the raw per-prova results anyway and wants its own edits to
 *  reflect instantly rather than after the function's round trip; it still
 *  combines getPenyesRealTime + getResultsInfoRealTime via computeRanking.
 *
 *  Also hands back the doc's `updatedAt` (ms since epoch, or null if the doc
 *  doesn't exist yet) — callers that already keep this listener open can
 *  feed it to RankingFreshnessContext as a free invalidation signal for
 *  other caches, with no extra reads. */
export const getRankingRealTime = (
  year: number,
  callback: (data: PenyaInfo[], updatedAtMs: number | null) => void
) => {
  const rankingRef = doc(db, `Circuit/${year}/Ranking/current`);

  return onSnapshot(rankingRef, (snap) => {
    const docData = snap.data();
    const entries = (docData?.penyes ?? []) as Array<{
      id: string;
      name: string;
      imageUrl: string | null;
      isSecret: boolean;
      totalPoints: number;
      position: number;
    }>;

    callback(
      entries.map((e) => ({
        id: e.id,
        name: e.name,
        position: e.position,
        isSecret: e.isSecret,
        imageUrl: e.imageUrl ?? undefined,
        totalPoints: e.totalPoints,
        directionChange: null,
      })),
      docData?.updatedAt?.toMillis?.() ?? null
    );
  });
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

/** Unpacks the `penyes` array the onProvaParticipantWritten /
 *  onSubProvaParticipantWritten Cloud Functions denormalize onto a
 *  Prova/SubProva doc (see functions/src/proves/updateProvaParticipants.ts)
 *  back into client-shaped ParticipatingPenya objects. */
function mapDenormalizedPenyes(raw: unknown): ParticipatingPenya[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((p) => ({
    penyaId: p.penyaId,
    name: p.name || "Sense nom",
    participates: p.participates !== false,
    result: p.result || undefined,
    participationTime: p.participationTime?.toDate?.() ?? null,
  }));
}

export const getProvaInfoRealTime = (
  year: number,
  provaId: string,
  sort: boolean = true,
  callback: (data: Prova) => void
): Unsubscribe => {
  const provaDocRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const prova = new EmptyProva();

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
    prova.winDirection = d.winDirection || null;
    prova.location = d.location || undefined;
    prova.imagesLink = d.imagesLink || undefined;
    prova.rulesUrl = d.rulesUrl || undefined;
    prova.pointsRange = d.pointsRange || [];
    prova.intervalMinutes = d.intervalMinutes ?? undefined;
    prova.maxPenyesPerSlot = d.maxPenyesPerSlot ?? undefined;

    // Non-participating penyes never show up in the public list — matches
    // the pre-denormalization behavior (they used to be dropped before the
    // valid/invalid split, not just sorted last).
    const participating = mapDenormalizedPenyes(d.penyes).filter((p) => p.participates);
    prova.penyes = rankParticipants(participating, sort ? (prova.winDirection || "NONE") : "NONE");

    if (prova.id) callback(prova);
  });

  return unsubDoc;
};

/** One-shot ranking for a finished "Rondes" prova, read straight from the
 *  Participants subcollection instead of the denormalized `penyes` array.
 *  Rondes provas never populate a `result` field (there's nothing for a
 *  participant to type in — the bracket decides the outcome), so the
 *  regular denormalized-`penyes` + rankParticipants() pipeline (built around
 *  `result` as the "did this team get ranked" signal) always treats every
 *  team as unranked once challengeType is Rondes. `position`/`pointsAwarded`
 *  are what generateBracketResults actually denormalizes onto each
 *  Participant doc when the bracket is closed, so this reads those directly. */
export const getRondesProvaResults = async (
  year: number,
  provaId: string
): Promise<ParticipatingPenya[]> => {
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);
  const snap = await getDocs(participantsRef);

  const penyes: ParticipatingPenya[] = snap.docs.map((d) => {
    const r = d.data();
    const position = typeof r.position === "number" ? r.position : undefined;
    return {
      penyaId: r.penyaId ?? d.id,
      name: r.penyaName ?? "",
      participates: (r.participates ?? true) && !!position && position > 0,
      result: position && position > 0 ? String(position) : "",
      index: position,
      participationTime: r.participationTime?.toDate?.() ?? null,
    };
  });

  penyes.sort((a, b) => {
    if (a.participates !== b.participates) return a.participates ? -1 : 1;
    if (a.participates) return (a.index ?? 0) - (b.index ?? 0);
    return a.name.localeCompare(b.name);
  });

  return penyes;
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

/** Real-time equivalent of getPenyaInfo — just this single penya's doc, so
 *  PenyaPage reflects an admin edit (name/photo/secret) live without a
 *  refresh, without paying for a listener over every penya. */
export const getPenyaInfoRealTime = (
  year: number,
  penyaId: string,
  callback: (data: PenyaInfo | null) => void
): Unsubscribe => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);

  return onSnapshot(penyaRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snapshot.id,
      name: snapshot.data().name || snapshot.id,
      position: 0,
      isSecret: snapshot.data().isSecret || false,
      imageUrl: snapshot.data().imageUrl || undefined,
      description: snapshot.data().description || undefined,
    });
  });
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
        summary.lastRoundPlayed = typeof p.lastRoundPlayed === "number" ? p.lastRoundPlayed : undefined;
        summary.hasWon = typeof p.hasWon === "boolean" ? p.hasWon : undefined;
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
    const list = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, penyes: mapDenormalizedPenyes(data.penyes) } as SubProvaConfig;
    });
    callback(list);
  });
};
