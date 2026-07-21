import { randomUUID } from "node:crypto";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onCustomEventPublished } from "firebase-functions/v2/eventarc";

// Extension is installed in europe-west4 (see Firebase console > Extensions).
const EXTENSION_REGION = "europe-west4";

interface ResizedImageResult {
  size: string;
  outputFilePath: string;
  success: boolean;
}

interface ResizeSuccessEventData {
  input: { bucket: string; name: string; contentType?: string };
  outputs: PromiseSettledResult<ResizedImageResult>[];
}

/**
 * The storage-resize-images extension writes the resized file to a new
 * object instead of replacing the original, so addImageToPenyes/addImageToChallenges
 * (src/services/storageService.ts) keep pointing Firestore's `imageUrl` at the
 * full-size original. This listens for the extension's onSuccess lifecycle event
 * and repoints `imageUrl` at the resized file once it exists.
 */
export const onImageResizedFn = onCustomEventPublished<ResizeSuccessEventData>(
  {
    eventType: "firebase.extensions.storage-resize-images.v1.onSuccess",
    channel: `locations/${EXTENSION_REGION}/channels/firebase`,
    region: EXTENSION_REGION,
  },
  async (event) => {
    const originalPath = event.subject;
    if (!originalPath) return;

    const successfulOutput = event.data.outputs.find(
      (output): output is PromiseFulfilledResult<ResizedImageResult> =>
        output.status === "fulfilled" && output.value.success
    );
    if (!successfulOutput) {
      logger.warn(`Cap redimensionament amb èxit per a ${originalPath}`);
      return;
    }
    const resizedPath = successfulOutput.value.outputFilePath;

    const [root, year, collectionName, docId] = originalPath.split("/");
    if (root !== "Circuit" || !docId || (collectionName !== "Penyes" && collectionName !== "Proves")) {
      logger.warn(`No s'ha pogut relacionar ${originalPath} amb cap document de Firestore`);
      return;
    }

    const bucketName = event.data.input.bucket;
    const token = randomUUID();
    await admin
      .storage()
      .bucket(bucketName)
      .file(resizedPath)
      .setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });

    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(resizedPath)}?alt=media&token=${token}`;

    const docPath = `Circuit/${year}/${collectionName}/${docId}`;
    await admin.firestore().doc(docPath).update({ imageUrl: downloadURL });
    logger.info(`${docPath} actualitzat amb la imatge redimensionada ${resizedPath}`);
  }
);
