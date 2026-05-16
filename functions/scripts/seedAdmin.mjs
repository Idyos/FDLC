import admin from "firebase-admin";

process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8081";

admin.initializeApp({ projectId: "fdlc-658e1" });

const auth = admin.auth();
const db = admin.firestore();

const email = process.argv[2] ?? "admin@fdlc.com";
const password = process.argv[3] ?? "admin123";
const displayName = process.argv[4] ?? "Admin";

try {
  let uid;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`L'usuari ja existeix a Auth (${uid}), actualitzant Firestore...`);
  } catch {
    const record = await auth.createUser({ email, password, displayName });
    uid = record.uid;
    console.log(`Usuari creat a Auth: ${uid}`);
  }

  await db.doc(`Users/${uid}`).set({
    uid,
    email,
    displayName,
    photoURL: "",
    isTemporary: false,
    hasResetPassword: false,
    permissions: {
      penyes: ["*"],
      proves: ["*"],
      users: ["*"],
    },
  });

  console.log("-----------------------------------");
  console.log(`Admin llest!`);
  console.log(`  Email:      ${email}`);
  console.log(`  Contrasenya: ${password}`);
  console.log("-----------------------------------");
  process.exit(0);
} catch (err) {
  console.error("Error creant l'admin:", err.message);
  process.exit(1);
}
