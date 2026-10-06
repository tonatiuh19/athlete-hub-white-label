/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import StaffMemberEventAccessFields, {
  memberRoleSupportsEventScope,
} from "@/components/staff/StaffMemberEventAccessFields";

describe("StaffMemberEventAccessFields", () => {
  it("treats seller as event-scopable and organizer as org-wide", () => {
    expect(memberRoleSupportsEventScope("seller")).toBe(true);
    expect(memberRoleSupportsEventScope("operations")).toBe(true);
    expect(memberRoleSupportsEventScope("organizer")).toBe(false);
    expect(memberRoleSupportsEventScope("owner")).toBe(false);
  });

  it("shows event checkboxes when scope is events", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <StaffMemberEventAccessFields
          role="seller"
          scope="events"
          eventIds={[100]}
          events={[
            { id: 100, title: "Race A" },
            { id: 101, title: "Race B" },
          ]}
          onScopeChange={vi.fn()}
          onEventIdsChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByText("Race A")).toBeTruthy();
    expect(screen.getByText("Race B")).toBeTruthy();
  });
});
