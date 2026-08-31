import { createDraft, formatDraftName } from "./invoice";
import { DEFAULT_PAYMENT_DETAILS } from "./profile";
import {
  INVOICE_SCHEMA_VERSION,
  type InvoiceDraft,
  type PaymentDetails,
  type StoredInvoiceState,
} from "./types";

export const STORAGE_KEY = "real-is-rare:invoice-workspace";
export const INITIAL_SEQUENCE = 0;

const PAYMENT_KEYS = ["method", "bank", "accountHolder", "accountType", "accountNumber", "branchCode", "reference"] as const;

function normalizePayment(value: unknown): PaymentDetails {
  if (!value || typeof value !== "object") return { ...DEFAULT_PAYMENT_DETAILS };
  const payment = value as Record<string, unknown>;
  if (!PAYMENT_KEYS.every((key) => typeof payment[key] === "string")) return { ...DEFAULT_PAYMENT_DETAILS };
  return Object.fromEntries(PAYMENT_KEYS.map((key) => [key, payment[key]])) as PaymentDetails;
}

function normalizeDraft(value: unknown): InvoiceDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  const isSupportedVersion = draft.schemaVersion === 1 || draft.schemaVersion === INVOICE_SCHEMA_VERSION;
  if (!(
    isSupportedVersion &&
    typeof draft.id === "string" &&
    typeof draft.name === "string" &&
    typeof draft.invoiceNumber === "string" &&
    draft.customer !== null &&
    typeof draft.customer === "object" &&
    Array.isArray(draft.lineItems)
  )) return null;

  const normalized = draft as unknown as InvoiceDraft;
  return {
    ...normalized,
    schemaVersion: INVOICE_SCHEMA_VERSION,
    name: formatDraftName(normalized.invoiceNumber, normalized.customer.displayName),
    payment: normalizePayment(draft.payment),
  };
}

export function createInitialState(): StoredInvoiceState {
  const draft = createDraft(INITIAL_SEQUENCE);
  return {
    schemaVersion: INVOICE_SCHEMA_VERSION,
    nextSequence: INITIAL_SEQUENCE,
    activeDraftId: draft.id,
    drafts: [draft],
  };
}

export function parseStoredState(raw: string | null): StoredInvoiceState {
  if (!raw) return createInitialState();
  try {
    const parsed = JSON.parse(raw) as {
      schemaVersion?: unknown;
      nextSequence?: unknown;
      activeDraftId?: unknown;
      drafts?: unknown;
    };
    const drafts = Array.isArray(parsed.drafts) ? parsed.drafts.map(normalizeDraft) : [];
    if (
      (parsed.schemaVersion !== 1 && parsed.schemaVersion !== INVOICE_SCHEMA_VERSION) ||
      !drafts.length ||
      drafts.some((draft) => draft === null) ||
      typeof parsed.nextSequence !== "number"
    ) {
      return createInitialState();
    }
    const normalizedDrafts = drafts as InvoiceDraft[];
    const activeDraftId = typeof parsed.activeDraftId === "string" && normalizedDrafts.some((draft) => draft.id === parsed.activeDraftId)
      ? parsed.activeDraftId
      : normalizedDrafts[0].id;
    return {
      schemaVersion: INVOICE_SCHEMA_VERSION,
      nextSequence: Math.max(INITIAL_SEQUENCE, Math.trunc(parsed.nextSequence)),
      activeDraftId,
      drafts: normalizedDrafts,
    };
  } catch {
    return createInitialState();
  }
}

export function loadInvoiceState(storage: Storage): StoredInvoiceState {
  return parseStoredState(storage.getItem(STORAGE_KEY));
}

export function saveInvoiceState(storage: Storage, state: StoredInvoiceState) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
