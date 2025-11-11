import { storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTaskSnapshot } from "firebase/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadProgress {
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
  error?: string;
}

/**
 * Upload an image file to Firebase Storage
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress updates
 * @returns Promise resolving to the download URL
 */
export async function uploadImage(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed");
  }

  // Generate unique filename using timestamp and random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split(".").pop();
  const filename = `problem-images/${timestamp}-${randomString}.${fileExtension}`;

  // Create storage reference
  const storageRef = ref(storage, filename);

  // Create upload task
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        // Calculate progress percentage
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            progress,
            status: "uploading",
          });
        }
      },
      (error) => {
        // Handle upload errors
        let errorMessage = "Failed to upload image";

        if (error.code === "storage/unauthorized") {
          errorMessage = "You don't have permission to upload images";
        } else if (error.code === "storage/canceled") {
          errorMessage = "Upload was canceled";
        } else if (error.code === "storage/quota-exceeded") {
          errorMessage = "Storage quota exceeded";
        }

        if (onProgress) {
          onProgress({
            progress: 0,
            status: "error",
            error: errorMessage,
          });
        }

        reject(new Error(errorMessage));
      },
      async () => {
        // Upload completed successfully, get download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          if (onProgress) {
            onProgress({
              progress: 100,
              status: "completed",
              url: downloadURL,
            });
          }

          resolve(downloadURL);
        } catch (error) {
          const errorMessage = "Failed to get download URL";

          if (onProgress) {
            onProgress({
              progress: 0,
              status: "error",
              error: errorMessage,
            });
          }

          reject(new Error(errorMessage));
        }
      }
    );
  });
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The download URL or storage path of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract the storage path from the download URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

    if (!pathMatch || !pathMatch[1]) {
      throw new Error("Invalid image URL");
    }

    const path = decodeURIComponent(pathMatch[1]);
    const imageRef = ref(storage, path);

    await deleteObject(imageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
    throw new Error("Failed to delete image");
  }
}

/**
 * Cancel an ongoing upload
 * @param uploadTask - The upload task to cancel
 */
export function cancelUpload(uploadTask: ReturnType<typeof uploadBytesResumable>): void {
  uploadTask.cancel();
}
