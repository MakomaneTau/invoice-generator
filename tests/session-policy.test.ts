// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { hasRecentSignIn, isAllowedUser, isSameOrigin, RECENT_SIGN_IN_SECONDS } from "@/lib/auth/session";

const originalAllowedUid = process.env.ALLOWED_FIREBASE_UID;

afterEach(() => {
  if (originalAllowedUid === undefined) delete process.env.ALLOWED_FIREBASE_UID;
  else process.env.ALLOWED_FIREBASE_UID = originalAllowedUid;
});

describe("session authorization policy", () => {
  it("allows only the configured Firebase UID", () => {
    process.env.ALLOWED_FIREBASE_UID = "owner-uid";
    expect(isAllowedUser({ uid: "owner-uid" })).toBe(true);
    expect(isAllowedUser({ uid: "different-uid" })).toBe(false);
  });

  it("requires a recent sign-in before creating a session", () => {
    const now = 10_000;
    expect(hasRecentSignIn({ auth_time: now - RECENT_SIGN_IN_SECONDS }, now)).toBe(true);
    expect(hasRecentSignIn({ auth_time: now - RECENT_SIGN_IN_SECONDS - 1 }, now)).toBe(false);
  });

  it("rejects missing and cross-origin mutation requests", () => {
    expect(isSameOrigin(new Request("https://invoice.example/api", { method: "POST" }))).toBe(false);
    expect(isSameOrigin(new Request("https://invoice.example/api", { method: "POST", headers: { Origin: "https://attacker.example" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://invoice.example/api", { method: "POST", headers: { Origin: "https://invoice.example" } }))).toBe(true);
  });

  it("accepts the public origin supplied by a trusted reverse proxy", () => {
    const request = new Request("http://internal-function/api", {
      method: "POST",
      headers: {
        Origin: "https://invoice.example",
        "X-Forwarded-Host": "invoice.example",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("rejects mismatched forwarded hosts and protocols", () => {
    const headers = {
      Origin: "https://invoice.example",
      "X-Forwarded-Host": "attacker.example",
      "X-Forwarded-Proto": "https",
    };
    expect(isSameOrigin(new Request("http://internal-function/api", { method: "POST", headers }))).toBe(false);

    headers["X-Forwarded-Host"] = "invoice.example";
    headers["X-Forwarded-Proto"] = "http";
    expect(isSameOrigin(new Request("http://internal-function/api", { method: "POST", headers }))).toBe(false);
  });
});
