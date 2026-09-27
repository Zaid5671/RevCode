"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SignOutButton } from "./SignOutButton";
import { ThemePicker } from "./ThemePicker";

type Props = { name: string; email: string; image: string | null };

/** The user's photo in the header; it opens a small menu with the theme, Sign out, and Privacy · Terms. */
export function UserMenu({ name, email, image }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-3 hover:border-ink-faint"
      >
        {image ? (
          <Image src={image} alt="" width={28} height={28} />
        ) : (
          <span aria-hidden="true" className="font-mono text-xs text-ink-soft">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-50 mt-2 flex w-60 flex-col gap-3 rounded-card border border-line-strong bg-surface p-3 text-sm"
        >
          <div>
            <p className="truncate font-medium text-ink-strong">{name}</p>
            <p className="truncate text-xs text-ink-soft">{email}</p>
          </div>
          <ThemePicker />
          <SignOutButton className="w-full rounded-control border border-line px-3 py-1.5 text-left text-xs font-medium hover:bg-hover" />
          <p className="text-xs text-ink-faint">
            <Link
              href="/privacy"
              onClick={() => setOpen(false)}
              className="hover:text-accent"
            >
              Privacy
            </Link>
            {" · "}
            <Link
              href="/terms"
              onClick={() => setOpen(false)}
              className="hover:text-accent"
            >
              Terms
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
