import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { invoiceSubtotal } from "./invoice";
import { SELLER_PROFILE } from "./profile";
import type { FinalizedInvoice } from "./history";
import type { InvoiceDraft } from "./types";

export class DuplicateInvoiceNumberError extends Error {}

export function normalizeInvoiceNumber(value: string) {
  return value.trim().toLocaleUpperCase("en-ZA").replace(/\s+/g, " ");
}

export function invoiceNumberKey(value: string) {
  return createHash("sha256").update(normalizeInvoiceNumber(value)).digest("hex");
}

function invoiceCollection(uid: string) {
  return getFirebaseAdminFirestore().collection("users").doc(uid).collection("invoices");
}

function serializeInvoice(id: string, data: FirebaseFirestore.DocumentData): FinalizedInvoice {
  const finalizedAt = data.finalizedAt instanceof Timestamp
    ? data.finalizedAt.toDate().toISOString()
    : new Date(data.finalizedAt).toISOString();
  return { id, ...data, templateVersion: data.templateVersion ?? 1, finalizedAt } as FinalizedInvoice;
}

export async function archiveInvoice(uid: string, draft: InvoiceDraft) {
  const db = getFirebaseAdminFirestore();
  const invoiceRef = invoiceCollection(uid).doc();
  const reservationRef = db.collection("users").doc(uid).collection("invoiceNumbers").doc(invoiceNumberKey(draft.invoiceNumber));

  await db.runTransaction(async (transaction) => {
    const reservation = await transaction.get(reservationRef);
    if (reservation.exists) throw new DuplicateInvoiceNumberError("Invoice number already finalized");

    transaction.create(reservationRef, {
      invoiceId: invoiceRef.id,
      invoiceNumber: normalizeInvoiceNumber(draft.invoiceNumber),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(invoiceRef, {
      ownerUid: uid,
      invoice: draft,
      sellerProfile: SELLER_PROFILE,
      subtotalCents: invoiceSubtotal(draft),
      templateVersion: 1,
      finalizedAt: FieldValue.serverTimestamp(),
    });
  });

  return { id: invoiceRef.id };
}

export async function listFinalizedInvoices(uid: string) {
  const snapshot = await invoiceCollection(uid).orderBy("finalizedAt", "desc").limit(50).get();
  return snapshot.docs.map((document) => serializeInvoice(document.id, document.data()));
}

export async function getFinalizedInvoice(uid: string, id: string) {
  const snapshot = await invoiceCollection(uid).doc(id).get();
  return snapshot.exists ? serializeInvoice(snapshot.id, snapshot.data()!) : null;
}
