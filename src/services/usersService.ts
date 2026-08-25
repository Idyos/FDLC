import { db, auth, functions } from "@/firebase/firebase";
import { User } from "@/interfaces/userInterface";
import {
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, getDocs, collection, updateDoc, deleteField } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export const createUser = async (user: User, password: string): Promise<void> => {
  const fn = httpsCallable<{ user: User; password: string }, { uid: string; email: string }>(
    functions,
    "createUser"
  );
  await fn({ user, password });
};

export const getUsers = async (callback: (data: User[]) => void) => {
  const usersRef = collection(db, "Users");

  try {
    const snap = await getDocs(usersRef);

    const users: User[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        uid: d.uid,
        photoURL: d.photoURL || "",
        displayName: d.displayName || "",
        email: d.email || "",
        isTemporary: d.isTemporary || false,
        permissions: {
          penyes: Array.isArray(d.permissions?.penyes) ? d.permissions.penyes : [],
          proves: Array.isArray(d.permissions?.proves) ? d.permissions.proves : [],
          specificProvaId: d.permissions?.specificProvaId ?? undefined,
          specificSubProvaId: d.permissions?.specificSubProvaId ?? undefined,
          users: Array.isArray(d.permissions?.users) ? d.permissions.users : [],
        },
      };
    });

    callback(users);
  } catch (error) {
    console.error("Error obtenint usuaris:", error);
  }
};

export const deleteUsersWithProva = async (provaId: string): Promise<void> => {
  const usersRef = collection(db, `Users`);
  const snap = await getDocs(usersRef);

  const affected = snap.docs.filter(
    (d) => d.data().permissions?.specificProvaId === provaId
  );

  if (affected.length === 0) return;

  for (const docSnap of affected) {
    const d = docSnap.data();
    const penyes: string[] = Array.isArray(d.permissions?.penyes) ? d.permissions.penyes : [];
    const users: string[] = Array.isArray(d.permissions?.users) ? d.permissions.users : [];
    const proves: string[] = Array.isArray(d.permissions?.proves) ? d.permissions.proves : [];

    const hasOtherPermissions =
      penyes.length > 0 ||
      users.length > 0 ||
      proves.some((p: string) => p !== "editResults");

    if (hasOtherPermissions) {
      // Keep the user but strip the prova-specific permission
      const updatedProves = proves.filter((p: string) => p !== "editResults");
      await updateDoc(docSnap.ref, {
        "permissions.specificProvaId": null,
        "permissions.specificSubProvaId": deleteField(),
        "permissions.proves": updatedProves,
      });
    } else {
      // Delete completely from Auth + Firestore via Cloud Function
      await deleteUser(d.uid);
    }
  }
};

export const deleteUsersWithSubProva = async (
  provaId: string,
  subProvaId: string
): Promise<void> => {
  const usersRef = collection(db, `Users`);
  const snap = await getDocs(usersRef);

  const affected = snap.docs.filter(
    (d) =>
      d.data().permissions?.specificProvaId === provaId &&
      d.data().permissions?.specificSubProvaId === subProvaId
  );

  if (affected.length === 0) return;

  for (const docSnap of affected) {
    // The subprova itself is gone: widen the user back to the whole prova rather than deleting them.
    await updateDoc(docSnap.ref, {
      "permissions.specificSubProvaId": deleteField(),
    });
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  const fn = httpsCallable(functions, "deleteUser");
  await fn({ uid });
};

const TEMPORARY_PROFILE_ERROR = "Els comptes temporals no poden modificar el seu perfil.";

export const changeOwnPassword = async (
  currentPassword: string,
  newPassword: string,
  isTemporary: boolean
): Promise<void> => {
  if (isTemporary) {
    throw new Error(TEMPORARY_PROFILE_ERROR);
  }

  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error("No hi ha cap usuari autenticat.");
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);

  await updateDoc(doc(db, `Users/${currentUser.uid}`), {
    hasResetPassword: true,
    passwordLength: newPassword.length,
  });
};

export const changeOwnEmail = async (
  currentPassword: string,
  newEmail: string,
  isTemporary: boolean
): Promise<void> => {
  if (isTemporary) {
    throw new Error(TEMPORARY_PROFILE_ERROR);
  }

  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error("No hi ha cap usuari autenticat.");
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await verifyBeforeUpdateEmail(currentUser, newEmail);
};

export const updateOwnDisplayName = async (
  displayName: string,
  isTemporary: boolean
): Promise<void> => {
  if (isTemporary) {
    throw new Error(TEMPORARY_PROFILE_ERROR);
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No hi ha cap usuari autenticat.");
  }

  await updateProfile(currentUser, { displayName });
  await updateDoc(doc(db, `Users/${currentUser.uid}`), { displayName });
};

export const updateUser = async (user: User): Promise<void> => {
  const docRef = doc(db, `Users/${user.uid}`);

  if (auth.currentUser && auth.currentUser.uid === user.uid) {
    await updateProfile(auth.currentUser, {
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  }

  await updateDoc(docRef, {
    photoURL: user.photoURL,
    displayName: user.displayName,
    isTemporary: user.isTemporary,
    "permissions.penyes": user.permissions.penyes,
    "permissions.proves": user.permissions.proves,
    "permissions.users": user.permissions.users,
    ...(user.permissions.specificProvaId
      ? { "permissions.specificProvaId": user.permissions.specificProvaId }
      : { "permissions.specificProvaId": deleteField() }),
    ...(user.permissions.specificProvaId && user.permissions.specificSubProvaId
      ? { "permissions.specificSubProvaId": user.permissions.specificSubProvaId }
      : { "permissions.specificSubProvaId": deleteField() }),
  });
};
