import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { readEventPreviewSchemeFromDocument } from "@shared/themePreference";
import { EventPreviewColorSchemeRoot } from "@/components/staff/event-create/EventPreviewColorScheme";

describe("EventPreviewColorSchemeRoot", () => {
  it("scopes light preview without dark class", () => {
    const { container } = render(
      <EventPreviewColorSchemeRoot scheme="light">
        <span>Preview</span>
      </EventPreviewColorSchemeRoot>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-preview-theme")).toBe("light");
    expect(root.classList.contains("dark")).toBe(false);
  });

  it("scopes dark preview with dark class and data attribute", () => {
    const { container } = render(
      <EventPreviewColorSchemeRoot scheme="dark">
        <span>Preview</span>
      </EventPreviewColorSchemeRoot>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-preview-theme")).toBe("dark");
    expect(root.classList.contains("dark")).toBe(true);
  });

  it("always returns light (Atleita has no dark mode)", () => {
    document.documentElement.classList.add("dark");
    expect(readEventPreviewSchemeFromDocument()).toBe("light");
    document.documentElement.classList.remove("dark");
    expect(readEventPreviewSchemeFromDocument()).toBe("light");
  });
});
