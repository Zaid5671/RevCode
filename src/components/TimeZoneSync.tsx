"use client";

import { useEffect, useRef } from "react";
import { useSettingsSave } from "@/client/mutations";
import { deviceTimeZone } from "@/client/timeZones";

/**
 * After sign-in, saves the browser's time zone once, only while the user has none (PLAN.md
 * §4.5, §8.1), so a zone chosen in Settings (UTC included) is never overwritten.
 */
export function TimeZoneSync({ needed }: { needed: boolean }) {
  const { mutate } = useSettingsSave("setTimezone");
  const sent = useRef(false);

  useEffect(() => {
    if (!needed || sent.current) return;
    sent.current = true;
    const zone = deviceTimeZone();
    if (zone) mutate(zone);
  }, [needed, mutate]);

  return null;
}
