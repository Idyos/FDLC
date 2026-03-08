import { auth, db } from "@/firebase/firebase";
import { User } from "@/interfaces/userInterface";
import { createUserWithEmailAndPassword } from "firebase/auth"
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

export const createUser = async (user: User, password: string): Promise<void> => {
    const email: string = user.email.length == 0 ? `${user.displayName}@fldc.com` : user.email;

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => { 
        console.log("Usuari creat:", userCredential.user);

        const docRef = doc(db, `Users/${user.uid}`);

        updateDoc(docRef, {
            displayName: user.displayName,
            photoURL: user.photoURL,
            isTemporary: user.isTemporary,
            permissions: {
                penyes: user.permissions.penyes,
                proves: user.permissions.proves,
                users: user.permissions.users,
            }
        });
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("Error:", errorCode, errorMessage); 
    });
}

export const getUsers = async (
  callback: (data: User[]) => void
) => {
  const usersRef = collection(db, `Users`);

  try {
    const snap = await getDocs(usersRef);

    const users: User[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const user: User = {
            uid: d.uid,
            photoURL: d.photoURL || "",
            displayName: d.displayName || "",
            email: d.email || "",
            isTemporary: d.isTemporary || false,
            permissions: {
                penyes: Array.isArray(d.permissions?.penyes) ? d.permissions.penyes : [],
                proves: Array.isArray(d.permissions?.proves) ? d.permissions.proves : [],
                users: Array.isArray(d.permissions?.users) ? d.permissions.users : [],
            }
        };
        return user;
    });

    console.log("Usuaris obtinguts:", users);
    callback(users);
  } catch (error) {
    console.error("Error obtenint usuaris:", error);
  }
};