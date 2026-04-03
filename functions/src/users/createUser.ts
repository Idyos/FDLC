import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/https";
import { User } from "../types";

export const createUserFn = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Cal estar autenticat per crear usuaris.");
  }

  const { user, password } = request.data as { user: User; password?: string };

  if (!user?.displayName) {
    throw new HttpsError("invalid-argument", "Cal un nom d'usuari.");
  }

  const email =
    user.email.length === 0 ? `${user.displayName}@fdlc.com` : user.email;

  let uid: string;
  try {
    const userRecord = await admin.auth().createUser({
      email,
      displayName: user.displayName,
      ...(password ? { password } : {}),
    });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Ja existeix un usuari amb aquest email.");
    }
    throw new HttpsError("internal", "Error creant l'usuari a Auth.");
  }

  await admin.firestore().doc(`Users/${uid}`).set({
    uid,
    displayName: user.displayName,
    email,
    photoURL: user.photoURL ?? "",
    isTemporary: user.isTemporary ?? false,
    permissions: {
      penyes: user.permissions.penyes,
      proves: user.permissions.proves,
      ...(user.permissions.specificProvaId
        ? { specificProvaId: user.permissions.specificProvaId }
        : {}),
      users: user.permissions.users,
    },
  });

  return { uid, email };
});
