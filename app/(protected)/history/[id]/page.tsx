import Link from "next/link";
import { notFound } from "next/navigation";
import { AppBrand } from "@/components/AppBrand";
import { EditFinalizedInvoiceButton } from "@/components/EditFinalizedInvoiceButton";
import { InvoicePreview } from "@/components/InvoicePreview";
import { LogoutButton } from "@/components/LogoutButton";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import { requireAuthorizedUser } from "@/lib/auth/session";
import { getFinalizedInvoice } from "@/lib/invoice/archive";

export default async function HistoryDetailPage({ params }: PageProps<"/history/[id]">) {
  const user = await requireAuthorizedUser();
  const { id } = await params;
  const entry = await getFinalizedInvoice(user.uid, id);
  if (!entry) notFound();

  return (
    <main className="history-shell">
      <header className="app-header"><AppBrand /><div className="header-actions"><Link className="button button-outline" href="/history">Back to history</Link><LogoutButton /></div></header>
      <section className="history-detail">
        <div className="history-detail-heading"><div><span>Finalized invoice</span><h1>{entry.invoice.invoiceNumber}</h1><p>{entry.invoice.customer.companyName || entry.invoice.customer.displayName}</p></div><div className="history-actions"><EditFinalizedInvoiceButton invoice={entry.invoice} sellerProfile={entry.sellerProfile} /><PdfDownloadButton draft={entry.invoice} sellerProfile={entry.sellerProfile} className="button button-primary" /></div></div>
        <div className="history-preview"><InvoicePreview draft={entry.invoice} sellerProfile={entry.sellerProfile} archived /></div>
      </section>
    </main>
  );
}
