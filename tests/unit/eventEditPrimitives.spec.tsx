/**
 * @vitest-environment jsdom
 */
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  FieldGroup,
  FieldRow,
  SectionShell,
  ToggleRow,
} from "@/components/staff/event-edit/primitives";

function wrap(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>{ui}</TooltipProvider>
    </I18nextProvider>,
  );
}

describe("event-edit density primitives", () => {
  it("SectionShell renders compact title, visible hint, and children", () => {
    wrap(
      <SectionShell title="Identity" hint="Core event fields">
        <p>Body</p>
      </SectionShell>,
    );
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Core event fields")).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("FieldRow shows error as text and keeps hint on the help tip", () => {
    wrap(
      <FieldRow id="title" label="Title" error="Required" hint="Optional hint">
        <input id="title" />
      </FieldRow>,
    );
    expect(screen.getByText("Required")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /more information|más información/i })
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Optional hint")).toBeNull();
  });

  it("FieldGroup shows subsection hint as visible text", () => {
    wrap(
      <FieldGroup title="Location" hint="City first">
        <span>Geo</span>
      </FieldGroup>,
    );
    expect(screen.getByText("Location")).toBeTruthy();
    expect(screen.getByText("City first")).toBeTruthy();
    expect(screen.getByText("Geo")).toBeTruthy();
  });

  it("ToggleRow keeps description on a help tip", () => {
    wrap(
      <ToggleRow
        label="MSI"
        description="Interest-free"
        control={<input type="checkbox" aria-label="msi" />}
      />,
    );
    expect(screen.getByText("MSI")).toBeTruthy();
    expect(screen.getByLabelText("msi")).toBeTruthy();
    expect(screen.queryByText("Interest-free")).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /more information|más información/i })
        .length,
    ).toBeGreaterThanOrEqual(1);
  });
});
