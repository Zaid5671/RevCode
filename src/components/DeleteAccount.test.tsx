import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccount } from "./DeleteAccount";
import { apiError, renderWithClient, stubApi, type ApiCall } from "./testUtils";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  social: vi.fn(async (options: unknown) => ({ error: null, options })),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/client/authClient", () => ({
  authClient: { signIn: { social: mocks.social } },
}));

beforeEach(() => {
  mocks.replace.mockClear();
  mocks.social.mockClear();
});

async function openDialog() {
  const { user } = renderWithClient(<DeleteAccount />);
  await user.click(screen.getByRole("button", { name: "Delete account…" }));
  return { user, dialog: screen.getByRole("dialog") };
}

describe("DeleteAccount", () => {
  it("links to the notes download first", () => {
    stubApi(() => undefined);
    renderWithClient(<DeleteAccount />);

    expect(
      screen.getByRole("link", { name: "Download your notes first (.md)" }),
    ).toHaveAttribute("href", "/api/notes/export");
  });

  it("deletes only after the user types delete, then goes to sign-in", async () => {
    const calls = stubApi(({ method }) =>
      method === "DELETE" ? { status: 204 } : undefined,
    );
    const { user, dialog } = await openDialog();
    const confirm = within(dialog).getByRole("button", {
      name: "Delete account",
    });

    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Type delete/), "delet");
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Type delete/), "e");
    await user.click(confirm);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/sign-in"));
    expect(calls).toContainEqual<ApiCall>({
      method: "DELETE",
      path: "/api/account",
      body: undefined,
    });
  });

  it("asks for a fresh sign-in when the session is too old", async () => {
    stubApi(({ method }) =>
      method === "DELETE"
        ? apiError(403, "SESSION_NOT_FRESH", "Sign in again first.")
        : undefined,
    );
    const { user, dialog } = await openDialog();

    await user.type(within(dialog).getByLabelText(/Type delete/), "delete");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete account" }),
    );

    expect(
      await within(dialog).findByText(
        "For safety, sign in again to delete your account.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Type delete/)).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Sign in" }));
    expect(mocks.social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", callbackURL: "/settings" }),
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with the reason when deleting fails", async () => {
    stubApi(({ method }) =>
      method === "DELETE" ? "network-error" : undefined,
    );
    const { user, dialog } = await openDialog();

    await user.type(within(dialog).getByLabelText(/Type delete/), "delete");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete account" }),
    );

    expect(
      await within(dialog).findByText(/Couldn't reach RevCode/),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("closes without deleting on Cancel", async () => {
    const calls = stubApi(() => undefined);
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls).toEqual([]);
  });
});
