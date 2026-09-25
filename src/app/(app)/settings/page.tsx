import { AccountCard } from "@/components/AccountCard";
import { DeleteAccount } from "@/components/DeleteAccount";
import { GapsEditor } from "@/components/GapsEditor";
import { TimeZoneSetting } from "@/components/TimeZoneSetting";
import { requireSession } from "@/server/session";

export const metadata = { title: "Settings · RevCode" };

/**
 * Settings (PLAN.md §8.5, DESIGN-BRIEF.md §6): the title and one column of cards, centred
 * together. Each card loads its own data and shows its own loading, error and save states.
 */
export default async function SettingsPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-strong">
        Settings
      </h1>
      <div className="flex flex-col gap-6">
        <GapsEditor />
        <TimeZoneSetting />
        <AccountCard />
        <DeleteAccount />
      </div>
    </div>
  );
}
