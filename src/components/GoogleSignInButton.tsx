"use client";

import { useState } from "react";
import { authClient } from "@/client/authClient";

export function GoogleSignInButton() {
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle");

  async function signIn() {
    setState("pending");
    // On success the browser leaves for Google, so only failure needs handling here.
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
      errorCallbackURL: "/sign-in",
    });
    if (error) setState("failed");
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={signIn}
        disabled={state === "pending"}
        className="rounded-control border border-line bg-surface px-4 py-2 hover:bg-surface-2 disabled:opacity-60"
      >
        {state === "pending" ? "Opening Google…" : "Continue with Google"}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-sm text-rose">
          Couldn&apos;t reach the sign-in service. Check your connection and try
          again.
        </p>
      )}
    </div>
  );
}
