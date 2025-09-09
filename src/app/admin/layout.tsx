import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect if not authenticated
  if (!session) {
    redirect("/login");
  }

  // Redirect if not admin
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  // Redirect if not approved
  if (session.user.status !== "APPROVED") {
    redirect("/pending");
  }

  return <>{children}</>;
}
