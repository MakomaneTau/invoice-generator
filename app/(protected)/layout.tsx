import { requireAuthorizedUser } from "@/lib/auth/session";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAuthorizedUser();
  return children;
}
