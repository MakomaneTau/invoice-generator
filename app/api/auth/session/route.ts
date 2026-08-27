import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import {
  hasRecentSignIn,
  isAllowedUser,
  isSameOrigin,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const { idToken } = await request.json() as { idToken?: unknown };
    if (typeof idToken !== "string" || !idToken) {
      return Response.json({ error: "ID token is required" }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!isAllowedUser(decoded)) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (!hasRecentSignIn(decoded)) return Response.json({ error: "Please sign in again" }, { status: 401 });

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1_000,
    });
    return response;
  } catch {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
