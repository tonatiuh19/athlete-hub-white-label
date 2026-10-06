/**
 * Disrupting Labs CDN uploads (enteratelo-php).
 * Images → uploadImages.php; PDFs/docs → uploadFiles.php (X-Api-Key).
 * Public file URLs must use the /data/api prefix (see enteratelo-php + real-state / optimum-credit).
 */

import { normalizeCdnUploadUrl as normalizeCdnUploadUrlShared } from "../shared/cdnUrl.js";

const CDN_IMAGES_UPLOAD_URL =
  "https://disruptinglabs.com/data/api/uploadImages.php";

const CDN_FILES_UPLOAD_URL =
  process.env.CDN_UPLOAD_URL?.trim() ||
  "https://disruptinglabs.com/data/api/uploadFiles.php";

/** Base for uploaded files served from PHP data directory (not SPA static assets). */
export const CDN_UPLOAD_PUBLIC_BASE = "https://disruptinglabs.com/data/api";

const ATLEITA_CDN_FOLDER = "atleita";

export function buildCdnPublicUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) {
    return normalizeCdnUploadUrl(relativePath);
  }
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${CDN_UPLOAD_PUBLIC_BASE}${path}`;
}

/**
 * Fix legacy URLs that omitted /data/api (Apache returned SPA HTML → broken <img>).
 * Static marketing assets (e.g. atleita/assets) are left unchanged.
 */
export function normalizeCdnUploadUrl(url: string): string;
export function normalizeCdnUploadUrl(url: string | null | undefined): string | null;
export function normalizeCdnUploadUrl(url: string | null | undefined): string | null {
  return normalizeCdnUploadUrlShared(url);
}

function safeUploadId(uploadId: string): string {
  return uploadId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || "temp";
}

/** Image uploads → uploadImages.php (PNG/JPG/etc.). */
export async function uploadImageBufferToCdn(opts: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  uploadId: string;
  folder?: string;
}): Promise<{ url: string; path: string; filename: string }> {
  const folder = opts.folder ?? ATLEITA_CDN_FOLDER;
  const safeId = safeUploadId(opts.uploadId);

  const form = new FormData();
  form.append("main_folder", folder);
  form.append("id", safeId);
  form.append(
    "main_image",
    new Blob([new Uint8Array(opts.buffer)], { type: opts.mimeType }),
    opts.filename,
  );

  const res = await fetch(CDN_IMAGES_UPLOAD_URL, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`CDN upload failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    main_image?: { path?: string; filename?: string };
    error?: string;
    errors?: Array<{ error?: string }>;
  };

  if (!data.success || !data.main_image?.path) {
    const detail =
      data.error ||
      data.errors?.[0]?.error ||
      "CDN returned no image path";
    throw new Error(detail);
  }

  return {
    path: data.main_image.path,
    filename: data.main_image.filename ?? opts.filename,
    url: buildCdnPublicUrl(data.main_image.path),
  };
}

/**
 * PDF / mixed file uploads → uploadFiles.php (requires CDN_UPLOAD_SECRET).
 * Same contract as optimum-credit.
 */
export async function uploadFileBufferToCdn(opts: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  uploadId: string;
  folder?: string;
}): Promise<{ url: string; path: string; filename: string }> {
  const secret = process.env.CDN_UPLOAD_SECRET?.trim() || "";
  if (!secret && process.env.VITEST !== "true" && process.env.ATLEITA_TEST_MODE !== "1") {
    throw new Error("CDN_UPLOAD_SECRET is not configured");
  }

  const folder = opts.folder ?? ATLEITA_CDN_FOLDER;
  const safeId = safeUploadId(opts.uploadId);

  if (process.env.VITEST === "true" || process.env.ATLEITA_TEST_MODE === "1") {
    const path = `/data/${folder}/${safeId}/files/${opts.filename}`;
    return {
      path,
      filename: opts.filename,
      url: buildCdnPublicUrl(path),
    };
  }

  const form = new FormData();
  form.append("main_folder", folder);
  form.append("id", safeId);
  form.append(
    "files[]",
    new Blob([new Uint8Array(opts.buffer)], { type: opts.mimeType }),
    opts.filename,
  );

  const res = await fetch(CDN_FILES_UPLOAD_URL, {
    method: "POST",
    headers: { "X-Api-Key": secret },
    body: form,
  });

  if (!res.ok) {
    const bodySnippet = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(
      `CDN file upload failed: HTTP ${res.status}${bodySnippet ? ` — ${bodySnippet}` : ""}`,
    );
  }

  const data = (await res.json()) as {
    success?: boolean;
    uploaded?: Array<{ path?: string; url?: string; filename?: string }>;
    error?: string;
    errors?: Array<{ error?: string; file?: string }>;
  };

  const uploaded = data.uploaded?.[0];
  if (!data.success || !uploaded?.path) {
    const detail =
      data.error ||
      data.errors?.[0]?.error ||
      "CDN returned no file path";
    throw new Error(detail);
  }

  const url =
    uploaded.url && uploaded.url.startsWith("http")
      ? normalizeCdnUploadUrl(uploaded.url) ?? uploaded.url
      : buildCdnPublicUrl(uploaded.path);

  return {
    path: uploaded.path,
    filename: uploaded.filename ?? opts.filename,
    url,
  };
}
