import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatMoney, invoiceSubtotal, lineItemAmount } from "@/lib/invoice/invoice";
import { SELLER_PROFILE } from "@/lib/invoice/profile";
import type { InvoiceDraft, SellerProfile } from "@/lib/invoice/types";

const colours = {
  ink: "#16241f",
  muted: "#64706b",
  green: "#153d32",
  pale: "#eef2ed",
  warm: "#f7f3eb",
  gold: "#c99552",
  line: "#dce2dc",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: { padding: 38, paddingBottom: 44, fontFamily: "Helvetica", fontSize: 9, color: colours.ink, backgroundColor: colours.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 62, height: 64, objectFit: "contain" },
  kicker: { fontSize: 7, letterSpacing: 1.2, textTransform: "uppercase", color: colours.gold, marginBottom: 4 },
  businessName: { fontFamily: "Helvetica-Bold", fontSize: 15, color: colours.green },
  titleBlock: { alignItems: "flex-end" },
  invoiceTitle: { fontFamily: "Helvetica-Bold", fontSize: 25, textTransform: "uppercase", letterSpacing: 1.5, color: colours.green },
  invoiceNumber: { fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 4 },
  balanceLabel: { fontSize: 7, color: colours.muted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 9 },
  balance: { fontFamily: "Helvetica-Bold", fontSize: 14, marginTop: 2 },
  accent: { height: 3, backgroundColor: colours.gold, marginBottom: 18 },
  parties: { flexDirection: "row", gap: 38, marginBottom: 18 },
  party: { width: "48%" },
  label: { color: colours.gold, fontFamily: "Helvetica-Bold", fontSize: 7, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 4 },
  detail: { fontSize: 8.5, color: colours.muted, lineHeight: 1.45 },
  meta: { flexDirection: "row", backgroundColor: colours.pale, padding: 11, marginBottom: 16 },
  metaCell: { flexGrow: 1 },
  metaLabel: { fontSize: 6.5, color: colours.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3 },
  metaValue: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  table: { marginBottom: 18 },
  tableHeader: { flexDirection: "row", backgroundColor: colours.green, color: colours.white, minHeight: 27, alignItems: "center", paddingHorizontal: 8 },
  tableRow: { flexDirection: "row", minHeight: 31, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colours.line, paddingHorizontal: 8, paddingVertical: 6 },
  colIndex: { width: "6%" },
  colDescription: { width: "46%", paddingRight: 6 },
  colQuantity: { width: "12%", textAlign: "right" },
  colRate: { width: "18%", textAlign: "right" },
  colAmount: { width: "18%", textAlign: "right" },
  headerText: { fontFamily: "Helvetica-Bold", fontSize: 7, textTransform: "uppercase", letterSpacing: 0.5 },
  bottom: { flexDirection: "row", justifyContent: "space-between", gap: 24 },
  payment: { width: "54%", padding: 12, backgroundColor: colours.warm },
  paymentRow: { flexDirection: "row", marginBottom: 4 },
  paymentKey: { width: "42%", color: colours.muted },
  paymentValue: { width: "58%", fontFamily: "Helvetica-Bold" },
  totals: { width: "40%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colours.line },
  dueRow: { flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: colours.green, color: colours.white },
  dueText: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  footer: { position: "absolute", left: 38, right: 38, bottom: 22, flexDirection: "row", alignItems: "center", gap: 10 },
  footerLine: { flexGrow: 1, height: 1, backgroundColor: colours.line },
  footerText: { fontFamily: "Helvetica-Oblique", fontSize: 8, color: colours.muted },
  pageNumber: { position: "absolute", right: 38, bottom: 10, fontSize: 6.5, color: colours.muted },
});

function Detail({ children }: { children: React.ReactNode }) {
  return <Text style={styles.detail}>{children}</Text>;
}

