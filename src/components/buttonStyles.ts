// Button looks shared by the overlays (DESIGN-BRIEF.md §1: one teal primary per area).
const BASE =
  "rounded-control px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50";

export const PRIMARY_BUTTON = `${BASE} bg-teal text-on-teal hover:opacity-90`;
export const SECONDARY_BUTTON = `${BASE} border border-line bg-surface text-ink hover:bg-surface-2`;
export const DANGER_BUTTON = `${BASE} bg-rose text-on-teal hover:opacity-90`;
/** A small text link that acts as a button ("edit", "undo"). */
export const LINK_BUTTON =
  "text-xs text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-50";
