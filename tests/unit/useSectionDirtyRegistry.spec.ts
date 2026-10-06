/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSectionDirtyRegistry } from "@/hooks/use-section-dirty-registry";

describe("useSectionDirtyRegistry", () => {
  it("aggregates section dirty flags", () => {
    const { result } = renderHook(() => useSectionDirtyRegistry());
    expect(result.current.anySectionDirty).toBe(false);

    act(() => {
      result.current.setSectionDirty("sponsors", true);
    });
    expect(result.current.anySectionDirty).toBe(true);

    act(() => {
      result.current.setSectionDirty("sponsors", false);
    });
    expect(result.current.anySectionDirty).toBe(false);
  });

  it("tracks multiple sections independently", () => {
    const { result } = renderHook(() => useSectionDirtyRegistry());
    act(() => {
      result.current.setSectionDirty("fields", true);
      result.current.setSectionDirty("waves", true);
    });
    expect(result.current.anySectionDirty).toBe(true);

    act(() => {
      result.current.setSectionDirty("fields", false);
    });
    expect(result.current.anySectionDirty).toBe(true);

    act(() => {
      result.current.setSectionDirty("waves", false);
    });
    expect(result.current.anySectionDirty).toBe(false);
  });

  it("clears all section dirty flags", () => {
    const { result } = renderHook(() => useSectionDirtyRegistry());
    act(() => {
      result.current.setSectionDirty("fields", true);
      result.current.setSectionDirty("waves", true);
    });
    expect(result.current.anySectionDirty).toBe(true);

    act(() => {
      result.current.clearAllSectionDirty();
    });
    expect(result.current.anySectionDirty).toBe(false);
  });
});
