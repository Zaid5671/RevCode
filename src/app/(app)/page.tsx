import { SignOutButton } from "@/components/SignOutButton";
import { requireSession } from "@/server/session";

// Placeholder until Phase 7 builds the dashboard. Layouts don't re-run on every
// navigation, so each page checks the session itself as well.
export default async function Home() {
  const { user } = await requireSession();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-semibold">RevCode</h1>
      <p className="opacity-70">Signed in as {user.name}.</p>
      <SignOutButton />
    </main>
  );
}
