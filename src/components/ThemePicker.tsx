"use client";

import { useState } from "react";
import { THEMES, readTheme, saveTheme, type Theme } from "@/client/theme";

const LABELS: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * System / Light / Dark, in the account menu. It mounts only when the menu opens, so
 * reading the stored choice on first render can't differ from the server's HTML.
 */
export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  return (
    <div role="group" aria-label="Theme">
      <p className="mb-1.5 text-xs text-ink-faint">Theme</p>
      <div className="grid grid-cols-3 gap-0.5 rounded-control border border-line bg-surface-2 p-0.5">
        {THEMES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={theme === option}
            onClick={() => {
              saveTheme(option);
              setTheme(option);
            }}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              theme === option
                ? "border border-line-strong bg-surface text-ink-strong"
                : "border border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
