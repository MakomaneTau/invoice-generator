import Image from "next/image";
import { formatDate, formatMoney, invoiceSubtotal, lineItemAmount } from "@/lib/invoice/invoice";
import { SELLER_PROFILE } from "@/lib/invoice/profile";
import type { InvoiceDraft, SellerProfile } from "@/lib/invoice/types";

export function InvoicePreview({ draft, sellerProfile = SELLER_PROFILE, archived = false }: { draft: InvoiceDraft; sellerProfile?: SellerProfile; archived?: boolean }) {
  const subtotal = invoiceSubtotal(draft);
  const customer = draft.customer;

  return (
    <article className="invoice-paper" aria-label={archived ? "Finalized invoice" : "Live invoice preview"}>
      <header className="invoice-header">
        <div className="invoice-brand">
          <Image src="/real-is-rare-logo.png" alt="Real Is Rare" width={88} height={92} priority />
          <div>
            <p className="invoice-kicker">Apparel · Est. 2020</p>
            <h2>{sellerProfile.name}</h2>
          </div>
        </div>
        <div className="invoice-title-block">
          <p className="invoice-title">Invoice</p>
          <p className="invoice-number">{draft.invoiceNumber || "INV-0000000"}</p>
          <span>Balance due</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>
      </header>

      <div className="invoice-accent" />

      <section className="invoice-parties">
        <div>
          <p className="invoice-label">From</p>
          <h3>{sellerProfile.name}</h3>
          {sellerProfile.addressLines.map((line) => <p key={line}>{line}</p>)}
          <p>{sellerProfile.phone}</p>
          <p>Reg. {sellerProfile.registrationNumber}</p>
          <p>{sellerProfile.email}</p>
        </div>
        <div>
          <p className="invoice-label">Bill to</p>
          <h3>{customer.displayName || "Customer name"}</h3>
          <p>{customer.companyName || "Company name"}</p>
          {(customer.address || "Customer address").split("\n").map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          {customer.registrationNumber && <p>Reg. {customer.registrationNumber}</p>}
          {customer.vatNumber && <p>VAT {customer.vatNumber}</p>}
          {customer.phone && <p>{customer.phone}</p>}
          {customer.email && <p>{customer.email}</p>}
        </div>
      </section>

      <section className="invoice-meta">
        <div><span>Invoice date</span><strong>{formatDate(draft.invoiceDate)}</strong></div>
        <div><span>Terms</span><strong>{draft.terms || "—"}</strong></div>
        <div><span>Due date</span><strong>{formatDate(draft.dueDate)}</strong></div>
      </section>

      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead><tr><th>#</th><th>Item &amp; description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            {draft.lineItems.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.description || "Item description"}</td>
                <td>{Number.isFinite(item.quantity) ? item.quantity : 0}</td>
                <td>{formatMoney(item.rateCents)}</td>
                <td>{formatMoney(lineItemAmount(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="invoice-bottom">
        <div className="payment-details">
          <p className="invoice-label">Payment details</p>
          <dl>
            <div><dt>Method</dt><dd>{sellerProfile.payment.method}</dd></div>
            <div><dt>Bank</dt><dd>{sellerProfile.payment.bank}</dd></div>
            <div><dt>Account holder</dt><dd>{sellerProfile.payment.accountHolder}</dd></div>
            <div><dt>Account type</dt><dd>{sellerProfile.payment.accountType}</dd></div>
            <div><dt>Account number</dt><dd>{sellerProfile.payment.accountNumber}</dd></div>
            <div><dt>Branch code</dt><dd>{sellerProfile.payment.branchCode}</dd></div>
            <div><dt>Reference</dt><dd>{sellerProfile.payment.reference}</dd></div>
          </dl>
        </div>
        <div className="invoice-totals">
          <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="invoice-total-due"><span>Balance due</span><strong>{formatMoney(subtotal)}</strong></div>
        </div>
      </section>

      <footer className="invoice-footer">
        <span />
        <p>Thank you for choosing Real Is Rare.</p>
        <span />
      </footer>
    </article>
  );
}
