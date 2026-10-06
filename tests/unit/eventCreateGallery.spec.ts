import { describe, expect, it } from "vitest";
import {
  galleryItemsFromEvent,
  previewHeroAndMediaFromGallery,
} from "@/utils/eventCreateGallery";

describe("eventCreateGallery", () => {
  it("uses hero only for a single image", () => {
    const items = galleryItemsFromEvent("https://cdn.example/hero.jpg", []);
    expect(items).toHaveLength(1);
    expect(previewHeroAndMediaFromGallery(items)).toEqual({
      heroUrl: "https://cdn.example/hero.jpg",
      media: undefined,
    });
  });

  it("uses gallery media when multiple images are present", () => {
    const items = [
      { id: "1", previewUrl: "https://cdn.example/a.jpg", file: null },
      { id: "2", previewUrl: "https://cdn.example/b.jpg", file: null },
    ];
    const preview = previewHeroAndMediaFromGallery(items);
    expect(preview.heroUrl).toBeNull();
    expect(preview.media).toHaveLength(2);
    expect(preview.media?.[0].url).toBe("https://cdn.example/a.jpg");
  });

  it("prefers persisted gallery rows over hero alone", () => {
    const items = galleryItemsFromEvent("https://cdn.example/hero.jpg", [
      { asset_type: "gallery", url: "https://cdn.example/g1.jpg", sort_order: 0 },
      { asset_type: "gallery", url: "https://cdn.example/g2.jpg", sort_order: 1 },
    ]);
    expect(items).toHaveLength(2);
    expect(previewHeroAndMediaFromGallery(items).media).toHaveLength(2);
  });
});
