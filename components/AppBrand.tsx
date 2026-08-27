import Link from "next/link";

export function AppBrand() {
  return (
    <Link href="/" className="app-brand" aria-label="Invoice Studio home">
      <span className="brand-mark" aria-hidden="true">R<span>R</span></span>
      <span className="app-brand-copy"><span>Real Is Rare</span><strong>Invoice Studio</strong></span>
    </Link>
  );
}
