import { InvoiceWorkspace } from "@/components/InvoiceWorkspace";
import { requireAuthorizedUser } from "@/lib/auth/session";
import { getNextFinalizedInvoiceSequence } from "@/lib/invoice/archive";

export default async function Home() {
  const user = await requireAuthorizedUser();
  const initialSequence = await getNextFinalizedInvoiceSequence(user.uid);

  return <InvoiceWorkspace initialSequence={initialSequence} />;
}
