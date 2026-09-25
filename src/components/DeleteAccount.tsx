"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ApiError } from "@/client/api";
import { authClient } from "@/client/authClient";
import { useSettingsSave } from "@/client/mutations";
import {
  DANGER_BUTTON,
  LINK_BUTTON,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "./buttonStyles";
import { FieldError } from "./DateField";
import { Dialog } from "./Dialog";
import { SettingsCard } from "./SettingsCard";

const CONFIRM_WORD = "delete";

/**
 * The "Delete account" card in Settings (PLAN.md §8.5, DESIGN-BRIEF.md §6): a link to
 * download the notes first, and a button that opens the type-to-confirm dialog.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  return (
    <SettingsCard
      title="Delete account"
      description="Deletes your progress, gaps and notes for good. This can’t be undone."
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href="/api/notes/export" download className={LINK_BUTTON}>
          Download your notes first (.md)
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13px] font-medium text-rose hover:underline hover:underline-offset-2"
        >
          Delete account…
        </button>
      </div>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </SettingsCard>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const inputId = useId();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const remove = useSettingsSave("deleteAccount");
  // Google-only users must have signed in within a day to delete (PLAN.md §6).
  const staleSession =
    remove.error instanceof ApiError &&
    remove.error.code === "SESSION_NOT_FRESH";
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <Dialog onClose={onClose} labelledBy={titleId}>
      <div className="flex flex-col gap-4 p-5">
        <h2 id={titleId} className="text-[17px] font-semibold">
          Delete your account?
        </h2>
        {staleSession ? (
          <SignInAgain onCancel={onClose} />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!confirmed) return;
              remove.mutate(undefined, {
                onSuccess: () => router.replace("/sign-in"),
              });
            }}
          >
            <p className="text-[14px]">
              This deletes your progress, gaps and notes for good.
            </p>
            <div>
              <label htmlFor={inputId} className="text-[13px] text-ink-soft">
                Type <strong className="text-ink">{CONFIRM_WORD}</strong> to
                confirm
              </label>
              <input
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                data-autofocus
                className="mt-1 block w-full rounded-control border border-line-strong bg-field px-3 py-1.5 text-[13px] text-ink focus:border-accent focus:outline-none"
              />
              {remove.isError && (
                <FieldError>{remove.error.message}</FieldError>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!confirmed || remove.isPending}
                className={DANGER_BUTTON}
              >
                {remove.isPending ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}

/** Google comes back to Settings, where the user can delete with a fresh session. */
function SignInAgain({ onCancel }: { onCancel: () => void }) {
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);
  // It replaces the form, whose button had focus.
  useEffect(() => buttonRef.current?.focus(), []);

  async function signIn() {
    setState("pending");
    // On success the browser leaves for Google, so only failure needs handling here.
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/settings",
      errorCallbackURL: "/sign-in",
    });
    if (error) setState("failed");
  }

  return (
    <>
      <p className="text-[14px]">
        For safety, sign in again to delete your account.
      </p>
      {state === "failed" && (
        <FieldError>
          Couldn&apos;t reach the sign-in service. Check your connection and try
          again.
        </FieldError>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          Cancel
        </button>
        <button
          type="button"
          onClick={signIn}
          ref={buttonRef}
          disabled={state === "pending"}
          className={PRIMARY_BUTTON}
        >
          {state === "pending" ? "Opening Google…" : "Sign in"}
        </button>
      </div>
    </>
  );
}
