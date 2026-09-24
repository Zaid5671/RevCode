"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/client/authClient";

export function SignOutButton({ className = "" }: { className?: string }) {
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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={state === "pending"}
        className={`disabled:opacity-60 ${className}`}
      >
        {state === "pending" ? "Signing out…" : "Sign out"}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-xs text-rose">
          Couldn&apos;t sign out. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
