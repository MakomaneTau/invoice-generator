import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export default async function globalSetup() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const uid = process.env.ALLOWED_FIREBASE_UID;
  if (!projectId || !uid || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Run end-to-end tests through npm run test:e2e so the Firebase emulators are configured.");
  }

  const app = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);
  await auth.deleteUser(uid).catch(() => undefined);
  await auth.createUser({ uid, email: "invoice-owner@example.test", password: "Invoice-Test-123!", emailVerified: true });
}
