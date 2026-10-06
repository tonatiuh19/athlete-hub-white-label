/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  EventConsoleNavigationGuardProvider,
  useRegisterEventConsoleNavigationGuard,
} from "@/components/staff/event-console/EventConsoleNavigationGuardContext";
import { useGuardedConsoleNavClick } from "@/hooks/use-guarded-console-nav-click";

import type { DiscardIntent } from "@/hooks/use-unsaved-changes-guard";

function EditPage({
  requestNavigation,
}: {
  requestNavigation: (action: () => void, intent?: DiscardIntent) => void;
}) {
  useRegisterEventConsoleNavigationGuard(true, requestNavigation);
  const guardedNavClick = useGuardedConsoleNavClick();

  return (
    <a href="/staff/events/1/edit" onClick={guardedNavClick("/staff/events/1/edit")}>
      overview
    </a>
  );
}

describe("useGuardedConsoleNavClick", () => {
  it("guards edit overview navigation when only the query changes", () => {
    const requestNavigation = vi.fn((action: () => void, _intent?: DiscardIntent) => {
      action();
    });

    render(
      <MemoryRouter initialEntries={["/staff/events/1/edit?tab=details"]}>
        <EventConsoleNavigationGuardProvider>
          <Routes>
            <Route
              path="/staff/events/:eventId/edit"
              element={<EditPage requestNavigation={requestNavigation} />}
            />
          </Routes>
        </EventConsoleNavigationGuardProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("overview"));

    expect(requestNavigation).toHaveBeenCalledOnce();
    expect(requestNavigation.mock.calls[0]?.[1]).toBe("switchTab");
  });
});
