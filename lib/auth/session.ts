import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "invoice_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;
export const RECENT_SIGN_IN_SECONDS = 5 * 60;

export function getAllowedUid() {
  const uid = process.env.ALLOWED_FIREBASE_UID?.trim();
  if (!uid) throw new Error("Missing required environment variable: ALLOWED_FIREBASE_UID");
  return uid;
}

export function isAllowedUser(token: Pick<DecodedIdToken, "uid">) {
  return token.uid === getAllowedUid();
}

export function hasRecentSignIn(token: Pick<DecodedIdToken, "auth_time">, nowSeconds = Date.now() / 1_000) {
  return nowSeconds - token.auth_time <= RECENT_SIGN_IN_SECONDS;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export async function getAuthorizedUser() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const token = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    return isAllowedUser(token) ? token : null;
  } catch {
    return null;
  }
}

export async function requireAuthorizedUser() {
  const user = await getAuthorizedUser();
  if (!user) redirect("/login");
  return user;
}

export async function authorizeApiRequest() {
  const user = await getAuthorizedUser();
  return user
    ? { ok: true as const, user }
    : { ok: false as const, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
}
