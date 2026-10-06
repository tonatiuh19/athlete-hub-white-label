import type { EventMediaAsset, StaffMediaAssetRow } from "@shared/api";

export type EventCreateGalleryItem = {
  id: string;
  previewUrl: string;
  file: File | null;
  persistedUrl?: string;
};

function isGalleryAssetType(assetType?: string | null) {
  const t = assetType?.toLowerCase() ?? "";
  return t.includes("gallery") || t === "image";
}

export function galleryItemsFromEvent(
  heroUrl: string | null | undefined,
  media: StaffMediaAssetRow[],
): EventCreateGalleryItem[] {
  const gallery = media
    .filter((m) => isGalleryAssetType(m.asset_type))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (gallery.length > 0) {
    return gallery.map((m, i) => ({
      id: m.id != null ? `db-${m.id}` : `url-${i}-${m.url}`,
      previewUrl: m.url,
      file: null,
      persistedUrl: m.url,
    }));
  }

  if (heroUrl) {
    return [
      {
        id: "hero",
        previewUrl: heroUrl,
        file: null,
        persistedUrl: heroUrl,
      },
    ];
  }

  return [];
}

/** Preview: 1 photo = cover; 2+ = carousel gallery (matches athlete EventDetailHeroGallery). */
export function previewHeroAndMediaFromGallery(items: EventCreateGalleryItem[]): {
  heroUrl: string | null;
  media?: EventMediaAsset[];
} {
  if (items.length === 0) {
    return { heroUrl: null, media: undefined };
  }
  if (items.length === 1) {
    return { heroUrl: items[0].previewUrl, media: undefined };
  }
  return {
    heroUrl: null,
    media: items.map((item, sort_order) => ({
      asset_type: "gallery",
      url: item.previewUrl,
      sort_order,
    })),
  };
}

export function stripGalleryMedia(media: StaffMediaAssetRow[]) {
  return media.filter((m) => !isGalleryAssetType(m.asset_type));
}

export function buildGalleryMediaPayload(urls: string[]): StaffMediaAssetRow[] {
  return urls.map((url, sort_order) => ({
    asset_type: "gallery",
    url,
    sort_order,
  }));
}
