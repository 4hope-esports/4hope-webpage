import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

let cachedDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}
