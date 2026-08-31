import { z } from "zod";
import { INVOICE_SCHEMA_VERSION, type InvoiceDraft } from "./types";

const shortText = z.string().max(200);
const id = z.string().min(1).max(200);

const customerSchema = z.object({
  displayName: shortText,
  companyName: shortText,
  address: z.string().max(2_000),
  registrationNumber: shortText,
  vatNumber: shortText,
  phone: shortText,
  email: shortText,
}).strict();

const lineItemSchema = z.object({
  id,
  description: z.string().min(1).max(1_000),
  quantity: z.number().finite().positive().max(1_000_000),
  rateCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();

const paymentSchema = z.object({
  method: shortText,
  bank: shortText,
  accountHolder: shortText,
  accountType: shortText,
  accountNumber: shortText,
  branchCode: shortText,
  reference: shortText,
}).strict();

export const invoiceDraftSchema = z.object({
  schemaVersion: z.literal(INVOICE_SCHEMA_VERSION),
  id,
  name: z.string().min(1).max(400),
  invoiceNumber: z.string().min(1).max(100),
  invoiceDate: z.iso.date(),
  terms: shortText,
  dueDate: z.iso.date(),
  customer: customerSchema,
  lineItems: z.array(lineItemSchema).min(1).max(100),
  payment: paymentSchema,
  sellerProfileId: z.literal("real-is-rare"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export function parseInvoiceDraft(value: unknown): InvoiceDraft {
  return invoiceDraftSchema.parse(value) as InvoiceDraft;
}
