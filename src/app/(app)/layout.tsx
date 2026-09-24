import { requireSession } from "@/server/session";

// Every page in this group needs a signed-in user. proxy.ts only redirects early when
// the cookie is missing; this is the check that counts (PLAN.md §6).
export default async function SignedInLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  return children;
}
