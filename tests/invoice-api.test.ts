// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDraft } from "@/lib/invoice/invoice";

const { authorizeApiRequest, archiveInvoice } = vi.hoisted(() => ({
  authorizeApiRequest: vi.fn(),
  archiveInvoice: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  authorizeApiRequest,
  isSameOrigin: () => true,
}));

vi.mock("@/lib/invoice/archive", () => ({
  archiveInvoice,
  DuplicateInvoiceNumberError: class DuplicateInvoiceNumberError extends Error {},
}));

import { POST } from "@/app/api/invoices/route";

function completeDraft() {
  const draft = createDraft(1106);
  draft.customer.displayName = "Hype Nation";
  draft.customer.companyName = "HYPE NATION PTY LTD";
  draft.customer.address = "Centurion";
  draft.lineItems[0].description = "T-shirts";
  draft.lineItems[0].rateCents = 20_000;
  return draft;
}

function invoiceRequest(invoice: unknown = completeDraft(), overwrite = false) {
  return new Request("http://localhost/api/invoices", {
    method: "POST",
    headers: { Origin: "http://localhost", "Content-Type": "application/json" },
    body: JSON.stringify({ invoice, overwrite }),
  });
}

describe("invoice archive endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeApiRequest.mockResolvedValue({ ok: true, user: { uid: "allowed-user" } });
    archiveInvoice.mockResolvedValue({ id: "history-1", overwritten: false });
  });

  it("rejects a request without an authorized session", async () => {
    authorizeApiRequest.mockResolvedValue({ ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) });
    expect((await POST(invoiceRequest())).status).toBe(401);
    expect(archiveInvoice).not.toHaveBeenCalled();
  });

  it("validates invoice details before archiving", async () => {
    const response = await POST(invoiceRequest({ invoiceNumber: "INV-1" }));
    expect(response.status).toBe(400);
    expect(archiveInvoice).not.toHaveBeenCalled();
  });

  it("archives a validated invoice for the session owner", async () => {
    const response = await POST(invoiceRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "history-1", overwritten: false });
    expect(archiveInvoice).toHaveBeenCalledWith("allowed-user", expect.objectContaining({ invoiceNumber: "INV-0001106" }), { overwrite: false });
  });

  it("overwrites a validated invoice when explicitly requested", async () => {
    archiveInvoice.mockResolvedValue({ id: "history-1", overwritten: true });

    const response = await POST(invoiceRequest(completeDraft(), true));

    expect(response.status).toBe(200);
    expect(archiveInvoice).toHaveBeenCalledWith("allowed-user", expect.any(Object), { overwrite: true });
  });
});
