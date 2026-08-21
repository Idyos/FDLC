import { storage } from "@/firebase/firebase";
import { deleteObject, getDownloadURL, ref, uploadBytes, StorageError } from "firebase/storage";
import { resizeImageFile } from "@/utils/imageResize";

// Each upload gets a fresh download token (and therefore a fresh URL), so this
// is safe as an "immutable" cache: the same URL never points at different bytes.
const LONG_CACHE_CONTROL = "public, max-age=604800, immutable";

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

    const optimized = await resizeImageFile(file);
    const path = `Circuit/${year}/Proves/${sanitizeStoragePathSegment(challengeName)}/image`;

    const storageRef = ref(storage, path);
    const metadata = {
        contentType: optimized.type,
        cacheControl: LONG_CACHE_CONTROL,
    };

    try {
        await uploadBytes(storageRef, optimized, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

export const addImageToPenyes = async (file: File | null, year: number, penyaId: string): Promise<string> => {
    if (!file) return "";

    const optimized = await resizeImageFile(file);
    const path = `Circuit/${year}/Penyes/${sanitizeStoragePathSegment(penyaId)}`;

    const storageRef = ref(storage, path);
    const metadata = {
        contentType: optimized.type,
        cacheControl: LONG_CACHE_CONTROL,
    };

    try {
        await uploadBytes(storageRef, optimized, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

export const deleteImageFromPenyes = async (year: number, penyaId: string): Promise<void> => {
    const path = `Circuit/${year}/Penyes/${sanitizeStoragePathSegment(penyaId)}`;
    const storageRef = ref(storage, path);

    try {
        await deleteObject(storageRef);
    } catch (error) {
        if ((error as StorageError)?.code === "storage/object-not-found") return;
        console.error("Error deleting image:", error);
        throw error;
    }
}

export const addPdfToChallenges = async (file: File | null, year: number, challengeName: string): Promise<string> => {
    if (!file) return "";

    const path = `Circuit/${year}/Proves/${sanitizeStoragePathSegment(challengeName)}/rules`;

    const storageRef = ref(storage, path);
    const metadata = {
        contentType: file.type,
    };

    try {
        await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading pdf:", error);
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