"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Small line icons for the phone bottom bar (DESIGN-BRIEF.md §2).
const icon = (path: ReactNode) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);

const LINKS = [
  {
    href: "/",
    label: "Dashboard",
    icon: icon(<path d="M2.5 7 8 2.5 13.5 7v6.5h-11Z" />),
  },
  {
    href: "/problems",
    label: "Problems",
    icon: icon(
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5" />,
    ),
  },
  {
    href: "/notes",
    label: "Notes",
    icon: icon(<path d="M3.5 2.5h6l3 3v8h-9Zm6 0v3h3M5.5 9h5M5.5 11.5h3" />),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: icon(
      <>
        <circle cx="8" cy="8" r="2" />
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
      </>,
    ),
  },
];

function isCurrent(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** The four page links: a text row in the header, or the bottom bar on phones. */
export function NavLinks({ variant }: { variant: "header" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "header") {
    return (
      <nav aria-label="Main" className="hidden gap-5 text-sm md:flex">
        {LINKS.map(({ href, label }) => {
          const current = isCurrent(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={
                current
                  ? "text-ink underline decoration-1 underline-offset-[6px]"
                  : "text-ink-soft hover:text-ink"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {LINKS.map(({ href, label, icon }) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
              current ? "text-ink" : "text-ink-soft"
            }`}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
