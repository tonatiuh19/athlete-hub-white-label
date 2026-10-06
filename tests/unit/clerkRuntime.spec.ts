import { describe, expect, it } from "vitest";
import {
  CLERK_JS_CDN_URL,
  isClerkBypassCustomDomain,
  resolveClerkJsUrl,
} from "@/config/clerkRuntime";

describe("clerkRuntime", () => {
  it("defaults to jsDelivr CDN for clerk-js", () => {
    expect(resolveClerkJsUrl()).toBe(CLERK_JS_CDN_URL);
    expect(resolveClerkJsUrl()).toContain("clerk.browser.js");
  });

  it("bypasses custom clerk domain by default", () => {
    expect(isClerkBypassCustomDomain()).toBe(true);
  });
});
