
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

/**
 * Uploads a receipt image/pdf to Firebase Storage.
 * Path: receipts/{userId}/{transactionId}/{timestamp}_{filename}
 */
export const uploadReceipt = async (file: File, userId: string, transactionId: string): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage not initialized (Offline Mode?)");
  }

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `receipts/${userId}/${transactionId}/${Date.now()}_${safeName}`;
  
  const storageRef = ref(storage, path);
  
  // Upload
  const snapshot = await uploadBytes(storageRef, file);
  
  // Get public URL (Access controlled by Storage Rules)
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};
