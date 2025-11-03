import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Error classes
export class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "StorageError";
  }
}

// Validate file before upload
export function validateImageFile(file: File): void {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(
      `File size exceeds 5MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      "FILE_TOO_LARGE"
    );
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new StorageError(
      `Invalid file type: ${file.type}. Only JPG, PNG, and WEBP are allowed.`,
      "INVALID_FILE_TYPE"
    );
  }
}

// Upload image to Firebase Storage
export async function uploadImage(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file
  validateImageFile(file);

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${timestamp}_${sanitizedFileName}`;
  const storagePath = `users/${userId}/uploads/${fileName}`;

  try {
    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new StorageError(
      `Failed to upload image: ${error.message}`,
      error.code || "UPLOAD_FAILED"
    );
  }
}

// Delete image from Firebase Storage
export async function deleteImage(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error("Delete error:", error);
    throw new StorageError(
      `Failed to delete image: ${error.message}`,
      error.code || "DELETE_FAILED"
    );
  }
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf("."));
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
