import { createDraft, formatDraftName } from "./invoice";
import {
  INVOICE_SCHEMA_VERSION,
  type InvoiceDraft,
  type StoredInvoiceState,
} from "./types";

export const STORAGE_KEY = "real-is-rare:invoice-workspace";
export const INITIAL_SEQUENCE = 1106;

function isDraft(value: unknown): value is InvoiceDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<InvoiceDraft>;
  return (
    draft.schemaVersion === INVOICE_SCHEMA_VERSION &&
    typeof draft.id === "string" &&
    typeof draft.name === "string" &&
    typeof draft.invoiceNumber === "string" &&
    typeof draft.customer === "object" &&
    Array.isArray(draft.lineItems)
  );
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
    const parsed = JSON.parse(raw) as Partial<StoredInvoiceState>;
    if (
      parsed.schemaVersion !== INVOICE_SCHEMA_VERSION ||
      !Array.isArray(parsed.drafts) ||
      !parsed.drafts.every(isDraft) ||
      typeof parsed.nextSequence !== "number"
    ) {
      return createInitialState();
    }
    if (!parsed.drafts.length) return createInitialState();
    const activeDraftId = parsed.drafts.some((draft) => draft.id === parsed.activeDraftId)
      ? parsed.activeDraftId ?? parsed.drafts[0].id
      : parsed.drafts[0].id;
    return {
      schemaVersion: INVOICE_SCHEMA_VERSION,
      nextSequence: Math.max(INITIAL_SEQUENCE, Math.trunc(parsed.nextSequence)),
      activeDraftId,
      drafts: parsed.drafts.map((draft) => ({
        ...draft,
        name: formatDraftName(draft.invoiceNumber, draft.customer.displayName),
      })),
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
