"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEditableDraft } from "@/lib/invoice/invoice";
import { loadInvoiceState, saveInvoiceState } from "@/lib/invoice/storage";
import type { InvoiceDraft, SellerProfile } from "@/lib/invoice/types";

export function EditFinalizedInvoiceButton({ invoice, sellerProfile }: { invoice: InvoiceDraft; sellerProfile: SellerProfile }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const editInvoice = () => {
    setError(null);
    try {
      const state = loadInvoiceState(window.localStorage);
      const draft = createEditableDraft(invoice, sellerProfile.payment);
      const normalizedNumber = draft.invoiceNumber.trim().toLocaleUpperCase("en-ZA");
      const otherDrafts = state.drafts.filter((item) => item.invoiceNumber.trim().toLocaleUpperCase("en-ZA") !== normalizedNumber);
      saveInvoiceState(window.localStorage, {
        ...state,
        activeDraftId: draft.id,
        drafts: [draft, ...otherDrafts],
      });
      router.push("/");
    } catch {
      setError("This invoice could not be opened in the editor. Please try again.");
    }
  };

  return <span className="pdf-download-control"><button type="button" className="button button-soft" onClick={editInvoice}>Edit &amp; overwrite</button>{error && <small role="alert">{error}</small>}</span>;
}
