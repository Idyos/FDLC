import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { SubProvaConfig, PointsRange, ParticipatingPenya } from "@/interfaces/interfaces";
import { generateProvaResults, deriveBracketPositions } from "./adminProvesDbServices";
import { getProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getSubProvas(
  year: number,
  provaId: string
): Promise<SubProvaConfig[]> {
  const ref = collection(db, `Circuit/${year}/Proves/${provaId}/SubProves`);
  const snap = await getDocs(query(ref, orderBy("order", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubProvaConfig));
}

export async function getSubProvaParticipants(
  year: number,
  provaId: string,
  subProvaId: string
): Promise<ParticipatingPenya[]> {
  const ref = collection(
    db,
    `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Participants`
  );
  const snap = await getDocs(ref);
  return snap.docs.map((d) => {
    const r = d.data();
    return {
      penyaId: r.penyaId ?? d.id,
      name: r.penyaName ?? "",
      participates: r.participates ?? true,
      result: r.result ?? -1,
      participationTime: r.participationTime?.toDate?.() ?? null,
    } as ParticipatingPenya;
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function addSubProva(
  year: number,
  provaId: string,
  config: Omit<SubProvaConfig, "id">,
  parentParticipants: ParticipatingPenya[]
): Promise<string> {
  // Use name as doc ID (same convention as provas)
  const subProvaRef = doc(
    db,
    `Circuit/${year}/Proves/${provaId}/SubProves/${config.name}`
  );

  const batch = writeBatch(db);

  batch.set(subProvaRef, {
    name: config.name,
    challengeType: config.challengeType,
    winDirection: config.winDirection,
    order: config.order,
    intervalMinutes: config.intervalMinutes ?? null,
    maxPenyesPerSlot: config.maxPenyesPerSlot ?? null,
  });

  // Add all parent participants to this sub-prova
  for (const p of parentParticipants) {
    const participantRef = doc(
      db,
      `Circuit/${year}/Proves/${provaId}/SubProves/${config.name}/Participants/${p.penyaId}`
    );
    batch.set(participantRef, {
      penyaId: p.penyaId,
      penyaName: p.name,
      participates: true,
      result: -1,
      participationTime: null,
    });
  }

  await batch.commit();
  return config.name;
}

// ─── Update result ────────────────────────────────────────────────────────────

export async function updateSubProvaResult(
  year: number,
  provaId: string,
  subProvaId: string,
  penyaId: string,
  result: number
): Promise<void> {
  const ref = doc(
    db,
    `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Participants/${penyaId}`
  );
  await updateDoc(ref, { result });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteSubProva(
  year: number,
  provaId: string,
  subProvaId: string
): Promise<void> {
  const participantsRef = collection(
    db,
    `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Participants`
  );
  const subProvaRef = doc(
    db,
    `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}`
  );

  const snap = await getDocs(participantsRef);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(subProvaRef);
  await batch.commit();
}

// ─── Generate results ─────────────────────────────────────────────────────────

/** Calculates sub-prova points per team, writes the aggregate sum to the parent
 *  Participants, then delegates to the standard generateProvaResults(). */
export async function generateMultiProvaResults(
  year: number,
  provaId: string
): Promise<void> {
  // 1. Load parent prova (for pointsRange)
  const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const provaSnap = await getDoc(provaRef);
  if (!provaSnap.exists()) throw new Error("No s'ha trobat la prova.");
  const provaData = provaSnap.data();
  const pointsRange: PointsRange[] = provaData.pointsRange ?? [];

  // 2. Load all sub-provas
  const subProvasRef = collection(db, `Circuit/${year}/Proves/${provaId}/SubProves`);
  const subProvasSnap = await getDocs(subProvasRef);

  // 3. For each team: accumulate points from each sub-prova
  const teamPointsMap: Record<string, { penyaName: string; total: number }> = {};

  // Initialise map from parent participants so teams with 0 sub-prova points are included
  const parentParticipantsRef = collection(
    db,
    `Circuit/${year}/Proves/${provaId}/Participants`
  );
  const parentParticipantsSnap = await getDocs(parentParticipantsRef);
  parentParticipantsSnap.docs.forEach((d) => {
    const r = d.data();
    teamPointsMap[d.id] = { penyaName: r.penyaName ?? d.id, total: 0 };
  });

  for (const subProvaDoc of subProvasSnap.docs) {
    const subProvaData = subProvaDoc.data();
    const winDirection: string = subProvaData.winDirection ?? "NONE";

    // ── Rondes sub-prova: derive positions from bracket ──────────────────────
    if (subProvaData.challengeType === "Rondes") {
      const bracketDoc = await getProvaBracket(year, provaId, subProvaDoc.id);
      if (!bracketDoc) {
        throw new Error(`La subprova de rondes "${subProvaData.name ?? subProvaDoc.id}" no té cap quadre generat.`);
      }
      const positionMap = deriveBracketPositions(bracketDoc);
      if (positionMap.size === 0) {
        throw new Error(`La subprova de rondes "${subProvaData.name ?? subProvaDoc.id}" encara no té el quadre finalitzat.`);
      }
      for (const [penyaId, position] of positionMap) {
        const range = pointsRange.find((r) => position >= r.from && position <= r.to);
        const pts = range ? range.points : 0;
        if (teamPointsMap[penyaId]) {
          teamPointsMap[penyaId].total += pts;
        }
      }
      continue;
    }

    // ── Scalar sub-prova (Temps / Punts / Participació) ──────────────────────
    // Load participants for this sub-prova
    const participantsRef = collection(
      db,
      `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaDoc.id}/Participants`
    );
    const participantsSnap = await getDocs(participantsRef);
    const participants = participantsSnap.docs.map((d) => {
      const r = d.data();
      return { penyaId: r.penyaId ?? d.id, penyaName: r.penyaName ?? "", result: r.result ?? -1, participates: r.participates ?? true };
    });

    // Sort valid participants to determine positions
    const valid = participants.filter((p) => p.participates && p.result > -1);
    if (winDirection === "ASC") {
      valid.sort((a, b) => a.result - b.result);
    } else if (winDirection === "DESC") {
      valid.sort((a, b) => b.result - a.result);
    }

    // Map position → pointsRange → points
    valid.forEach((p, idx) => {
      const position = idx + 1;
      const range = pointsRange.find((r) => position >= r.from && position <= r.to);
      const pts = range ? range.points : 0;
      if (teamPointsMap[p.penyaId]) {
        teamPointsMap[p.penyaId].total += pts;
      }
    });
  }

  // 4. Write aggregate sums to parent Participants
  const batch = writeBatch(db);
  for (const [penyaId, data] of Object.entries(teamPointsMap)) {
    const ref = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);
    batch.update(ref, { result: data.total, participates: true });
  }
  await batch.commit();

  // 5. Delegate to standard result generation (uses winDirection DESC + pointsRange on parent)
  await generateProvaResults(year, provaId);
}
