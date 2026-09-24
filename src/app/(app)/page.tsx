import Link from "next/link";
import { requireSession } from "@/server/session";

// Placeholder until Phase 7 builds the dashboard. Layouts don't re-run on every
// navigation, so each page checks the session itself as well.
export default async function Home() {
  await requireSession();
  return (
    <>
      <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-ink-soft">
        Your revision reminders will appear here. For now, track your progress
        on the{" "}
        <Link href="/problems" className="text-teal underline">
          Problems
        </Link>{" "}
        page.
      </p>
    </>
  );
}
