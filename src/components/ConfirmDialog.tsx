"use client";

import { useId } from "react";
import { DANGER_BUTTON, SECONDARY_BUTTON } from "./buttonStyles";
import { FieldError } from "./DateField";
import { Dialog } from "./Dialog";

/**
 * A one-sentence confirmation with Cancel and a rose action (DESIGN-BRIEF.md §7). It stays
 * open until the action succeeds, so a failure shows here, next to the button.
 */
export function ConfirmDialog({
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  pending,
  error,
}: {
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
  error?: string | null;
}) {
  const messageId = useId();
  return (
    <Dialog onClose={onCancel} labelledBy={messageId}>
      <div className="p-5">
        <p id={messageId} className="text-[14px]">
          {message}
        </p>
        {error && <FieldError>{error}</FieldError>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-autofocus
            className={SECONDARY_BUTTON}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={DANGER_BUTTON}
          >
            {pending ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
