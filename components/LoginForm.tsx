"use client";

import { useState, type FormEvent } from "react";
import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);

    try {
      const auth = getFirebaseClientAuth();
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithEmailAndPassword(auth, String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      await signOut(auth);
      if (!response.ok) throw new Error("Sign in failed");
      window.location.assign("/");
    } catch {
      setError("The email or password is incorrect, or this account is not authorized.");
      setPending(false);
    }
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="field">Email address<input name="email" type="email" autoComplete="username" placeholder="name@company.com" required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button type="submit" className="button button-primary login-submit" disabled={pending}>{pending ? "Opening workspace…" : <><span>Enter invoice studio</span><span aria-hidden="true">→</span></>}</button>
    </form>
  );
}
