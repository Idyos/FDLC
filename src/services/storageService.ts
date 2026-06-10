import { storage } from "@/firebase/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

/**
 * A bare `%`, `#`, `?`, `[` or `]` in a Storage object name breaks the emulator's
 * Cloud Functions trigger routing (decodeURIComponent throws on a malformed
 * percent-sequence and crashes the whole emulator suite), and is discouraged
 * for object names in general. Strip them from path segments derived from
 * user-entered names.
 */
const sanitizeStoragePathSegment = (segment: string): string => segment.replace(/[%#?[\]]/g, "_");

export const addImageToChallenges = async (file: File | null, year: number, challengeName: string): Promise<string> => {
    if (!file) return "";

    const path = `Circuit/${year}/Proves/${sanitizeStoragePathSegment(challengeName)}/image`;

    const storageRef = ref(storage, path);
    const metadata = {
        contentType: file.type,
    };
    
    try {
        await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

export const addImageToPenyes = async (file: File | null, year: number, penyaId: string): Promise<string> => {
    if (!file) return "";


    const path = `Circuit/${year}/Penyes/${sanitizeStoragePathSegment(penyaId)}`;

    const storageRef = ref(storage, path);
    const metadata = {
        contentType: file.type,
    };
    
    try {
        await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

export const addImageToStorage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const metadata = {
        contentType: file.type,
    };
    
    try {
        await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}