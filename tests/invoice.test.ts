import { describe, expect, it } from "vitest";
import {
  createDraft,
  formatDraftName,
  formatInvoiceNumber,
  formatMoney,
  inputToCents,
  invoiceSubtotal,
  safePdfFilename,
  validateInvoice,
} from "@/lib/invoice/invoice";

describe("invoice calculations", () => {
  it("calculates quantity × rate using cents", () => {
    const draft = createDraft(1106);
    draft.lineItems = [{ id: "item-1", description: "Purple T-shirts Pro", quantity: 10, rateCents: 20_000 }];
    expect(invoiceSubtotal(draft)).toBe(200_000);
    expect(formatMoney(invoiceSubtotal(draft)).replace(/\s/g, " ")).toContain("2 000,00");
  });

  it("converts decimal input to integer cents", () => {
    expect(inputToCents("199.99")).toBe(19_999);
    expect(inputToCents("invalid")).toBe(0);
  });
});

describe("invoice identity and validation", () => {
  it("formats the local invoice sequence", () => {
    expect(formatInvoiceNumber(1106)).toBe("INV-0001106");
  });

  it("builds a draft name from the invoice number and optional display name", () => {
    expect(formatDraftName("INV-0001106", "")).toBe("INV-0001106");
    expect(formatDraftName("INV-0001106", "Hype Nation")).toBe("INV-0001106 - Hype Nation");
  });

  it("reports required customer and line-item fields", () => {
    const errors = validateInvoice(createDraft(1106));
    expect(errors["customer.displayName"]).toBeDefined();
    expect(errors["customer.companyName"]).toBeDefined();
    expect(errors["customer.address"]).toBeDefined();
    expect(errors["lineItems.0.description"]).toBeDefined();
  });

  it("creates a safe PDF filename", () => {
    const draft = createDraft(1106);
    draft.customer.companyName = "Hype Nation / Centurion";
    expect(safePdfFilename(draft)).toBe("INV-0001106-Hype-Nation-Centurion.pdf");
  });
});
