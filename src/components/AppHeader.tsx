import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { SaveStatus } from "./SaveStatus";
import { UserMenu } from "./UserMenu";

type Props = { user: { name: string; email: string; image?: string | null } };

/** The header on every signed-in page (DESIGN-BRIEF.md §2). */
export function AppHeader({ user }: Props) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-8 px-5">
          <Link href="/" className="font-serif text-xl font-semibold">
            RevCode
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
