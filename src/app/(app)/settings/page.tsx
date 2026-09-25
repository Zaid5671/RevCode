import { requireSession } from "@/server/session";

export const metadata = { title: "Settings · RevCode" };

// Placeholder so the header link works; Phase 7 builds Settings here.
export default async function SettingsPage() {
  await requireSession();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink-strong">
        Settings
      </h1>
      <p className="mt-2 text-ink-soft">
        Revision gaps, time zone and your account will be here. Sign out is in
        the menu under your photo.
      </p>
    </>
  );
}
