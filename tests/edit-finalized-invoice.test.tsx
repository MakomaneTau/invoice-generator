import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditFinalizedInvoiceButton } from "@/components/EditFinalizedInvoiceButton";
import { createDraft } from "@/lib/invoice/invoice";
import { SELLER_PROFILE } from "@/lib/invoice/profile";
import { loadInvoiceState } from "@/lib/invoice/storage";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("edit finalized invoice", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockClear();
  });

  it("loads the fetched invoice into the local editor", () => {
    const invoice = createDraft(1106);
    invoice.customer.displayName = "Updated customer";
    invoice.payment.bank = "First National Bank";

    render(<EditFinalizedInvoiceButton invoice={invoice} sellerProfile={SELLER_PROFILE} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit & overwrite" }));

    const state = loadInvoiceState(window.localStorage);
    expect(state.drafts[0]).toMatchObject({
      invoiceNumber: "INV-0001106",
      customer: { displayName: "Updated customer" },
      payment: { bank: "First National Bank" },
    });
    expect(push).toHaveBeenCalledWith("/");
  });
});
