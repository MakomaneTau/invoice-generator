import { ZodError } from "zod";
import { authorizeApiRequest, isSameOrigin } from "@/lib/auth/session";
import { archiveInvoice, DuplicateInvoiceNumberError } from "@/lib/invoice/archive";
import { validateInvoice } from "@/lib/invoice/invoice";
import { parseInvoiceDraft } from "@/lib/invoice/schema";

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest();
  if (!authorization.ok) return authorization.response;
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = await request.json() as { invoice?: unknown };
    const draft = parseInvoiceDraft(body.invoice);
    const validationErrors = validateInvoice(draft);
    if (Object.keys(validationErrors).length) {
      return Response.json({ error: "Invoice is incomplete", fields: validationErrors }, { status: 400 });
    }

    const result = await archiveInvoice(authorization.user.uid, draft);
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateInvoiceNumberError) {
      return Response.json({ error: "This invoice number is already in history" }, { status: 409 });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json({ error: "Invoice data is invalid" }, { status: 400 });
    }
    console.error("Failed to archive invoice", error);
    return Response.json({ error: "Invoice could not be archived" }, { status: 500 });
  }
}
