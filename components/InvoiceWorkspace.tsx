"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppBrand } from "./AppBrand";
import { InvoiceEditor } from "./InvoiceEditor";
import { createInvoicePdfBlob, downloadPdfBlob } from "./PdfDownloadButton";
import { InvoicePreview } from "./InvoicePreview";
import { LogoutButton } from "./LogoutButton";
import { CheckIcon, CopyIcon, DownloadIcon, FileIcon, PlusIcon, TrashIcon } from "./icons";
import { createDraft, duplicateDraft, safePdfFilename, validateInvoice } from "@/lib/invoice/invoice";
import { createInitialState, loadInvoiceState, saveInvoiceState } from "@/lib/invoice/storage";
import type { InvoiceDraft, InvoiceErrors, StoredInvoiceState } from "@/lib/invoice/types";

type MobileView = "editor" | "preview";
type SaveStatus = "loading" | "saving" | "saved" | "error";

function sequenceFromNumber(value: string) {
  const match = value.match(/^INV-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function nextAvailableSequence(state: StoredInvoiceState) {
  const used = state.drafts.map((draft) => sequenceFromNumber(draft.invoiceNumber)).filter((value): value is number => value !== null);
  return Math.max(state.nextSequence, ...used.map((value) => value + 1));
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function InvoiceWorkspace() {
  const [state, setState] = useState<StoredInvoiceState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [mobileView, setMobileView] = useState<MobileView>("editor");
  const [showErrors, setShowErrors] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      try {
        setState(loadInvoiceState(window.localStorage));
        setSaveStatus("saved");
      } catch {
        setState(createInitialState());
        setSaveStatus("error");
        setNotice("Browser storage is unavailable. You can still create a PDF, but this draft cannot be saved.");
      }
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  useEffect(() => {
    if (!state) return;
    const timeout = window.setTimeout(() => {
      try {
        saveInvoiceState(window.localStorage, state);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [state]);

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (saveStatus !== "error") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, [saveStatus]);

  const activeDraft = state?.drafts.find((draft) => draft.id === state.activeDraftId) ?? state?.drafts[0] ?? null;
  const errors = useMemo<InvoiceErrors>(() => activeDraft && showErrors ? validateInvoice(activeDraft) : {}, [activeDraft, showErrors]);
  const duplicateNumber = Boolean(activeDraft && state?.drafts.some((draft) => draft.id !== activeDraft.id && draft.invoiceNumber.trim().toLowerCase() === activeDraft.invoiceNumber.trim().toLowerCase()));

  const updateActiveDraft = (nextDraft: InvoiceDraft) => {
    if (!state || !activeDraft) return;
    if (saveStatus !== "error") setSaveStatus("saving");
    const withTimestamp = { ...nextDraft, updatedAt: new Date().toISOString() };
    setState({ ...state, drafts: state.drafts.map((draft) => draft.id === activeDraft.id ? withTimestamp : draft) });
  };

  const createNewDraft = () => {
    if (!state) return;
    if (saveStatus !== "error") setSaveStatus("saving");
    const draft = createDraft(nextAvailableSequence(state));
    setState({ ...state, activeDraftId: draft.id, drafts: [draft, ...state.drafts] });
    setShowErrors(false);
    setMobileView("editor");
  };

  const duplicateActiveDraft = () => {
    if (!state || !activeDraft) return;
    if (saveStatus !== "error") setSaveStatus("saving");
    const draft = duplicateDraft(activeDraft, nextAvailableSequence(state));
    setState({ ...state, activeDraftId: draft.id, drafts: [draft, ...state.drafts] });
    setShowErrors(false);
    setNotice("Draft duplicated.");
  };

  const deleteDraft = (draft: InvoiceDraft) => {
    if (!state || !window.confirm(`Delete “${draft.name}”? This cannot be undone.`)) return;
    if (saveStatus !== "error") setSaveStatus("saving");
    const remaining = state.drafts.filter((item) => item.id !== draft.id);
    if (!remaining.length) {
      const replacement = createDraft(nextAvailableSequence(state));
      setState({ ...state, activeDraftId: replacement.id, drafts: [replacement] });
      return;
    }
    setState({ ...state, drafts: remaining, activeDraftId: state.activeDraftId === draft.id ? remaining[0].id : state.activeDraftId });
  };

  const downloadPdf = async () => {
    if (!state || !activeDraft || isDownloading) return;
    setShowErrors(true);
    const validationErrors = validateInvoice(activeDraft);
    if (duplicateNumber) validationErrors.invoiceNumber = "Choose a unique invoice number before downloading.";
    if (Object.keys(validationErrors).length) {
      setNotice("Review the highlighted fields before downloading.");
      setMobileView("editor");
      window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
      return;
    }

    setIsDownloading(true);
    setNotice(null);
    try {
      const blob = await createInvoicePdfBlob(activeDraft);
      const filename = safePdfFilename(activeDraft);
      const archiveResponse = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: activeDraft }),
      });
      if (archiveResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!archiveResponse.ok) {
        const result = await archiveResponse.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Invoice could not be archived");
      }
      downloadPdfBlob(blob, filename);
      const usedSequence = sequenceFromNumber(activeDraft.invoiceNumber);
      setState({ ...state, nextSequence: usedSequence === null ? state.nextSequence : Math.max(state.nextSequence, usedSequence + 1) });
      setNotice(`Finalized and downloaded ${filename}`);
    } catch (error) {
      console.error(error);
      setNotice(error instanceof Error ? `${error.message}. Your draft is safe—please try again.` : "The invoice could not be finalized. Your draft is safe—please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!state || !activeDraft) return <main className="workspace-loading"><ImageMark /><p>Preparing your invoice workspace…</p></main>;

  return (
    <main className="workspace-shell">
      <header className="app-header">
        <AppBrand />
        <div className="header-actions">
          <div className={`save-status ${saveStatus}`} aria-live="polite">{saveStatus === "saved" && <CheckIcon />}{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Not saved" : "Saved locally"}</div>
          <Link className="button button-outline desktop-action" href="/history">History</Link>
          <button type="button" className="button button-outline desktop-action" onClick={duplicateActiveDraft}><CopyIcon />Duplicate</button>
          <LogoutButton className="button button-outline desktop-action" />
          <button type="button" className="button button-primary" onClick={downloadPdf} disabled={isDownloading}>{isDownloading ? <span className="spinner" /> : <DownloadIcon />}{isDownloading ? "Creating PDF…" : "Download PDF"}</button>
        </div>
      </header>

      {notice && <div className="app-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}
      <div className="mobile-tabs" aria-label="Workspace view"><button type="button" className={mobileView === "editor" ? "active" : ""} onClick={() => setMobileView("editor")}>Editor</button><button type="button" className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>Preview</button></div>

      <div className="workspace-body">
        <aside className="draft-sidebar">
          <div className="sidebar-heading"><div><span>Workspace</span><h1>Invoices</h1></div><button type="button" className="new-draft-button" onClick={createNewDraft} aria-label="Create invoice"><PlusIcon /></button></div>
          <div className="draft-list" aria-label="Saved invoice drafts">
            {state.drafts.map((draft) => (
              <div className={`draft-card ${draft.id === activeDraft.id ? "active" : ""}`} key={draft.id}>
                <button type="button" className="draft-select" onClick={() => { setState({ ...state, activeDraftId: draft.id }); setShowErrors(false); }}><FileIcon /><span><strong>{draft.name}</strong><small>{draft.invoiceNumber} · {formatUpdatedAt(draft.updatedAt)}</small></span></button>
                <button type="button" className="draft-delete" onClick={() => deleteDraft(draft)} aria-label={`Delete ${draft.name}`}><TrashIcon /></button>
              </div>
            ))}
          </div>
          <button type="button" className="button button-sidebar" onClick={createNewDraft}><PlusIcon />New invoice</button>
          <p className="storage-note">Drafts stay in this browser. Finalized invoice details are saved securely to Firestore history.</p>
        </aside>

        <section className={`editor-panel ${mobileView === "editor" ? "mobile-active" : ""}`} aria-label="Invoice editor">
          {showErrors && Object.keys(errors).length > 0 && <div className="error-summary" role="alert"><strong>Invoice needs a little more information.</strong><span>Complete the highlighted fields, then download again.</span></div>}
          <InvoiceEditor draft={activeDraft} errors={errors} duplicateNumber={duplicateNumber} onChange={updateActiveDraft} />
          <div className="mobile-download"><button type="button" className="button button-primary" onClick={downloadPdf} disabled={isDownloading}><DownloadIcon />{isDownloading ? "Creating PDF…" : "Download PDF"}</button></div>
        </section>

        <section className={`preview-panel ${mobileView === "preview" ? "mobile-active" : ""}`} aria-label="Invoice preview">
          <div className="preview-toolbar"><div><span>Live preview</span><small>A4 · Updates as you type</small></div><span className="preview-badge"><i />Ready</span></div>
          <div className="preview-stage"><InvoicePreview draft={activeDraft} /></div>
        </section>
      </div>
    </main>
  );
}

function ImageMark() {
  return <span className="brand-mark" aria-hidden="true">R<span>R</span></span>;
}
