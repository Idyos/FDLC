import { storage } from "@/firebase/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export const addImageToChallenges = async (file: File | null, year: number, challengeName: string): Promise<string> => {
    if (!file) return "";
    
    const path = `Circuit/${year}/Proves/${challengeName}/image`;

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


    const path = `Circuit/${year}/Penyes/${penyaId}`;

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