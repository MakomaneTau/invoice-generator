"use client";

import { useState, type ReactNode } from "react";
import { safePdfFilename } from "@/lib/invoice/invoice";
import type { InvoiceDraft, SellerProfile } from "@/lib/invoice/types";

export async function createInvoicePdfBlob(draft: InvoiceDraft, sellerProfile?: SellerProfile) {
  const [{ pdf }, { InvoicePdfDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./InvoicePdfDocument")]);
  const logoUrl = new URL("/real-is-rare-logo.png", window.location.origin).toString();
  return pdf(<InvoicePdfDocument draft={draft} sellerProfile={sellerProfile} logoUrl={logoUrl} />).toBlob();
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function PdfDownloadButton({ draft, sellerProfile, className = "button button-outline-dark", children = "Download PDF" }: { draft: InvoiceDraft; sellerProfile: SellerProfile; className?: string; children?: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const blob = await createInvoicePdfBlob(draft, sellerProfile);
      downloadPdfBlob(blob, safePdfFilename(draft));
    } catch (downloadError) {
      console.error(downloadError);
      setError("PDF generation failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return <span className="pdf-download-control"><button type="button" className={className} onClick={download} disabled={pending}>{pending ? "Creating PDF…" : children}</button>{error && <small role="alert">{error}</small>}</span>;
}
