"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-error">
      <span>RR</span>
      <h1>Something interrupted the studio.</h1>
      <p>Your locally saved drafts are still in this browser.</p>
      <button type="button" className="button button-primary" onClick={reset}>Try again</button>
    </main>
  );
}
