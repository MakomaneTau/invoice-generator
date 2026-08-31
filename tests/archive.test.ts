import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDraft } from "@/lib/invoice/invoice";

const transactionGet = vi.fn();
const transactionCreate = vi.fn();
const runTransaction = vi.fn(async (callback: (transaction: { get: typeof transactionGet; create: typeof transactionCreate }) => Promise<void>) => callback({ get: transactionGet, create: transactionCreate }));

const invoiceRef = { id: "history-1" };
const reservationRef = { id: "number-key" };
const nestedCollection = (name: string) => ({
  doc: name === "invoices" ? vi.fn(() => invoiceRef) : vi.fn(() => reservationRef),
});
const database = {
  collection: vi.fn(() => ({ doc: vi.fn(() => ({ collection: nestedCollection })) })),
  runTransaction,
};

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: () => database,
}));

import { archiveInvoice, DuplicateInvoiceNumberError, invoiceNumberKey, normalizeInvoiceNumber } from "@/lib/invoice/archive";

describe("invoice archive service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionGet.mockResolvedValue({ exists: false });
  });

  it("normalizes equivalent invoice numbers to one reservation key", () => {
    expect(normalizeInvoiceNumber(" inv-1  a ")).toBe("INV-1 A");
    expect(invoiceNumberKey(" inv-1  a ")).toBe(invoiceNumberKey("INV-1 A"));
  });

  it("rejects a duplicate number without creating another history record", async () => {
    transactionGet.mockResolvedValue({ exists: true });
    await expect(archiveInvoice("allowed-user", createDraft(1106))).rejects.toBeInstanceOf(DuplicateInvoiceNumberError);
    expect(transactionCreate).not.toHaveBeenCalled();
  });

  it("archives the invoice-specific payment details", async () => {
    const draft = createDraft(1106);
    draft.payment.bank = "First National Bank";

    await archiveInvoice("allowed-user", draft);

    expect(transactionCreate).toHaveBeenCalledWith(invoiceRef, expect.objectContaining({
      invoice: expect.objectContaining({ payment: expect.objectContaining({ bank: "First National Bank" }) }),
    }));
  });
});
