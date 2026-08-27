import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

type RankingEntry = {
  id: string;
  name: string;
  imageUrl: string | null;
  isSecret: boolean;
  totalPoints: number;
  position: number;
};

/** Recomputes the full public ranking for a year and writes it to a single
 *  doc (Circuit/{year}/Ranking/current). Runs only on admin writes to Penyes
 *  or Results — never on public reads — so the public site can subscribe to
 *  one doc instead of paying a read per penya on every visit. */
async function recomputeRanking(year: string): Promise<void> {
  const db = admin.firestore();

  const [penyesSnap, resultsSnap] = await Promise.all([
    db.collection(`Circuit/${year}/Penyes`).get(),
    db.collection(`Circuit/${year}/Results`).get(),
  ]);

  const pointsByPenya = new Map<string, number>();
  resultsSnap.docs.forEach((resultDoc) => {
    const results: Record<string, unknown>[] = resultDoc.data().results ?? [];
    results.forEach((r) => {
      const penyaId = r.penyaId as string | undefined;
      if (!penyaId) return;
      const points = (r.pointsAwarded as number | undefined) ?? 0;
      pointsByPenya.set(penyaId, (pointsByPenya.get(penyaId) ?? 0) + points);
    });
  });

  const entries: RankingEntry[] = penyesSnap.docs
    .map((penyaDoc) => {
      const d = penyaDoc.data();
      return {
        id: penyaDoc.id,
        name: d.name || penyaDoc.id,
        imageUrl: d.imageUrl || null,
        isSecret: d.isSecret || false,
        totalPoints: pointsByPenya.get(penyaDoc.id) ?? 0,
        position: 0,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  await db.doc(`Circuit/${year}/Ranking/current`).set({
    penyes: entries,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export const onPenyaWrittenFn = onDocumentWritten(
  { document: "Circuit/{year}/Penyes/{penyaId}", region: "europe-west1" },
  async (event) => {
    await recomputeRanking(event.params.year);
  }
);

export const onResultsWrittenFn = onDocumentWritten(
  { document: "Circuit/{year}/Results/{resultId}", region: "europe-west1" },
  async (event) => {
    await recomputeRanking(event.params.year);
  }
);
