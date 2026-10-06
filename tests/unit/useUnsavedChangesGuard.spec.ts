/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

describe("useUnsavedChangesGuard", () => {
  it("runs navigation immediately when clean", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(false));
    const action = vi.fn();
    act(() => {
      result.current.requestNavigation(action);
    });
    expect(action).toHaveBeenCalledOnce();
    expect(result.current.dialogOpen).toBe(false);
  });

  it("opens dialog instead of navigating when dirty", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const action = vi.fn();
    act(() => {
      result.current.requestNavigation(action);
    });
    expect(action).not.toHaveBeenCalled();
    expect(result.current.dialogOpen).toBe(true);
  });

  it("opens dialog with switchTab intent", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    act(() => {
      result.current.requestNavigation(() => {}, "switchTab");
    });
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.discardIntent).toBe("switchTab");
  });

  it("runs pending navigation after confirmDiscard", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const action = vi.fn();
    act(() => {
      result.current.requestNavigation(action);
      result.current.confirmDiscard();
    });
    expect(action).toHaveBeenCalledOnce();
    expect(result.current.dialogOpen).toBe(false);
  });

  it("drops pending navigation on cancelDiscard", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const action = vi.fn();
    act(() => {
      result.current.requestNavigation(action);
      result.current.cancelDiscard();
    });
    expect(action).not.toHaveBeenCalled();
    expect(result.current.dialogOpen).toBe(false);
  });
});
