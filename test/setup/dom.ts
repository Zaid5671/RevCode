// Setup for component tests (the `components` Vitest project, jsdom).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom (30.1) has an empty HTMLDialogElement: no showModal(), show() or close(). These
// stand-ins only open and close it. Focus containment, the inert page behind a modal and
// Escape come from the real browser, so tests fire the `cancel` event themselves.
Object.assign(HTMLDialogElement.prototype, {
  showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
  show(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
  close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  },
});

// jsdom has no layout, so no ResizeObserver. This stand-in reports a height of 0 once, so
// every note counts as short; a test of long notes stubs its own.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, contentRect: { height: 0 } } as ResizeObserverEntry],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no scrollIntoView; tests that care spy on this.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no matchMedia. Every query matches, so components render their wide-screen
// layout; a test of the phone layout stubs its own.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
