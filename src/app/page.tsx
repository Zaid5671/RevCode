import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const metadata = {
  title: "RevCode · NeetCode 250 revision tracker",
  description:
    "Track your NeetCode 250 progress, revise on a spaced-repetition schedule and keep notes per problem.",
};

// Placeholder landing page. Public and static: proxy.ts sends signed-in visitors
// straight to /dashboard, so this page never checks the session itself.
export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-mono text-3xl font-semibold tracking-tight text-ink-strong">
        RevCode
      </h1>
      <p className="max-w-md text-ink-soft">
        Track your NeetCode 250 progress, revise each problem on a
        spaced-repetition schedule, and keep your notes in one place.
      </p>
      <GoogleSignInButton />
      <p className="mt-4 text-xs text-ink-faint">
        <Link href="/privacy" className="hover:text-accent">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-accent">
          Terms
        </Link>
      </p>
    </main>
  );
}
