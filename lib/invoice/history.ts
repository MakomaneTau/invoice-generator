import type { InvoiceDraft, SellerProfile } from "./types";

export type FinalizedInvoice = {
  id: string;
  ownerUid: string;
  invoice: InvoiceDraft;
  sellerProfile: SellerProfile;
  subtotalCents: number;
  templateVersion: number;
  finalizedAt: string;
};
