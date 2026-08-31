export const INVOICE_SCHEMA_VERSION = 2 as const;

export type Customer = {
  displayName: string;
  companyName: string;
  address: string;
  registrationNumber: string;
  vatNumber: string;
  phone: string;
  email: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rateCents: number;
};

export type PaymentDetails = {
  method: string;
  bank: string;
  accountHolder: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  reference: string;
};

export type InvoiceDraft = {
  schemaVersion: typeof INVOICE_SCHEMA_VERSION;
  id: string;
  name: string;
  invoiceNumber: string;
  invoiceDate: string;
  terms: string;
  dueDate: string;
  customer: Customer;
  lineItems: LineItem[];
  payment: PaymentDetails;
  sellerProfileId: "real-is-rare";
  createdAt: string;
  updatedAt: string;
};

export type SellerProfile = {
  id: "real-is-rare";
  name: string;
  addressLines: string[];
  phone: string;
  registrationNumber: string;
  email: string;
  payment: PaymentDetails;
};

export type InvoiceErrors = Record<string, string>;

export type StoredInvoiceState = {
  schemaVersion: typeof INVOICE_SCHEMA_VERSION;
  nextSequence: number;
  activeDraftId: string | null;
  drafts: InvoiceDraft[];
};
