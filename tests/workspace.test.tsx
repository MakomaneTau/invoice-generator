import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceWorkspace } from "@/components/InvoiceWorkspace";
import { STORAGE_KEY } from "@/lib/invoice/storage";

vi.mock("@react-pdf/renderer", () => ({
  pdf: () => ({ toBlob: async () => new Blob(["%PDF-test"], { type: "application/pdf" }) }),
}));

vi.mock("@/components/InvoicePdfDocument", () => ({ InvoicePdfDocument: () => null }));

describe("invoice workspace", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:invoice") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("creates and autosaves an editable invoice draft", async () => {
    render(<InvoiceWorkspace />);
    const draftName = await screen.findByLabelText("Draft name");
    const displayName = screen.getByLabelText(/^Contact \/ display name/);
    const invoiceNumber = screen.getByLabelText("Invoice number");
    expect(draftName).toHaveValue("INV-0000000");
    expect(displayName).toHaveAttribute("placeholder", "Customer name");
    expect(screen.getByLabelText("Registered company name")).toHaveAttribute("placeholder", "Customer Company (Pty) Ltd");
    fireEvent.change(displayName, { target: { value: "Hype Nation" } });
    expect(draftName).toHaveValue("INV-0000000 - Hype Nation");
    fireEvent.change(invoiceNumber, { target: { value: "inv-1200" } });
    expect(draftName).toHaveValue("INV-1200 - Hype Nation");

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain("INV-1200 - Hype Nation");
    });
  });

  it("adds, reorders, and removes line items", async () => {
    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.click(screen.getByRole("button", { name: "Add another line item" }));
    expect(screen.getByRole("group", { name: "Item 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove item 2" }));
    expect(screen.queryByRole("group", { name: "Item 2" })).not.toBeInTheDocument();
  });

  it("confirms draft deletion in an accessible in-app dialog", async () => {
    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));

    const deleteTrigger = screen.getAllByRole("button", { name: /^Delete INV-/ })[0];
    deleteTrigger.focus();
    fireEvent.click(deleteTrigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete invoice draft?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deleteTrigger).toHaveFocus();
    expect(screen.getAllByRole("button", { name: /^Delete INV-/ })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: /^Delete INV-/ })[0]);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete draft" }));
    expect(screen.getAllByRole("button", { name: /^Delete INV-/ })).toHaveLength(1);
  });

  it("lets a rate be typed before formatting it as currency", async () => {
    render(<InvoiceWorkspace />);
    const rate = await screen.findByRole("spinbutton", { name: /Rate \(ZAR\)/ });

    fireEvent.change(rate, { target: { value: "" } });
    fireEvent.change(rate, { target: { value: "2" } });
    fireEvent.change(rate, { target: { value: "20" } });

    expect(rate).toHaveValue(20);
    fireEvent.blur(rate);
    expect(rate).toHaveValue(20);
    expect(rate).toHaveAttribute("type", "number");
    expect(rate).toHaveAttribute("step", "0.01");
  });

  it("updates and saves payment details per invoice", async () => {
    render(<InvoiceWorkspace />);
    const bank = await screen.findByLabelText("Bank name");
    const accountNumber = screen.getByLabelText("Account number");

    expect(bank).toHaveValue("Capitec");
    fireEvent.change(bank, { target: { value: "First National Bank" } });
    fireEvent.change(accountNumber, { target: { value: "62000000000" } });

    expect(screen.getByLabelText("Live invoice preview")).toHaveTextContent("First National Bank");
    expect(screen.getByLabelText("Live invoice preview")).toHaveTextContent("62000000000");
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain("First National Bank");
    });
  });

  it("blocks an incomplete PDF and exposes validation errors", async () => {
    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.click(document.querySelector<HTMLButtonElement>(".app-header .button-primary")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Invoice needs a little more information");
    expect(screen.getByLabelText(/^Contact \/ display name/)).toHaveAttribute("aria-invalid", "true");
  });

  it("archives a complete invoice before starting its browser download", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "history-1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.change(screen.getByLabelText(/^Contact \/ display name/), { target: { value: "Hype Nation" } });
    fireEvent.change(screen.getByLabelText("Registered company name"), { target: { value: "HYPE NATION PTY LTD" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Centurion" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "T-shirts" } });
    fireEvent.click(document.querySelector<HTMLButtonElement>(".app-header .button-primary")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/invoices", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
  });

  it("blocks the browser download when cloud archiving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Archive unavailable" }), { status: 500 })));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.change(screen.getByLabelText(/^Contact \/ display name/), { target: { value: "Hype Nation" } });
    fireEvent.change(screen.getByLabelText("Registered company name"), { target: { value: "HYPE NATION PTY LTD" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Centurion" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "T-shirts" } });
    fireEvent.click(document.querySelector<HTMLButtonElement>(".app-header .button-primary")!);

    expect(await screen.findByText(/Archive unavailable/)).toBeVisible();
    expect(click).not.toHaveBeenCalled();
  });

  it("handles an invoice number already in history without throwing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "This invoice number is already in history" }), { status: 409 })));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.change(screen.getByLabelText(/^Contact \/ display name/), { target: { value: "Hype Nation" } });
    fireEvent.change(screen.getByLabelText("Registered company name"), { target: { value: "HYPE NATION PTY LTD" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Centurion" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "T-shirts" } });
    fireEvent.click(document.querySelector<HTMLButtonElement>(".app-header .button-primary")!);

    expect(await screen.findByText(/Open History to download the finalized invoice/)).toBeVisible();
    expect(screen.getByLabelText(/^Invoice number/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("This invoice number is already finalized and cannot be reused.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Overwrite invoice" })).toBeVisible();
    expect(click).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("overwrites a finalized invoice only after confirmation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "This invoice number is already in history" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "history-1", overwritten: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<InvoiceWorkspace />);
    await screen.findByLabelText("Draft name");
    fireEvent.change(screen.getByLabelText(/^Contact \/ display name/), { target: { value: "Hype Nation" } });
    fireEvent.change(screen.getByLabelText("Registered company name"), { target: { value: "HYPE NATION PTY LTD" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Centurion" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "T-shirts" } });
    fireEvent.click(document.querySelector<HTMLButtonElement>(".app-header .button-primary")!);

    fireEvent.click(await screen.findByRole("button", { name: "Overwrite invoice" }));
    let dialog = screen.getByRole("alertdialog", { name: "Overwrite INV-0000000?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(fetchMock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Overwrite invoice" }));
    dialog = screen.getByRole("alertdialog", { name: "Overwrite INV-0000000?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Overwrite invoice" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toMatchObject({ overwrite: true });
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(await screen.findByText(/Overwritten and downloaded/)).toBeVisible();
  });
});
