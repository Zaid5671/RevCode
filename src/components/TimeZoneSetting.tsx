"use client";

import { useMemo } from "react";
import { formatLongDate } from "@/client/format";
import { useSettingsSave } from "@/client/mutations";
import { useMe } from "@/client/queries";
import { deviceTimeZone, timeZoneOptions } from "@/client/timeZones";
import type { Me } from "@/domain/schemas";
import { LINK_BUTTON } from "./buttonStyles";
import {
  CardLoadError,
  CardLoading,
  SaveNote,
  SettingsCard,
} from "./SettingsCard";
import { Select } from "./Select";

/**
 * The "Time zone" card in Settings (PLAN.md §8.5, DESIGN-BRIEF.md §6). Picking a zone
 * saves it at once; the user's today (from the server) shows under it.
 */
export function TimeZoneSetting() {
  const me = useMe();
  return (
    <SettingsCard
      title="Time zone"
      description="“Today”, due dates and the dates you can pick follow this zone."
    >
      {me.data ? (
        <ZonePicker me={me.data} />
      ) : me.isError ? (
        <CardLoadError error={me.error} onRetry={() => me.refetch()} />
      ) : (
        <CardLoading />
      )}
    </SettingsCard>
  );
}

function ZonePicker({ me }: { me: Me }) {
  const save = useSettingsSave("setTimezone");
  // The server treats a zone that was never set as UTC (PLAN.md §4.5).
  const saved = me.timezone ?? "UTC";
  const zones = useMemo(() => timeZoneOptions(me.timezone), [me.timezone]);
  const device = deviceTimeZone();
  const shown = save.isPending ? save.variables : saved;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Select label="Time zone" value={shown} onChange={save.mutate}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
        <SaveNote
          pending={save.isPending}
          saved={save.isSuccess}
          error={save.isError ? save.error : null}
        />
      </div>
      <p className="font-mono text-xs text-ink-faint">
        Today for you: {formatLongDate(me.today, { weekday: true })}
      </p>
      {device && device !== saved && !save.isPending && (
        <button
          type="button"
          onClick={() => save.mutate(device)}
          className={LINK_BUTTON}
        >
          Use this device&apos;s time zone ({device})
        </button>
      )}
    </div>
  );
}
