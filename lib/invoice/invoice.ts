import {
  INVOICE_SCHEMA_VERSION,
  type InvoiceDraft,
  type InvoiceErrors,
  type LineItem,
} from "./types";
import { DEFAULT_PAYMENT_DETAILS } from "./profile";

const moneyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function createId(prefix = "draft") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function todayIso() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatInvoiceNumber(sequence: number) {
  return `INV-${Math.max(0, Math.trunc(sequence)).toString().padStart(7, "0")}`;
}

export function formatDraftName(invoiceNumber: string, displayName: string) {
  return [invoiceNumber.trim(), displayName.trim()].filter(Boolean).join(" - ") || "Untitled invoice";
}

export function createLineItem(): LineItem {
  return { id: createId("item"), description: "", quantity: 1, rateCents: 0 };
}

export function createDraft(sequence: number): InvoiceDraft {
  const now = new Date().toISOString();
  const invoiceNumber = formatInvoiceNumber(sequence);
  return {
    schemaVersion: INVOICE_SCHEMA_VERSION,
    id: createId(),
    name: formatDraftName(invoiceNumber, ""),
    invoiceNumber,
    invoiceDate: todayIso(),
    terms: "Due on receipt",
    dueDate: todayIso(),
    customer: {
      displayName: "",
      companyName: "",
      address: "",
      registrationNumber: "",
      vatNumber: "",
      phone: "",
      email: "",
    },
    lineItems: [createLineItem()],
    payment: { ...DEFAULT_PAYMENT_DETAILS },
    sellerProfileId: "real-is-rare",
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateDraft(source: InvoiceDraft, sequence: number): InvoiceDraft {
  const now = new Date().toISOString();
  const invoiceNumber = formatInvoiceNumber(sequence);
  return {
    ...source,
    id: createId(),
    name: formatDraftName(invoiceNumber, source.customer.displayName),
    invoiceNumber,
    lineItems: source.lineItems.map((item) => ({ ...item, id: createId("item") })),
    createdAt: now,
    updatedAt: now,
  };
}

export function lineItemAmount(item: LineItem) {
  if (!Number.isFinite(item.quantity) || !Number.isFinite(item.rateCents)) return 0;
  return Math.round(item.quantity * item.rateCents);
}

export function invoiceSubtotal(draft: InvoiceDraft) {
  return draft.lineItems.reduce((sum, item) => sum + lineItemAmount(item), 0);
}

export function formatMoney(cents: number) {
  return moneyFormatter.format((Number.isFinite(cents) ? cents : 0) / 100);
}

export function centsToInput(cents: number) {
  return Number.isFinite(cents) ? (cents / 100).toFixed(2) : "0.00";
}

export function inputToCents(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function validateInvoice(draft: InvoiceDraft): InvoiceErrors {
  const errors: InvoiceErrors = {};
  if (!draft.name.trim()) errors.name = "Give this draft a name.";
  if (!draft.invoiceNumber.trim()) errors.invoiceNumber = "Invoice number is required.";
  if (!draft.invoiceDate) errors.invoiceDate = "Invoice date is required.";
  if (!draft.dueDate) errors.dueDate = "Due date is required.";
  if (!draft.customer.displayName.trim()) {
    errors["customer.displayName"] = "Customer name is required.";
  }
  if (!draft.customer.companyName.trim()) {
    errors["customer.companyName"] = "Company name is required.";
  }
  if (!draft.customer.address.trim()) {
    errors["customer.address"] = "Customer address is required.";
  }
  if (draft.customer.email && !/^\S+@\S+\.\S+$/.test(draft.customer.email)) {
    errors["customer.email"] = "Enter a valid email address.";
  }
  if (!draft.lineItems.length) errors.lineItems = "Add at least one line item.";
  draft.lineItems.forEach((item, index) => {
    if (!item.description.trim()) errors[`lineItems.${index}.description`] = "Description is required.";
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors[`lineItems.${index}.quantity`] = "Quantity must be greater than zero.";
    }
    if (!Number.isFinite(item.rateCents) || item.rateCents < 0) {
      errors[`lineItems.${index}.rateCents`] = "Rate cannot be negative.";
    }
  });
  return errors;
}

export function safePdfFilename(draft: InvoiceDraft) {
  const raw = `${draft.invoiceNumber}-${draft.customer.companyName || draft.customer.displayName || "customer"}`;
  const safe = raw
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
  return `${safe || "invoice"}.pdf`;
}
