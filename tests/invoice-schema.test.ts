import { describe, expect, it } from "vitest";
import { createDraft } from "@/lib/invoice/invoice";
import { invoiceDraftSchema } from "@/lib/invoice/schema";

describe("final invoice payload", () => {
  it("accepts a complete invoice and rejects untrusted extra fields", () => {
    const draft = createDraft(1106);
    draft.customer.displayName = "Hype Nation";
    draft.customer.companyName = "HYPE NATION PTY LTD";
    draft.customer.address = "Centurion";
    draft.lineItems[0].description = "T-shirts";
    expect(invoiceDraftSchema.safeParse(draft).success).toBe(true);
    expect(invoiceDraftSchema.safeParse({ ...draft, ownerUid: "attacker" }).success).toBe(false);
  });

  it("rejects invalid monetary and date values", () => {
    const draft = createDraft(1106);
    draft.lineItems[0].rateCents = -1;
    draft.invoiceDate = "not-a-date";
    expect(invoiceDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("accepts customized payment details and rejects extra payment fields", () => {
    const draft = createDraft(1106);
    draft.lineItems[0].description = "T-shirts";
    draft.payment.bank = "First National Bank";
    draft.payment.reference = "Invoice number";

    expect(invoiceDraftSchema.safeParse(draft).success).toBe(true);
    expect(invoiceDraftSchema.safeParse({
      ...draft,
      payment: { ...draft.payment, routingSecret: "untrusted" },
    }).success).toBe(false);
  });
});
