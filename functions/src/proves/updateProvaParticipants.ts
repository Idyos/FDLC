import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/https";
import { withBoundedRetries } from "../lib/withBoundedRetries";

type DenormalizedParticipant = {
  penyaId: string;
  name: string;
  participates: boolean;
  result: string;
  participationTime: admin.firestore.Timestamp | null;
};

function normalizeResult(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number") return raw < 0 ? "" : String(raw);
  return String(raw);
}

/** Duck-typed instead of `instanceof admin.firestore.Timestamp` — that
 *  constructor reference isn't reliably the *same* object across every
 *  runtime this code executes in (notably: the Functions emulator), so the
 *  instanceof check can throw "right-hand side of 'instanceof' is not an
 *  object" instead of just evaluating to false. A real Timestamp always has
 *  a `.toDate` method, which is all we actually need from it. */
function isTimestamp(value: unknown): value is admin.firestore.Timestamp {
  return typeof value === "object" && value !== null && typeof (value as { toDate?: unknown }).toDate === "function";
}

function buildDenormalizedParticipant(
  fallbackId: string,
  r: FirebaseFirestore.DocumentData
): DenormalizedParticipant {
  return {
    penyaId: typeof r.penyaId === "string" ? r.penyaId : fallbackId,
    name: typeof r.penyaName === "string" ? r.penyaName : "",
    participates: r.participates !== false,
    result: normalizeResult(r.result),
    participationTime: isTimestamp(r.participationTime) ? r.participationTime : null,
  };
}

/** A doc whose own `challengeType` is this never has its `penyes` read by
 *  anyone public: a MultiProva's own top-level roster is never rendered
 *  (PublicMultiProvaPanel reads each SubProva's `penyes` instead), and a
 *  Rondes subprova is rendered from its Bracket doc, not a results list.
 *  (A top-level Rondes prova is the opposite case — it DOES show a results
 *  list once finished, alongside the bracket — so this only applies to
 *  Rondes when it's a subprova, not at the top level.) */
function skippedChallengeType(targetRef: admin.firestore.DocumentReference): string {
  return targetRef.parent.id === "SubProves" ? "Rondes" : "MultiProva";
}

/** Full rebuild of the `penyes` list from the Participants subcollection —
 *  O(N) reads. Only for the two places that need an authoritative resync
 *  regardless of what the onWrite triggers below have or haven't kept up
 *  with: the one-off backfill script, and the admin's manual "recalcular"
 *  button. The onWrite triggers themselves use upsertOneParticipant instead,
 *  which costs O(1) — see there for why this one is too expensive to run on
 *  every single participant write. */
export async function recomputeProvaParticipants(
  participantsPath: string,
  targetDocPath: string
): Promise<void> {
  const db = admin.firestore();
  const targetRef = db.doc(targetDocPath);
  const targetSnap = await targetRef.get();
  const targetData = targetSnap.data();

  if (targetData?.challengeType === skippedChallengeType(targetRef)) {
    if (targetData.penyes !== undefined) {
      await targetRef.update({ penyes: admin.firestore.FieldValue.delete() });
    }
    return;
  }

  const participantsSnap = await db.collection(participantsPath).get();
  const penyes = participantsSnap.docs.map((d) => buildDenormalizedParticipant(d.id, d.data()));

  await targetRef.set({ penyes }, { merge: true });
}

/** Updates (or removes) a single entry in the target doc's `penyes` array —
 *  O(1) reads/writes, independent of how many penyes the prova has. The
 *  onWrite event already carries the changed participant's data, so there's
 *  no need to re-read the whole Participants subcollection just to touch one
 *  entry; we only need the target doc's *current* array, which a transaction
 *  reads once and is what keeps concurrent writes to different penyaIds
 *  (e.g. an admin batch-updating several participants at once) from
 *  clobbering each other.
 *
 *  Takes the event's own DocumentSnapshot rather than a path built from
 *  event.params: wildcard params come through Eventarc as a re-decoded
 *  string, which mangles non-ASCII doc IDs (prova/penya names with accents
 *  come out mojibake'd, e.g. "Megalodón" → "MegalodÃ³n") — and that garbled
 *  id then gets used to address a *different*, newly-created document. The
 *  snapshot's own `.ref` is the already-resolved reference the Firestore
 *  client library parsed, so it's never subject to that. */
