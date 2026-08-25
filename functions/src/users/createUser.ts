import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/https";
import { User } from "../types";

export const createUserFn = onCall({ cors: true, region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Cal estar autenticat per crear usuaris.");
  }

  const callerDoc = await admin.firestore().doc(`Users/${request.auth.uid}`).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Usuari no trobat.");
  }
  const callerUsersPerms: string[] = callerDoc.data()?.permissions?.users ?? [];
  if (!callerUsersPerms.includes("create") && !callerUsersPerms.includes("*")) {
    throw new HttpsError("permission-denied", "No tens permís per crear usuaris.");
  }

  const { user, password } = request.data as { user: User; password: string };

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
      password,
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
    hasResetPassword: false,
    passwordLength: password.length,
    permissions: {
      penyes: user.permissions.penyes,
      proves: user.permissions.proves,
      ...(user.permissions.specificProvaId
        ? { specificProvaId: user.permissions.specificProvaId }
        : {}),
      ...(user.permissions.specificProvaId && user.permissions.specificSubProvaId
        ? { specificSubProvaId: user.permissions.specificSubProvaId }
        : {}),
      users: user.permissions.users,
    },
  });

  return { uid, email };
});
