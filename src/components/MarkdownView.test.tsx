import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownView } from "./MarkdownView";

function show(markdown: string) {
  return render(<MarkdownView markdown={markdown} />).container;
}

describe("MarkdownView", () => {
  it("formats headings, lists, code and GFM tables", () => {
    const view = show(
      "### Approach\n\n- one\n- two\n\n```\nseen = {}\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |",
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Approach" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(view.querySelector("pre code")).toHaveTextContent("seen = {}");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows raw HTML as text instead of running it", () => {
    const view = show('<script>alert(1)</script> <b onclick="x()">hi</b>');
    expect(view.querySelector("script")).toBeNull();
    expect(view.querySelector("b")).toBeNull();
  });

  it("opens links in a new tab and drops unsafe targets", () => {
    show("[docs](https://example.com) and [bad](javascript:alert(1))");
    const docs = screen.getByRole("link", { name: "docs" });
    expect(docs).toHaveAttribute("target", "_blank");
    expect(docs).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("bad").getAttribute("href") ?? "").not.toMatch(
      /javascript/i,
    );
  });

  it("turns an image into a link to it", () => {
    show("![diagram](https://example.com/d.png)");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "diagram" })).toHaveAttribute(
      "href",
      "https://example.com/d.png",
    );
  });
});
