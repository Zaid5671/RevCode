import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { SaveStatus } from "./SaveStatus";
import { UserMenu } from "./UserMenu";

type Props = { user: { name: string; email: string; image?: string | null } };

/** The header on every signed-in page (DESIGN-BRIEF.md §2). It stays at the top. */
export function AppHeader({ user }: Props) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-header-bg backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1720px] items-center gap-4 px-4 sm:px-6 md:gap-8 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold text-on-accent"
            >
              R
            </span>
            <span className="font-mono text-base font-semibold tracking-tight text-ink-strong">
              RevCode
            </span>
          </Link>
          <NavLinks variant="header" />
          <div className="ml-auto flex items-center gap-4">
            <SaveStatus />
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image ?? null}
            />
          </div>
        </div>
      </header>
      <NavLinks variant="bottom" />
    </>
  );
}
