import { uploadEventAssetToCdn } from "@/lib/cdn-upload";

export function createBlobPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeBlobUrl(url: string | null | undefined): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function revokeAllBlobUrls(urls: Iterable<string>): void {
  for (const url of urls) {
    revokeBlobUrl(url);
  }
}

/** Replace blob: URLs in rich HTML with CDN URLs on save. */
export async function uploadPendingHtmlImages(opts: {
  html: string;
  pendingByUrl: Map<string, File>;
  uploadId: string;
  isAdmin: boolean;
}): Promise<string> {
  let resolved = opts.html;
  let index = 0;
  for (const [blobUrl, file] of opts.pendingByUrl.entries()) {
    if (!resolved.includes(blobUrl)) continue;
    const cdnUrl = await uploadEventAssetToCdn(
      file,
      `${opts.uploadId}_img_${index++}`,
      opts.isAdmin,
      "image",
    );
    resolved = resolved.split(blobUrl).join(cdnUrl);
  }
  return resolved;
}
