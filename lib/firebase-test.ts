import { auth, db, storage } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { AuthError, FirestoreError, StorageError, logError } from "./firebase-errors";

// Test result interface
export interface TestResult {
  success: boolean;
  message: string;
  error?: any;
  duration?: number;
}

/**
 * Test Firebase Auth - Anonymous Sign In
 */
export async function testAuth(): Promise<TestResult> {
  const start = Date.now();
  try {
    const userCredential = await signInAnonymously(auth);
    const duration = Date.now() - start;

    if (userCredential.user) {
      return {
        success: true,
        message: `Auth test successful. User ID: ${userCredential.user.uid}`,
        duration,
      };
    } else {
      throw new AuthError("No user returned from auth", "NO_USER");
    }
  } catch (error: any) {
    logError(error, "testAuth");
    return {
      success: false,
      message: "Auth test failed",
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test Firestore - Write and Read
 */
export async function testFirestore(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const testDocRef = doc(db, `users/${userId}/sessions/test-session`);
    const testData = {
      problemText: "Test problem",
      status: "in-progress",
      createdAt: new Date().toISOString(),
      turnCount: 0,
    };

    // Write test
    await setDoc(testDocRef, testData);

    // Read test
    const docSnap = await getDoc(testDocRef);

    if (!docSnap.exists()) {
      throw new FirestoreError("Document not found after write", "NOT_FOUND");
    }

    // Cleanup
    await deleteDoc(testDocRef);

    const duration = Date.now() - start;
    return {
      success: true,
      message: "Firestore test successful (write, read, delete)",
      duration,
    };
  } catch (error: any) {
    logError(error, "testFirestore");
    return {
      success: false,
      message: "Firestore test failed",
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test Firebase Storage - Upload and Download
 */
export async function testStorage(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Create a small test file (1x1 pixel PNG)
    const testImageData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    const testBlob = new Blob([testImageData], { type: "image/png" });
    const testFile = new File([testBlob], "test.png", { type: "image/png" });

    const storageRef = ref(storage, `users/${userId}/uploads/test-${Date.now()}.png`);

    // Upload test
    await uploadBytes(storageRef, testFile);

    // Download URL test
    const downloadURL = await getDownloadURL(storageRef);

    if (!downloadURL) {
      throw new StorageError("No download URL returned", "NO_URL");
    }

    // Cleanup
    await deleteObject(storageRef);

    const duration = Date.now() - start;
    return {
      success: true,
      message: "Storage test successful (upload, download URL, delete)",
      duration,
    };
  } catch (error: any) {
    logError(error, "testStorage");

    // Check for CORS error
    let errorMessage = error.message;
    if (error.code === "storage/unauthorized" || error.message?.includes("CORS")) {
      errorMessage = "CORS error: Firebase Storage needs CORS configuration. See instructions below.";
    }

    return {
      success: false,
      message: "Storage test failed",
      error: errorMessage,
      duration: Date.now() - start,
    };
  }
}

/**
 * Run all Firebase tests
 */
export async function runAllTests(): Promise<{
  auth: TestResult;
  firestore: TestResult;
  storage: TestResult;
  overall: { success: boolean; totalDuration: number };
}> {
  console.log("Starting Firebase tests...");

  // Test auth first
  const authResult = await testAuth();
  console.log("Auth test:", authResult);

  if (!authResult.success || !auth.currentUser) {
    return {
      auth: authResult,
      firestore: { success: false, message: "Skipped - Auth failed" },
      storage: { success: false, message: "Skipped - Auth failed" },
      overall: { success: false, totalDuration: authResult.duration || 0 },
    };
  }

  const userId = auth.currentUser.uid;

  // Test Firestore
  const firestoreResult = await testFirestore(userId);
  console.log("Firestore test:", firestoreResult);

  // Test Storage
  const storageResult = await testStorage(userId);
  console.log("Storage test:", storageResult);

  const totalDuration =
    (authResult.duration || 0) +
    (firestoreResult.duration || 0) +
    (storageResult.duration || 0);

  const allSuccess =
    authResult.success && firestoreResult.success && storageResult.success;

  return {
    auth: authResult,
    firestore: firestoreResult,
    storage: storageResult,
    overall: { success: allSuccess, totalDuration },
  };
}
