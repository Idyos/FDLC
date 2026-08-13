import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/https";

export const deletePenyaFn = onCall({ cors: true, region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Cal estar autenticat per eliminar penyes.");
  }

  const { year, penyaId } = request.data as { year: number; penyaId: string };

  if (!year || !penyaId) {
    throw new HttpsError("invalid-argument", "Cal un any i un id de penya.");
  }

  // Verify the caller has penyes delete permission
  const userDoc = await admin.firestore().doc(`Users/${request.auth.uid}`).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "Usuari no trobat.");
  }
  const penyesPerms: string[] = userDoc.data()?.permissions?.penyes ?? [];
  if (!penyesPerms.includes("delete") && !penyesPerms.includes("*")) {
    throw new HttpsError("permission-denied", "No tens permís per eliminar penyes.");
  }

  const db = admin.firestore();

  // Collect all write operations across potentially multiple batches (Firestore limit: 500/batch)
  let batch = db.batch();
  let batchCount = 0;
  const batches: admin.firestore.WriteBatch[] = [batch];

  const enqueue = (op: (b: admin.firestore.WriteBatch) => void) => {
    if (batchCount === 499) {
      batch = db.batch();
      batches.push(batch);
      batchCount = 0;
    }
    op(batch);
    batchCount++;
  };

  // 1. Delete the penya document
  enqueue((b) => b.delete(db.doc(`Circuit/${year}/Penyes/${penyaId}`)));

  // 2. Per each prova: delete the participant + clean up subproves
  const provesSnap = await db.collection(`Circuit/${year}/Proves`).get();

  for (const provaDoc of provesSnap.docs) {
    const provaId = provaDoc.id;

    enqueue((b) =>
      b.delete(db.doc(`Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`))
    );

    const subProvesSnap = await db
      .collection(`Circuit/${year}/Proves/${provaId}/SubProves`)
      .get();

    for (const subProvaDoc of subProvesSnap.docs) {
      enqueue((b) =>
        b.delete(
          db.doc(
            `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaDoc.id}/Participants/${penyaId}`
          )
        )
      );
    }
  }

  // 3. Remove the penya from each Results array
  const resultsSnap = await db.collection(`Circuit/${year}/Results`).get();

  for (const resultDoc of resultsSnap.docs) {
    const results: Record<string, unknown>[] = resultDoc.data().results ?? [];
    const filtered = results.filter((r) => r.penyaId !== penyaId);
    if (filtered.length !== results.length) {
      enqueue((b) => b.update(resultDoc.ref, { results: filtered }));
    }
  }

  // Commit all batches in order
  for (const b of batches) {
    await b.commit();
  }


});
