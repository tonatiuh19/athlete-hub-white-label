import { describe, expect, it } from "vitest";
import {
  canAccessEventConsoleSection,
  defaultEventConsolePath,
  eventConsoleOpsPath,
  eventConsolePaymentsPath,
  getVisibleEventConsoleNav,
  getVisibleEventConsoleTree,
  isEventConsoleBranchActive,
  isEventConsoleNavActive,
  isStaffEventConsolePath,
} from "@/utils/eventConsoleNav";

describe("eventConsoleNav", () => {
  it("detects event console paths and excludes onboarding", () => {
    expect(isStaffEventConsolePath("/staff/events/12")).toBe(true);
    expect(isStaffEventConsolePath("/staff/events/12/edit")).toBe(true);
    expect(isStaffEventConsolePath("/staff/events/12/ops")).toBe(true);
    expect(isStaffEventConsolePath("/staff/events/12/onboarding")).toBe(false);
    expect(isStaffEventConsolePath("/staff/events")).toBe(false);
    expect(isStaffEventConsolePath("/staff/events/new")).toBe(false);
  });

  it("defaults draft to edit and published to ops for editors", () => {
    expect(
      defaultEventConsolePath({
        status: "draft",
        isAdmin: false,
        organizerRole: "owner",
      }),
    ).toBe("edit");
    expect(
      defaultEventConsolePath({
        status: "pending_approval",
        isAdmin: false,
        organizerRole: "organizer",
      }),
    ).toBe("edit");
    expect(
      defaultEventConsolePath({
        status: "published",
        isAdmin: false,
        organizerRole: "owner",
      }),
    ).toBe("ops");
  });

  it("maps legacy hub ?tab= onto ops / insights", () => {
    expect(
      defaultEventConsolePath({
        status: "published",
        isAdmin: false,
        organizerRole: "owner",
        legacyTab: "waitlist",
      }),
    ).toBe("ops?tab=waitlist");
    expect(
      defaultEventConsolePath({
        status: "draft",
        isAdmin: true,
        legacyTab: "sponsor-analytics",
      }),
    ).toBe("insights");
  });

  it("falls back when role cannot edit or ops", () => {
    expect(
      defaultEventConsolePath({
        status: "draft",
        isAdmin: false,
        organizerRole: "seller",
      }),
    ).toBe("overview");
    expect(
      defaultEventConsolePath({
        status: "published",
        isAdmin: false,
        organizerRole: "timing",
      }),
    ).toBe("ops");
  });

  it("hides finance-only and editor-only branches by role", () => {
    const seller = getVisibleEventConsoleNav({
      isAdmin: false,
      organizerRole: "seller",
    }).map((i) => i.id);
    expect(seller).toContain("overview");
    expect(seller).not.toContain("edit");
    expect(seller).not.toContain("ops");
    expect(seller).toContain("cobros");

    const timing = getVisibleEventConsoleNav({
      isAdmin: false,
      organizerRole: "timing",
    }).map((i) => i.id);
    expect(timing).toContain("ops");
    expect(timing).toContain("results");
    expect(timing).not.toContain("edit");
    expect(timing).not.toContain("cobros");

    const operations = getVisibleEventConsoleNav({
      isAdmin: false,
      organizerRole: "operations",
    }).map((i) => i.id);
    expect(operations).toContain("cobros");
    expect(operations).toContain("ops");

    const marketing = getVisibleEventConsoleNav({
      isAdmin: false,
      organizerRole: "marketing",
    }).map((i) => i.id);
    expect(marketing).toContain("comunicacion");
  });

  it("exposes edit / tickets / ops as parents with nested children", () => {
    const tree = getVisibleEventConsoleTree({ isAdmin: true });
    const edit = tree.find((n) => n.id === "edit")!;
    const tickets = tree.find((n) => n.id === "tickets")!;
    const ops = tree.find((n) => n.id === "ops")!;
    expect(edit.children?.map((c) => c.id)).toEqual([
      "details",
      "location",
      "checkin",
      "registration",
      "description",
      "images",
      "media",
      "course",
      "waiver",
      "sponsors",
      "policies",
    ]);
    expect(tickets.children?.map((c) => c.id)).toEqual([
      "categories",
      "discounts",
      "folios",
      "fields",
      "waves",
      "extras",
      "waitlist-setup",
    ]);
    expect(ops.children?.map((c) => c.id)).toEqual([
      "ops-registrations",
      "ops-waitlist",
      "ops-checkin",
    ]);
  });

  it("gates route sections the same way as nav", () => {
    expect(
      canAccessEventConsoleSection("edit", {
        isAdmin: false,
        organizerRole: "seller",
      }),
    ).toBe(false);
    expect(
      canAccessEventConsoleSection("ops", {
        isAdmin: false,
        organizerRole: "timing",
      }),
    ).toBe(true);
    expect(
      canAccessEventConsoleSection("insights", {
        isAdmin: false,
        organizerRole: "marketing",
      }),
    ).toBe(true);
    expect(
      canAccessEventConsoleSection("comunicacion", {
        isAdmin: false,
        organizerRole: "operations",
      }),
    ).toBe(true);
    expect(
      canAccessEventConsoleSection("comunicacion", {
        isAdmin: false,
        organizerRole: "seller",
      }),
    ).toBe(false);
  });

  it("builds ops and payments deep links", () => {
    expect(eventConsoleOpsPath(9)).toBe("/staff/events/9/ops");
    expect(eventConsoleOpsPath(9, "registrations")).toBe(
      "/staff/events/9/ops",
    );
    expect(eventConsoleOpsPath(9, "waitlist")).toBe(
      "/staff/events/9/ops?tab=waitlist",
    );
    expect(eventConsolePaymentsPath(9)).toBe("/staff/payments?eventId=9");
  });

  it("marks edit parent vs tab-specific nav active correctly", () => {
    const tree = getVisibleEventConsoleTree({ isAdmin: true });
    const editItem = tree.find((i) => i.id === "edit")!;
    const tickets = tree.find((i) => i.id === "tickets")!;
    const categories = tickets.children!.find((i) => i.id === "categories")!;
    const ops = tree.find((i) => i.id === "ops")!;
    const opsWaitlist = ops.children!.find((i) => i.id === "ops-waitlist")!;
    const opsRegs = ops.children!.find((i) => i.id === "ops-registrations")!;

    expect(
      isEventConsoleNavActive(editItem, "/staff/events/9/edit", ""),
    ).toBe(true);
    expect(
      isEventConsoleNavActive(
        editItem,
        "/staff/events/9/edit",
        "?tab=categories",
      ),
    ).toBe(false);
    expect(
      isEventConsoleBranchActive(
        editItem,
        "/staff/events/9/edit",
        "?tab=categories",
      ),
    ).toBe(false);
    expect(
      isEventConsoleBranchActive(
        tickets,
        "/staff/events/9/edit",
        "?tab=categories",
      ),
    ).toBe(true);
    expect(
      isEventConsoleNavActive(
        categories,
        "/staff/events/9/edit",
        "?tab=categories",
      ),
    ).toBe(true);
    expect(
      isEventConsoleNavActive(
        opsWaitlist,
        "/staff/events/9/ops",
        "?tab=waitlist",
      ),
    ).toBe(true);
    expect(
      isEventConsoleBranchActive(ops, "/staff/events/9/ops", "?tab=waitlist"),
    ).toBe(true);
    expect(
      isEventConsoleNavActive(opsRegs, "/staff/events/9/ops", ""),
    ).toBe(true);
  });

  it("includes media, waiver, waitlist setup in editor nav", () => {
    const ids = getVisibleEventConsoleNav({ isAdmin: true }).map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "details",
        "location",
        "images",
        "media",
        "waiver",
        "waitlist-setup",
        "sponsors",
        "policies",
        "ops-checkin",
      ]),
    );
  });
});
