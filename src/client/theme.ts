// The viewer's light/dark choice (DESIGN-BRIEF.md §2). It lives in this browser only, like
// the open categories: "system" follows the operating system; "light" and "dark" set
// `data-theme` on <html>, which globals.css turns into `color-scheme`.

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const KEY = "revcode-theme";

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage can be blocked (private windows, strict settings).
    return "system";
  }
}

export function saveTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // The choice still applies to this page; it just isn't remembered.
  }
}

/**
 * Runs before the page paints (root layout), so a saved choice never flashes the other
 * theme first. Kept tiny and dependency-free; it mirrors readTheme().
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
