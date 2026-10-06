/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSpaLocationGuard } from "@/hooks/use-spa-location-guard";

const navigate = vi.fn();

let pathname = "/staff/events/1/edit";
let search = "?tab=details";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname, search, hash: "" }),
  useNavigate: () => navigate,
}));

describe("useSpaLocationGuard", () => {
  beforeEach(() => {
    navigate.mockClear();
    pathname = "/staff/events/1/edit";
    search = "?tab=details";
  });

  it("tracks location changes when clean", () => {
    const requestNavigation = vi.fn();
    const allowNavigationRef = { current: false };

    const { rerender } = renderHook(
      ({ dirty }) => useSpaLocationGuard(dirty, requestNavigation, allowNavigationRef),
      { initialProps: { dirty: false } },
    );

    search = "?tab=media";
    rerender({ dirty: false });

    expect(navigate).not.toHaveBeenCalled();
    expect(requestNavigation).not.toHaveBeenCalled();
  });

  it("reverts unexpected navigation and prompts when dirty", () => {
    const requestNavigation = vi.fn();
    const allowNavigationRef = { current: false };

    const { rerender } = renderHook(
      ({ dirty }) => useSpaLocationGuard(dirty, requestNavigation, allowNavigationRef),
      { initialProps: { dirty: true } },
    );

    search = "?tab=sponsors";
    act(() => {
      rerender({ dirty: true });
    });

    expect(navigate).toHaveBeenCalledWith("/staff/events/1/edit?tab=details", {
      replace: true,
    });
    expect(requestNavigation).toHaveBeenCalledOnce();
    expect(requestNavigation.mock.calls[0]?.[1]).toBe("switchTab");
  });

  it("allows navigation when allowNavigationRef is set", () => {
    const requestNavigation = vi.fn();
    const allowNavigationRef = { current: false };

    const { rerender } = renderHook(
      ({ dirty }) => useSpaLocationGuard(dirty, requestNavigation, allowNavigationRef),
      { initialProps: { dirty: false } },
    );

    allowNavigationRef.current = true;
    search = "?tab=media";
    act(() => {
      rerender({ dirty: true });
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(requestNavigation).not.toHaveBeenCalled();
    expect(allowNavigationRef.current).toBe(false);
  });
});
