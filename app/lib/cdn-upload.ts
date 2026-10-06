import api from "@/lib/api";
import type { CdnUploadResponse } from "@shared/api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Upload event asset (hero, sponsor logo, media, PDF, GPX) via server proxy */
export async function uploadEventAssetToCdn(
  file: File,
  uploadId: string,
  isAdmin: boolean,
  assetKind: "image" | "document" | "gpx" | "sponsor" | "hero" | "media" = "image",
): Promise<string> {
  const dataBase64 = await fileToBase64(file);
  const endpoint = isAdmin
    ? "/admin/events/upload-asset"
    : "/organizer/events/upload-asset";

  const { data } = await api.post<CdnUploadResponse>(endpoint, {
    dataBase64,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    uploadId,
    assetKind,
  });

  return data.url;
}
