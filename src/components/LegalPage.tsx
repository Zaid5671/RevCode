import Link from "next/link";
import type { ReactNode } from "react";

// Privacy and Terms (DESIGN-BRIEF.md §8): one reading column, max 680 px, a title, a
// "Last updated" date, then headings and paragraphs. Public pages, so no app header.

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-12 text-[15px] leading-relaxed text-ink sm:px-8">
      <Link
        href="/"
        className="font-mono text-base font-semibold text-ink-strong hover:text-accent"
      >
        RevCode
      </Link>
      <h1 className="mt-8 text-2xl font-bold tracking-tight text-ink-strong">
        {title}
      </h1>
      <p className="mt-1 text-sm text-ink-faint">Last updated {updated}</p>
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </main>
  );
}

export function LegalHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-4 text-[17px] font-semibold text-ink-strong">
      {children}
    </h2>
  );
}