async function upsertOneParticipant(
  afterSnap: admin.firestore.DocumentSnapshot
): Promise<void> {
  const targetRef = afterSnap.ref.parent.parent;
  if (!targetRef) return; // defensive: Participants is never a root collection

  const participantId = afterSnap.id;
  const afterData = afterSnap.exists ? afterSnap.data()! : null;
  const penyaId = typeof afterData?.penyaId === "string" ? afterData.penyaId : participantId;
  const updated = afterData ? buildDenormalizedParticipant(participantId, afterData) : null;

  const skipType = skippedChallengeType(targetRef);

  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const targetSnap = await tx.get(targetRef);
    const targetData = targetSnap.data();

    if (targetData?.challengeType === skipType) {
      if (targetData.penyes !== undefined) {
        tx.update(targetRef, { penyes: admin.firestore.FieldValue.delete() });
      }
      return;
    }

    const current = (targetData?.penyes ?? []) as DenormalizedParticipant[];
    const withoutThis = current.filter((p) => p.penyaId !== penyaId);
    const next = updated ? [...withoutThis, updated] : withoutThis; // null = doc was deleted

    tx.set(targetRef, { penyes: next }, { merge: true });
  });
}

// No `retry: true` here — bounded, in-process retries (see
// withBoundedRetries) handle transient failures instead. Eventarc's own
// retry has no attempt cap, only a time cap (up to 7 days), so a genuinely
// failing invocation would otherwise hammer Firestore with writes forever
// instead of giving up after a few tries.
export const onProvaParticipantWrittenFn = onDocumentWritten(
  {
    document: "Circuit/{year}/Proves/{provaId}/Participants/{participantId}",
    region: "europe-west1",
  },
  async (event) => {
    if (!event.data) return;
    await withBoundedRetries("onProvaParticipantWritten", () => upsertOneParticipant(event.data!.after));
  }
);

export const onSubProvaParticipantWrittenFn = onDocumentWritten(
  {
    document:
      "Circuit/{year}/Proves/{provaId}/SubProves/{subProvaId}/Participants/{participantId}",
    region: "europe-west1",
  },
  async (event) => {
    if (!event.data) return;
    await withBoundedRetries("onSubProvaParticipantWritten", () => upsertOneParticipant(event.data!.after));
  }
);

/** Manual escape hatch for admins: runs the full O(N) rebuild on demand, for
 *  one prova (and all of its subproves, if it's a MultiProva). Lets an admin
 *  fix a stale public `penyes` field themselves in one click — e.g. if a
 *  trigger genuinely failed, or a prova hasn't been touched since before
 *  these functions existed — instead of needing someone to run the backfill
 *  script. */
export const recomputeProvaParticipantsFn = onCall(
  { cors: true, region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Cal estar autenticat per recalcular participants.");
    }

    const { year, provaId } = request.data as { year: number; provaId: string };
    if (!year || !provaId) {
      throw new HttpsError("invalid-argument", "Cal un any i un id de prova.");
    }

    const db = admin.firestore();
    const userDoc = await db.doc(`Users/${request.auth.uid}`).get();
    if (!userDoc.exists) {
      throw new HttpsError("permission-denied", "Usuari no trobat.");
    }

    // Mirrors canEditResults() in firestore.rules: needs editResults (or *),
    // and if the user is scoped to a single prova, it must be this one.
    const permissions = userDoc.data()?.permissions ?? {};
    const provesPerms: string[] = permissions.proves ?? [];
    const hasEditResults = provesPerms.includes("editResults") || provesPerms.includes("*");
    const scopedToOtherProva =
      "specificProvaId" in permissions && permissions.specificProvaId !== provaId;

    if (!hasEditResults || scopedToOtherProva) {
      throw new HttpsError("permission-denied", "No tens permís per recalcular aquesta prova.");
    }

    await recomputeProvaParticipants(
      `Circuit/${year}/Proves/${provaId}/Participants`,
      `Circuit/${year}/Proves/${provaId}`
    );

    const subProvesSnap = await db
      .collection(`Circuit/${year}/Proves/${provaId}/SubProves`)
      .get();

    for (const subProvaDoc of subProvesSnap.docs) {
      await recomputeProvaParticipants(
        `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaDoc.id}/Participants`,
        `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaDoc.id}`
      );
    }
  }
);
