"use client";

import Image from "next/image";
import { useMe } from "@/client/queries";
import { SECONDARY_BUTTON } from "./buttonStyles";
import { CardLoadError, CardLoading, SettingsCard } from "./SettingsCard";
import { SignOutButton } from "./SignOutButton";

/** The "Account" card in Settings (DESIGN-BRIEF.md §6): who is signed in, and Sign out. */
export function AccountCard() {
  const me = useMe();
  return (
    <SettingsCard title="Account">
      {me.data ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-3">
            {me.data.image ? (
              <Image src={me.data.image} alt="" width={40} height={40} />
            ) : (
              <span
                aria-hidden="true"
                className="font-mono text-sm text-ink-soft"
              >
                {me.data.name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink-strong">
              {me.data.name}
            </p>
            <p className="truncate text-xs text-ink-soft">{me.data.email}</p>
          </div>
          <SignOutButton className={SECONDARY_BUTTON} />
        </div>
      ) : me.isError ? (
        <CardLoadError error={me.error} onRetry={() => me.refetch()} />
      ) : (
        <CardLoading />
      )}
    </SettingsCard>
  );
}
