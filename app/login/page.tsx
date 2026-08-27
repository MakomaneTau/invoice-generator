import Image from "next/image";
import { redirect } from "next/navigation";
import { AppBrand } from "@/components/AppBrand";
import { LoginForm } from "@/components/LoginForm";
import { getAuthorizedUser } from "@/lib/auth/session";

export default async function LoginPage() {
  if (await getAuthorizedUser()) redirect("/");

  return (
    <main className="login-shell">
      <section className="login-showcase" aria-label="Real Is Rare Invoice Studio">
        <AppBrand />
        <div className="login-showcase-copy">
          <span className="login-eyebrow">Private finance workspace</span>
          <h1>Invoices that look<br />as considered as<br /><em>the work.</em></h1>
          <p>Create polished invoices, preserve every final copy, and keep the business history in one secure place.</p>
        </div>
        <div className="login-showcase-footer">
          <div className="login-logo-seal"><Image src="/real-is-rare-logo.png" alt="" width={88} height={92} priority /></div>
          <div className="login-feature-list">
            <span><i />Local draft autosave</span>
            <span><i />Private Firestore history</span>
            <span><i />On-demand PDF export</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-mobile-brand"><AppBrand /></div>
        <div className="login-card">
          <div className="login-access-mark" aria-hidden="true"><span>RR</span></div>
          <div className="login-heading">
            <span>Authorized access only</span>
            <h2>Welcome back.</h2>
            <p>Use the approved Real Is Rare account to enter the invoice workspace.</p>
          </div>
          <LoginForm />
          <p className="login-security-note"><span aria-hidden="true">●</span> Protected by Firebase Authentication</p>
        </div>
        <p className="login-panel-footer">Real Is Rare Apparel · Invoice Studio</p>
      </section>
    </main>
  );
}
