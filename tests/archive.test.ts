import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDraft } from "@/lib/invoice/invoice";

const transactionGet = vi.fn();
const transactionCreate = vi.fn();
const transactionSet = vi.fn();
const runTransaction = vi.fn(async (callback: (transaction: { get: typeof transactionGet; create: typeof transactionCreate; set: typeof transactionSet }) => Promise<void>) => callback({ get: transactionGet, create: transactionCreate, set: transactionSet }));

const invoiceRef = { id: "history-1" };
const reservationRef = { id: "number-key" };
const invoiceGet = vi.fn();
const invoiceOrderBy = vi.fn(() => ({ get: invoiceGet }));
const invoiceDoc = vi.fn((id?: string) => id ? { id } : invoiceRef);
const nestedCollection = (name: string) => name === "invoices"
  ? { doc: invoiceDoc, orderBy: invoiceOrderBy }
  : { doc: vi.fn(() => reservationRef) };
const database = {
  collection: vi.fn(() => ({ doc: vi.fn(() => ({ collection: nestedCollection })) })),
  runTransaction,
};

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: () => database,
}));

import { archiveInvoice, DuplicateInvoiceNumberError, invoiceNumberKey, listFinalizedInvoices, normalizeInvoiceNumber } from "@/lib/invoice/archive";

describe("invoice archive service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionGet.mockResolvedValue({ exists: false });
    invoiceGet.mockResolvedValue({ docs: [] });
  });

  it("normalizes equivalent invoice numbers to one reservation key", () => {
    expect(normalizeInvoiceNumber(" inv-1  a ")).toBe("INV-1 A");
    expect(invoiceNumberKey(" inv-1  a ")).toBe(invoiceNumberKey("INV-1 A"));
  });

  it("rejects a duplicate number without creating another history record", async () => {
    transactionGet.mockResolvedValue({ exists: true });
    await expect(archiveInvoice("allowed-user", createDraft(1106))).rejects.toBeInstanceOf(DuplicateInvoiceNumberError);
    expect(transactionCreate).not.toHaveBeenCalled();
    expect(transactionSet).not.toHaveBeenCalled();
  });

  it("archives the invoice-specific payment details", async () => {
    const draft = createDraft(1106);
    draft.payment.bank = "First National Bank";

    await archiveInvoice("allowed-user", draft);

    expect(transactionCreate).toHaveBeenCalledWith(invoiceRef, expect.objectContaining({
      invoice: expect.objectContaining({ payment: expect.objectContaining({ bank: "First National Bank" }) }),
    }));
  });

  it("overwrites the reserved invoice document when explicitly requested", async () => {
    transactionGet.mockResolvedValue({ exists: true, data: () => ({ invoiceId: "existing-history" }) });
    const draft = createDraft(1106);
    draft.customer.displayName = "Updated customer";

    const result = await archiveInvoice("allowed-user", draft, { overwrite: true });

    expect(result).toEqual({ id: "existing-history", overwritten: true });
    expect(transactionSet).toHaveBeenCalledWith({ id: "existing-history" }, expect.objectContaining({
      invoice: expect.objectContaining({ customer: expect.objectContaining({ displayName: "Updated customer" }) }),
    }));
    expect(transactionCreate).not.toHaveBeenCalled();
  });

  it("fetches the complete finalized invoice collection without a limit", async () => {
    await expect(listFinalizedInvoices("allowed-user")).resolves.toEqual([]);

    expect(invoiceOrderBy).toHaveBeenCalledWith("finalizedAt", "desc");
    expect(invoiceGet).toHaveBeenCalledOnce();
  });
});
