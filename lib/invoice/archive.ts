import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { invoiceSubtotal } from "./invoice";
import { SELLER_PROFILE } from "./profile";
import type { FinalizedInvoice } from "./history";
import type { InvoiceDraft } from "./types";

export class DuplicateInvoiceNumberError extends Error {}

type ArchiveInvoiceOptions = {
  overwrite?: boolean;
};

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

export async function archiveInvoice(uid: string, draft: InvoiceDraft, { overwrite = false }: ArchiveInvoiceOptions = {}) {
  const db = getFirebaseAdminFirestore();
  const invoiceRef = invoiceCollection(uid).doc();
  const reservationRef = db.collection("users").doc(uid).collection("invoiceNumbers").doc(invoiceNumberKey(draft.invoiceNumber));
  let archivedId = invoiceRef.id;
  let overwritten = false;

  await db.runTransaction(async (transaction) => {
    const reservation = await transaction.get(reservationRef);
    const invoiceData = {
      ownerUid: uid,
      invoice: draft,
      sellerProfile: SELLER_PROFILE,
      subtotalCents: invoiceSubtotal(draft),
      templateVersion: 1,
      finalizedAt: FieldValue.serverTimestamp(),
    };

    if (reservation.exists) {
      if (!overwrite) throw new DuplicateInvoiceNumberError("Invoice number already finalized");
      const existingInvoiceId = reservation.data()?.invoiceId;
      if (typeof existingInvoiceId !== "string" || !existingInvoiceId) {
        throw new Error("Invoice number reservation is invalid");
      }
      const existingInvoiceRef = invoiceCollection(uid).doc(existingInvoiceId);
      transaction.set(existingInvoiceRef, invoiceData);
      archivedId = existingInvoiceId;
      overwritten = true;
      return;
    }

    transaction.create(reservationRef, {
      invoiceId: invoiceRef.id,
      invoiceNumber: normalizeInvoiceNumber(draft.invoiceNumber),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(invoiceRef, invoiceData);
  });

  return { id: archivedId, overwritten };
}

export async function listFinalizedInvoices(uid: string) {
  const snapshot = await invoiceCollection(uid).orderBy("finalizedAt", "desc").get();
  return snapshot.docs.map((document) => serializeInvoice(document.id, document.data()));
}

export async function getFinalizedInvoice(uid: string, id: string) {
  const snapshot = await invoiceCollection(uid).doc(id).get();
  return snapshot.exists ? serializeInvoice(snapshot.id, snapshot.data()!) : null;
}
