import { AppHeader } from "@/components/AppHeader";
import { Providers } from "@/components/Providers";
import { requireSession } from "@/server/session";

// Every page in this group needs a signed-in user. proxy.ts only redirects early when
// the cookie is missing; this is the check that counts (PLAN.md §6).
export default async function SignedInLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireSession();
  return (
    <Providers>
      <AppHeader user={user} />
      {/* Bottom padding keeps content clear of the phone bottom bar. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pt-6 pb-24 md:pb-12">
        {children}
      </main>
    </Providers>
  );
}
