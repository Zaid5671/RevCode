import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/client/queries";
import type { Me } from "@/domain/schemas";
import { TimeZoneSetting } from "./TimeZoneSetting";
import {
  TODAY,
  apiError,
  renderWithClient,
  stubApi,
  type ApiCall,
} from "./testUtils";

const device = vi.hoisted(() => ({ zone: "Asia/Kolkata" as string | null }));
vi.mock("@/client/timeZones", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/client/timeZones")>()),
  deviceTimeZone: () => device.zone,
}));

const ME: Me = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
  timezone: "Asia/Kolkata",
  today: TODAY,
};

function renderSetting(me: Me = ME) {
  return renderWithClient(<TimeZoneSetting />, {
    seed: (client) => client.setQueryData(queryKeys.me, me),
  });
}

const select = () => screen.getByRole("combobox", { name: "Time zone" });

beforeEach(() => {
  device.zone = "Asia/Kolkata";
});

describe("TimeZoneSetting", () => {
  it("shows the saved zone and the user's today", () => {
    stubApi(() => undefined);
    renderSetting();

    expect(select()).toHaveValue("Asia/Kolkata");
    expect(screen.getByText("Today for you: Wed 23 Sep 2026")).toBeVisible();
  });

  it("saves a new zone at once and shows the server's today for it", async () => {
    const calls = stubApi(({ method, body }) =>
      method === "PATCH"
        ? { body: { ...ME, ...(body as object), today: "2026-09-22" } }
        : undefined,
    );
    const { user } = renderSetting();

    await user.selectOptions(select(), "America/New_York");

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(calls).toContainEqual<ApiCall>({
      method: "PATCH",
      path: "/api/me",
      body: { timezone: "America/New_York" },
    });
    expect(select()).toHaveValue("America/New_York");
    expect(screen.getByText("Today for you: Tue 22 Sep 2026")).toBeVisible();
  });

  it("shows a refused save and goes back to the saved zone", async () => {
    stubApi(({ method }) =>
      method === "PATCH"
        ? apiError(400, "VALIDATION_ERROR", "Unknown time zone.")
        : undefined,
    );
    const { user } = renderSetting();

    await user.selectOptions(select(), "America/New_York");

    expect(await screen.findByText("Unknown time zone.")).toBeInTheDocument();
    expect(select()).toHaveValue("Asia/Kolkata");
  });

  it("offers this device's zone when the saved one differs", async () => {
    const calls = stubApi(({ method, body }) =>
      method === "PATCH" ? { body: { ...ME, ...(body as object) } } : undefined,
    );
    const { user } = renderSetting({ ...ME, timezone: "UTC" });

    await user.click(
      screen.getByRole("button", {
        name: "Use this device's time zone (Asia/Kolkata)",
      }),
    );

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(calls).toContainEqual<ApiCall>({
      method: "PATCH",
      path: "/api/me",
      body: { timezone: "Asia/Kolkata" },
    });
    expect(
      screen.queryByRole("button", { name: /Use this device's time zone/ }),
    ).not.toBeInTheDocument();
  });

  it("shows UTC for a zone that was never set", () => {
    stubApi(() => undefined);
    device.zone = null;
    renderSetting({ ...ME, timezone: null });

    expect(select()).toHaveValue("UTC");
  });
});
