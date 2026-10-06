/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("isStaffSimulationsEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is false when unset", async () => {
    vi.stubEnv("VITE_STAFF_SIMULATIONS_ENABLED", undefined);
    const { isStaffSimulationsEnabled } = await import(
      "@/utils/staffFeatureFlags"
    );
    expect(isStaffSimulationsEnabled()).toBe(false);
  });

  it("is true for true and 1", async () => {
    vi.stubEnv("VITE_STAFF_SIMULATIONS_ENABLED", "true");
    vi.resetModules();
    let mod = await import("@/utils/staffFeatureFlags");
    expect(mod.isStaffSimulationsEnabled()).toBe(true);

    vi.stubEnv("VITE_STAFF_SIMULATIONS_ENABLED", "1");
    vi.resetModules();
    mod = await import("@/utils/staffFeatureFlags");
    expect(mod.isStaffSimulationsEnabled()).toBe(true);
  });

  it("is false for other values", async () => {
    vi.stubEnv("VITE_STAFF_SIMULATIONS_ENABLED", "false");
    vi.resetModules();
    const { isStaffSimulationsEnabled } = await import(
      "@/utils/staffFeatureFlags"
    );
    expect(isStaffSimulationsEnabled()).toBe(false);
  });
});
