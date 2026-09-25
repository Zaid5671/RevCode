import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/client/queries";
import type { Me } from "@/domain/schemas";
import { AccountCard } from "./AccountCard";
import { TimeZoneSync } from "./TimeZoneSync";
import { TODAY, renderWithClient, stubApi, type ApiCall } from "./testUtils";

vi.mock("@/client/timeZones", () => ({
  deviceTimeZone: () => "Asia/Kolkata",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/client/authClient", () => ({ authClient: {} }));

const ME: Me = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
  timezone: null,
  today: TODAY,
};

describe("TimeZoneSync", () => {
  it("saves this device's zone once when none is set", async () => {
    const calls = stubApi(({ method, body }) =>
      method === "PATCH" ? { body: { ...ME, ...(body as object) } } : undefined,
    );
    const { client } = renderWithClient(<TimeZoneSync needed />);

    await waitFor(() =>
      expect(client.getQueryData<Me>(queryKeys.me)?.timezone).toBe(
        "Asia/Kolkata",
      ),
    );
    expect(calls).toEqual<ApiCall[]>([
      { method: "PATCH", path: "/api/me", body: { timezone: "Asia/Kolkata" } },
    ]);
  });

  it("leaves a zone the user already has alone", async () => {
    const calls = stubApi(() => undefined);
    renderWithClient(<TimeZoneSync needed={false} />);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual([]);
  });
});

describe("AccountCard", () => {
  it("shows who is signed in, with Sign out", () => {
    stubApi(() => undefined);
    renderWithClient(<AccountCard />, {
      seed: (client) => client.setQueryData(queryKeys.me, ME),
    });

    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
