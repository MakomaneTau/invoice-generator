"use client";

import { useState } from "react";

export function LogoutButton({ className = "button button-outline" }: { className?: string }) {
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  };

  return <button type="button" className={className} onClick={logout} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>;
}
