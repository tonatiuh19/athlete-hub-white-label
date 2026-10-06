/**
 * @vitest-environment jsdom
 */
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import FieldHelpTip from "@/components/ui/field-help-tip";
import FieldRow from "@/components/staff/event-edit/primitives/FieldRow";

function wrap(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>{ui}</TooltipProvider>
    </I18nextProvider>,
  );
}

describe("FieldHelpTip / FieldRow helpers", () => {
  it("renders a labeled help control for tip content", () => {
    wrap(<FieldHelpTip content="Capacity across categories" />);
    expect(
      screen.getByRole("button", { name: /more information|más información/i }),
    ).toBeTruthy();
  });

  it("puts FieldRow hints on a help icon, not under the input", () => {
    const { container } = wrap(
      <FieldRow id="max" label="Max registrations" hint="Leave empty for unlimited">
        <input id="max" />
      </FieldRow>,
    );
    expect(
      screen.getAllByRole("button", { name: /more information|más información/i })
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll("p").length).toBe(0);
  });

  it("still shows errors as visible text", () => {
    wrap(
      <FieldRow id="title" label="Title" error="Required">
        <input id="title" />
      </FieldRow>,
    );
    expect(screen.getByText("Required")).toBeTruthy();
  });
});