export function InvoicePdfDocument({ draft, logoUrl, sellerProfile = SELLER_PROFILE }: { draft: InvoiceDraft; logoUrl: string; sellerProfile?: SellerProfile }) {
  const subtotal = invoiceSubtotal(draft);
  const customer = draft.customer;
  const paymentRows: [string, string][] = [
    ["Method", sellerProfile.payment.method],
    ["Bank", sellerProfile.payment.bank],
    ["Account holder", sellerProfile.payment.accountHolder],
    ["Account type", sellerProfile.payment.accountType],
    ["Account number", sellerProfile.payment.accountNumber],
    ["Branch code", sellerProfile.payment.branchCode],
    ["Reference", sellerProfile.payment.reference],
  ];

  return (
    <Document title={draft.invoiceNumber} author={sellerProfile.name} subject={`Invoice for ${customer.companyName}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.brand}>
            {/* react-pdf Image has no HTML alt attribute; the adjacent business name supplies context. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={styles.logo} />
            <View><Text style={styles.kicker}>Apparel · Est. 2020</Text><Text style={styles.businessName}>{sellerProfile.name}</Text></View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{draft.invoiceNumber}</Text>
            <Text style={styles.balanceLabel}>Balance due</Text>
            <Text style={styles.balance}>{formatMoney(subtotal)}</Text>
          </View>
        </View>
        <View style={styles.accent} />

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>From</Text><Text style={styles.partyName}>{sellerProfile.name}</Text>
            {sellerProfile.addressLines.map((line) => <Detail key={line}>{line}</Detail>)}
            <Detail>{sellerProfile.phone}</Detail><Detail>Reg. {sellerProfile.registrationNumber}</Detail><Detail>{sellerProfile.email}</Detail>
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Bill to</Text><Text style={styles.partyName}>{customer.displayName}</Text><Detail>{customer.companyName}</Detail>
            {customer.address.split("\n").map((line, index) => <Detail key={`${line}-${index}`}>{line}</Detail>)}
            {customer.registrationNumber && <Detail>Reg. {customer.registrationNumber}</Detail>}
            {customer.vatNumber && <Detail>VAT {customer.vatNumber}</Detail>}
            {customer.phone && <Detail>{customer.phone}</Detail>}{customer.email && <Detail>{customer.email}</Detail>}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>Invoice date</Text><Text style={styles.metaValue}>{formatDate(draft.invoiceDate)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>Terms</Text><Text style={styles.metaValue}>{draft.terms || "—"}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>Due date</Text><Text style={styles.metaValue}>{formatDate(draft.dueDate)}</Text></View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colIndex, styles.headerText]}>#</Text><Text style={[styles.colDescription, styles.headerText]}>Item &amp; description</Text><Text style={[styles.colQuantity, styles.headerText]}>Qty</Text><Text style={[styles.colRate, styles.headerText]}>Rate</Text><Text style={[styles.colAmount, styles.headerText]}>Amount</Text>
          </View>
          {draft.lineItems.map((item, index) => (
            <View style={styles.tableRow} key={item.id} wrap={false}>
              <Text style={styles.colIndex}>{index + 1}</Text><Text style={styles.colDescription}>{item.description}</Text><Text style={styles.colQuantity}>{item.quantity}</Text><Text style={styles.colRate}>{formatMoney(item.rateCents)}</Text><Text style={styles.colAmount}>{formatMoney(lineItemAmount(item))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottom} wrap={false} minPresenceAhead={130}>
          <View style={styles.payment}><Text style={styles.label}>Payment details</Text>{paymentRows.map(([key, value]) => <View style={styles.paymentRow} key={key}><Text style={styles.paymentKey}>{key}</Text><Text style={styles.paymentValue}>{value}</Text></View>)}</View>
          <View style={styles.totals}><View style={styles.totalRow}><Text>Subtotal</Text><Text>{formatMoney(subtotal)}</Text></View><View style={styles.dueRow}><Text style={styles.dueText}>Balance due</Text><Text style={styles.dueText}>{formatMoney(subtotal)}</Text></View></View>
        </View>

        <View style={styles.footer} fixed><View style={styles.footerLine} /><Text style={styles.footerText}>Thank you for choosing Real Is Rare.</Text><View style={styles.footerLine} /></View>
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
