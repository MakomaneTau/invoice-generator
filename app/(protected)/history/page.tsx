import Link from "next/link";
import { AppBrand } from "@/components/AppBrand";
import { LogoutButton } from "@/components/LogoutButton";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import { requireAuthorizedUser } from "@/lib/auth/session";
import { listFinalizedInvoices } from "@/lib/invoice/archive";
import { formatMoney } from "@/lib/invoice/invoice";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function HistoryPage() {
  const user = await requireAuthorizedUser();
  const invoices = await listFinalizedInvoices(user.uid);

  return (
    <main className="history-shell">
      <header className="app-header"><AppBrand /><div className="header-actions"><Link className="button button-outline" href="/">New invoice</Link><LogoutButton /></div></header>
      <section className="history-content">
        <div className="history-heading"><div><span>Firestore archive</span><h1>Invoice history</h1><p>Browse every finalized invoice. Open one to download it or edit and overwrite the saved record.</p></div><strong>{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</strong></div>
        {invoices.length ? (
          <div className="history-list">
            {invoices.map((entry) => (
              <article className="history-card" key={entry.id}>
                <div><span>{entry.invoice.invoiceNumber}</span><h2>{entry.invoice.customer.companyName || entry.invoice.customer.displayName}</h2><p>Invoice date {entry.invoice.invoiceDate} · Finalized {formatTimestamp(entry.finalizedAt)}</p></div>
                <strong>{formatMoney(entry.subtotalCents)}</strong>
                <div className="history-actions"><Link className="button button-soft" href={`/history/${entry.id}`}>View</Link><PdfDownloadButton draft={entry.invoice} sellerProfile={entry.sellerProfile} /></div>
              </article>
            ))}
          </div>
        ) : <div className="history-empty"><h2>No finalized invoices yet</h2><p>Complete an invoice and download it to add the first history record.</p><Link className="button button-primary" href="/">Create an invoice</Link></div>}
      </section>
    </main>
  );
}
