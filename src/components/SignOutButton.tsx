"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/client/authClient";

export function SignOutButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle");

  async function signOut() {
    setState("pending");
    const { error } = await authClient.signOut();
    if (error) {
      setState("failed");
      return;
    }
    router.replace("/sign-in");
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={state === "pending"}
        className="rounded border px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {state === "pending" ? "Signing out…" : "Sign out"}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t sign out. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
