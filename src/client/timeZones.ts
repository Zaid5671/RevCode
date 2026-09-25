// Time zones in the browser (PLAN.md §4.5, §8.5): the device's own, and the list that
// Settings offers.

/** This device's IANA time zone, e.g. "Asia/Kolkata", or `null` if the browser won't say. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Every zone the browser knows, in order, plus UTC and the saved zone: some browsers
 * leave UTC out, and a zone saved on another device may be an alias this one doesn't list.
 */
export function timeZoneOptions(saved: string | null): string[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add("UTC");
  if (saved) zones.add(saved);
  return [...zones].sort();
}
