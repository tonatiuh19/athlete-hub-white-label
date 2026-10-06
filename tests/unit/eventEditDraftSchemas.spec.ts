/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  asDiscountDraft,
  asMediaItems,
  asRegistrationFields,
  asScheduleWaves,
  asSponsors,
  categorySchema,
  discountDraftSchema,
  mediaItemsSchema,
  registrationFieldsSchema,
  scheduleWavesSchema,
  sponsorsSchema,
  validateNewCategory,
  validateCategoryDraft,
} from "@/utils/eventEditDraftSchemas";

describe("eventEditDraftSchemas", () => {
  describe("registrationFieldsSchema", () => {
    it("accepts valid text fields", () => {
      const fields = asRegistrationFields([
        { label: "Shirt size", field_type: "text", is_required: false },
      ]);
      expect(fields).toHaveLength(1);
      expect(fields[0].label).toBe("Shirt size");
    });

    it("requires options for select fields", async () => {
      await expect(
        registrationFieldsSchema.validate([
          { label: "Size", field_type: "select", is_required: true, options: [] },
        ]),
      ).rejects.toBeTruthy();
    });

    it("rejects empty labels", async () => {
      await expect(
        registrationFieldsSchema.validate([
          { label: "  ", field_type: "text", is_required: false },
        ]),
      ).rejects.toBeTruthy();
    });

    it("accepts select with non-empty options", () => {
      expect(
        asRegistrationFields([
          {
            label: "Size",
            field_type: "select",
            is_required: true,
            options: ["S", "M"],
            category_ids: [1],
          },
        ]),
      ).toHaveLength(1);
    });
  });

  describe("scheduleWavesSchema", () => {
    it("requires name and starts_at", async () => {
      await expect(
        scheduleWavesSchema.validate([{ name: "", starts_at: "" }]),
      ).rejects.toBeTruthy();
    });

    it("allows null capacity and rejects negative", () => {
      expect(
        asScheduleWaves([
          { name: "Wave A", starts_at: "2026-08-01T07:00", capacity: null },
        ]),
      ).toHaveLength(1);
      expect(() =>
        asScheduleWaves([
          { name: "Wave A", starts_at: "2026-08-01T07:00", capacity: -1 },
        ]),
      ).toThrow();
    });
  });

  describe("discountDraftSchema", () => {
    it("normalizes code to uppercase and validates percent", () => {
      const draft = asDiscountDraft({
        code: "save10",
        discount_type: "percent",
        discount_value: 10,
        max_uses: 50,
      });
      expect(draft.code).toBe("SAVE10");
    });

    it("rejects percent outside 1-100", async () => {
      await expect(
        discountDraftSchema.validate({
          code: "X",
          discount_type: "percent",
          discount_value: 150,
        }),
      ).rejects.toBeTruthy();
    });

    it("requires positive amount for fixed_cents", () => {
      expect(
        asDiscountDraft({
          code: "FLAT",
          discount_type: "fixed_cents",
          discount_value: 500,
        }).discount_value,
      ).toBe(500);
      expect(() =>
        asDiscountDraft({
          code: "FLAT",
          discount_type: "fixed_cents",
          discount_value: 0,
        }),
      ).toThrow();
    });
  });

  describe("sponsorsSchema", () => {
    it("requires name and allows empty website", () => {
      expect(asSponsors([{ name: "Acme", tier: "gold" }])).toHaveLength(1);
      expect(
        asSponsors([{ name: "Acme", website_url: "" }])[0].website_url,
      ).toBe("");
    });

    it("rejects invalid website urls", async () => {
      await expect(
        sponsorsSchema.validate([{ name: "Acme", website_url: "not-a-url" }]),
      ).rejects.toBeTruthy();
    });

    it("accepts https website urls", () => {
      expect(
        asSponsors([{ name: "Acme", website_url: "https://acme.example" }]),
      ).toHaveLength(1);
    });
  });

  describe("mediaItemsSchema", () => {
    it("requires sort_order and allows empty url", () => {
      expect(
        asMediaItems([{ url: "", sort_order: 0, asset_type: "gallery" }]),
      ).toHaveLength(1);
      expect(() => mediaItemsSchema.validateSync([{ url: "https://x" }])).toThrow();
    });
  });

  describe("categorySchema", () => {
    it("requires name and non-negative price", async () => {
      await expect(
        categorySchema.validate({ name: "", price_cents: 0 }),
      ).rejects.toBeTruthy();
      expect(validateNewCategory({ name: "5K", price_cents: 10000 })).toEqual({});
      expect(validateNewCategory({ name: "", price_cents: 0 }).name).toBeTruthy();
      expect(
        validateCategoryDraft({ name: "  ", price_cents: 0 }).name,
      ).toBeTruthy();
    });
  });
});
