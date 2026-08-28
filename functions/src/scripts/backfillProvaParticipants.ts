/**
 * One-off migration: populates the `penyes` field on every existing
 * Prova/SubProva doc from its current Participants subcollection, using the
 * exact same logic as the onWrite Cloud Functions in
 * proves/updateProvaParticipants.ts. Needed because those functions only
 * fire on *future* writes — proves that already have participants and don't
 * get touched again would otherwise never get the field.
 *
 * NOT exported from index.ts — this never gets deployed as a Cloud Function.
 * Run it once, locally, after deploying onProvaParticipantWritten /
 * onSubProvaParticipantWritten and before shipping the client changes that
 * read `penyes` from the doc instead of the Participants subcollection.
 *
 * Usage (from functions/):
 *   gcloud auth application-default login   # once, if not already done
 *   npm run build
 *   node lib/scripts/backfillProvaParticipants.js
 */
import * as admin from "firebase-admin";
import { recomputeProvaParticipants } from "../proves/updateProvaParticipants";

admin.initializeApp();

async function main(): Promise<void> {
  const db = admin.firestore();

  const yearsSnap = await db.collection("Circuit").get();
  let provesDone = 0;
  let subProvesDone = 0;

  for (const yearDoc of yearsSnap.docs) {
    const year = yearDoc.id;
    const provesSnap = await db.collection(`Circuit/${year}/Proves`).get();

    for (const provaDoc of provesSnap.docs) {
      const provaId = provaDoc.id;

      await recomputeProvaParticipants(
        `Circuit/${year}/Proves/${provaId}/Participants`,
        `Circuit/${year}/Proves/${provaId}`
      );
      provesDone++;

      const subProvesSnap = await db
        .collection(`Circuit/${year}/Proves/${provaId}/SubProves`)
        .get();

      for (const subProvaDoc of subProvesSnap.docs) {
        const subProvaId = subProvaDoc.id;
        await recomputeProvaParticipants(
          `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Participants`,
          `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}`
        );
        subProvesDone++;
      }
    }
  }

  console.log(`Backfill complete: ${provesDone} proves, ${subProvesDone} subproves.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
