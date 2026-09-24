import { redirect } from "next/navigation";
import { getPageSession } from "@/server/session";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const metadata = { title: "Sign in · RevCode" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  if (await getPageSession()) redirect("/");
  // Better Auth sends users back here with ?error=… when Google sign-in fails.
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">RevCode</h1>
      <p className="opacity-70">Track your NeetCode 250 revisions and notes.</p>
      <GoogleSignInButton />
      {error !== undefined && (
        <p role="alert" className="text-sm text-red-600">
          Sign-in didn&apos;t complete. Please try again.
        </p>
      )}
    </main>
  );
}
