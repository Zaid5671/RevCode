"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { SignOutButton } from "./SignOutButton";

type Props = { name: string; email: string; image: string | null };

/** The user's photo in the header; it opens a small menu with Sign out. */
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
        className="block size-7 overflow-hidden rounded-full border border-line bg-surface-2"
      >
        {image ? (
          <Image src={image} alt="" width={28} height={28} />
        ) : (
          <span aria-hidden="true" className="text-xs text-ink-soft">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-30 mt-2 w-56 rounded-card border border-line bg-surface p-3 text-sm"
        >
          <p className="truncate font-medium">{name}</p>
          <p className="mb-2 truncate text-xs text-ink-soft">{email}</p>
          <SignOutButton className="w-full rounded-control border border-line px-3 py-1.5 text-left hover:bg-surface-2" />
        </div>
      )}
    </div>
  );
}
