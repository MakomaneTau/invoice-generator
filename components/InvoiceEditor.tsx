import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from "./icons";
import { centsToInput, createLineItem, formatDraftName, formatMoney, inputToCents, lineItemAmount } from "@/lib/invoice/invoice";
import type { InvoiceDraft, InvoiceErrors, LineItem } from "@/lib/invoice/types";

type Props = {
  draft: InvoiceDraft;
  errors: InvoiceErrors;
  invoiceNumberConflict?: string;
  onChange: (draft: InvoiceDraft) => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

function RateInput({ rateCents, invalid, onChange }: { rateCents: number; invalid: boolean; onChange: (rateCents: number) => void }) {
  const [value, setValue] = useState(() => centsToInput(rateCents));

  const updateValue = (nextValue: string) => {
    setValue(nextValue);
    if (nextValue !== "") onChange(inputToCents(nextValue));
  };

  const normalizeValue = () => {
    const rate = inputToCents(value);
    setValue(centsToInput(rate));
    onChange(rate);
  };

  return (
    <span className="money-input">
      <span aria-hidden="true">R</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        onBlur={normalizeValue}
        aria-invalid={invalid}
      />
    </span>
  );
}

export function InvoiceEditor({ draft, errors, invoiceNumberConflict, onChange }: Props) {
  const update = <K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) => {
    const nextDraft = { ...draft, [key]: value };
    onChange({ ...nextDraft, name: formatDraftName(nextDraft.invoiceNumber, nextDraft.customer.displayName) });
  };
  const updateCustomer = (key: keyof InvoiceDraft["customer"], value: string) => {
    update("customer", { ...draft.customer, [key]: value });
  };
  const updateItem = (index: number, patch: Partial<LineItem>) => {
    update("lineItems", draft.lineItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.lineItems.length) return;
    const next = [...draft.lineItems];
    [next[index], next[target]] = [next[target], next[index]];
    update("lineItems", next);
  };

  return (
    <div className="editor-stack">
      <section className="form-card">
        <div className="section-heading"><span>01</span><div><h2>Invoice details</h2><p>Reference, timing and payment terms.</p></div></div>
        <div className="form-grid two-columns">
          <label className="field full-field">Draft name<input value={draft.name} readOnly aria-invalid={Boolean(errors.name)} /><FieldError message={errors.name} /></label>
          <label className="field">Invoice number<input value={draft.invoiceNumber} onChange={(event) => update("invoiceNumber", event.target.value.toUpperCase())} aria-invalid={Boolean(errors.invoiceNumber || invoiceNumberConflict)} /><FieldError message={errors.invoiceNumber} />{invoiceNumberConflict && <span className="field-warning">{invoiceNumberConflict}</span>}</label>
          <label className="field">Terms<input value={draft.terms} onChange={(event) => update("terms", event.target.value)} placeholder="Due on receipt" /></label>
          <label className="field">Invoice date<input type="date" value={draft.invoiceDate} onChange={(event) => update("invoiceDate", event.target.value)} aria-invalid={Boolean(errors.invoiceDate)} /><FieldError message={errors.invoiceDate} /></label>
          <label className="field">Due date<input type="date" value={draft.dueDate} min={draft.invoiceDate} onChange={(event) => update("dueDate", event.target.value)} aria-invalid={Boolean(errors.dueDate)} /><FieldError message={errors.dueDate} /></label>
        </div>
      </section>

      <section className="form-card">
        <div className="section-heading"><span>02</span><div><h2>Customer</h2><p>Who this invoice is addressed to.</p></div></div>
        <div className="form-grid two-columns">
          <label className="field">Contact / display name<input value={draft.customer.displayName} onChange={(event) => updateCustomer("displayName", event.target.value)} aria-invalid={Boolean(errors["customer.displayName"])} placeholder="Customer name" /><FieldError message={errors["customer.displayName"]} /></label>
          <label className="field">Registered company name<input value={draft.customer.companyName} onChange={(event) => updateCustomer("companyName", event.target.value)} aria-invalid={Boolean(errors["customer.companyName"])} placeholder="Customer Company (Pty) Ltd" /><FieldError message={errors["customer.companyName"]} /></label>
          <label className="field full-field">Address<textarea rows={3} value={draft.customer.address} onChange={(event) => updateCustomer("address", event.target.value)} aria-invalid={Boolean(errors["customer.address"])} placeholder={"51 Kina Crescent, Eldoglen\nCenturion\n0157"} /><FieldError message={errors["customer.address"]} /></label>
          <label className="field">Registration number<input value={draft.customer.registrationNumber} onChange={(event) => updateCustomer("registrationNumber", event.target.value)} placeholder="2020/514414/07" /></label>
          <label className="field">VAT number<input value={draft.customer.vatNumber} onChange={(event) => updateCustomer("vatNumber", event.target.value)} placeholder="4580315994" /></label>
          <label className="field">Phone<input type="tel" value={draft.customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} placeholder="082 544 6628" /></label>
          <label className="field">Email<input type="email" value={draft.customer.email} onChange={(event) => updateCustomer("email", event.target.value)} aria-invalid={Boolean(errors["customer.email"])} placeholder="bookings@example.co.za" /><FieldError message={errors["customer.email"]} /></label>
        </div>
      </section>

      <section className="form-card">
        <div className="section-heading items-heading"><span>03</span><div><h2>Line items</h2><p>Add the products or services being billed.</p></div><button type="button" className="button button-soft" onClick={() => update("lineItems", [...draft.lineItems, createLineItem()])}><PlusIcon />Add item</button></div>
        <FieldError message={errors.lineItems} />
        <div className="line-items">
          {draft.lineItems.map((item, index) => (
            <fieldset className="line-item" key={item.id}>
              <legend>Item {index + 1}</legend>
              <div className="item-toolbar">
                <span>#{String(index + 1).padStart(2, "0")}</span>
                <button type="button" className="icon-button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label={`Move item ${index + 1} up`}><ChevronUpIcon /></button>
                <button type="button" className="icon-button" onClick={() => moveItem(index, 1)} disabled={index === draft.lineItems.length - 1} aria-label={`Move item ${index + 1} down`}><ChevronDownIcon /></button>
                <button type="button" className="icon-button danger-icon" onClick={() => update("lineItems", draft.lineItems.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove item ${index + 1}`}><TrashIcon /></button>
              </div>
              <div className="item-grid">
                <label className="field item-description">Description<input value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} aria-invalid={Boolean(errors[`lineItems.${index}.description`])} placeholder="Purple T-shirts Pro" /><FieldError message={errors[`lineItems.${index}.description`]} /></label>
                <label className="field">Quantity<input type="number" min="0.01" step="0.01" value={Number.isFinite(item.quantity) ? item.quantity : ""} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} aria-invalid={Boolean(errors[`lineItems.${index}.quantity`])} /><FieldError message={errors[`lineItems.${index}.quantity`]} /></label>
                <label className="field">Rate (ZAR)<RateInput rateCents={item.rateCents} invalid={Boolean(errors[`lineItems.${index}.rateCents`])} onChange={(rateCents) => updateItem(index, { rateCents })} /><FieldError message={errors[`lineItems.${index}.rateCents`]} /></label>
                <div className="item-amount"><span>Amount</span><strong>{formatMoney(lineItemAmount(item))}</strong></div>
              </div>
            </fieldset>
          ))}
        </div>
        <button type="button" className="add-item-wide" onClick={() => update("lineItems", [...draft.lineItems, createLineItem()])}><PlusIcon />Add another line item</button>
      </section>
    </div>
  );
}
