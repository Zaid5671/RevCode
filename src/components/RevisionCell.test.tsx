import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RevisionCell } from "./RevisionCell";
import { TODAY } from "./testUtils";

describe("RevisionCell", () => {
  it("shows a done revision as a teal ✓ date, with no button", () => {
    render(
      <RevisionCell
        revision={{ number: 1, status: "done", date: "2026-09-18" }}
        today={TODAY}
        onMarkDone={vi.fn()}
      />,
    );
    expect(screen.getByText("18 Sep")).toBeInTheDocument();
    expect(screen.getByText(/R1 done on/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a projected revision faint and in brackets, with no button", () => {
    render(
      <RevisionCell
        revision={{ number: 3, status: "projected", date: "2026-10-09" }}
        today={TODAY}
        onMarkDone={vi.fn()}
      />,
    );
    expect(screen.getByText(/\(9 Oct\)/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the next revision's due date and a ✓ that opens the done popover", async () => {
    const onMarkDone = vi.fn();
    render(
      <RevisionCell
        revision={{ number: 2, status: "overdue", date: "2026-09-20" }}
        today={TODAY}
        onMarkDone={onMarkDone}
      />,
    );
    expect(screen.getByText("20 Sep")).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: "Mark R2 done (due 3d late)",
    });
    await userEvent.click(button);
    expect(onMarkDone).toHaveBeenCalledWith(button);
  });
});
