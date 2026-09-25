// Form controls shared by the Problems filters and Settings (DESIGN-BRIEF.md §4, §6).

export const FIELD =
  "rounded-control border border-line-strong bg-field py-2 text-xs text-ink hover:border-ink-ghost focus:border-accent focus:outline-none";

/** A select with its own chevron, as in the design (DESIGN-BRIEF.md §4). */
export function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} cursor-pointer appearance-none pr-8 pl-3 font-medium text-ink`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-soft"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
