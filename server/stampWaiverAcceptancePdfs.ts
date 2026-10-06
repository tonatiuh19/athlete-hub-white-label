import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { uploadFileBufferToCdn } from "./cdnUpload.js";
import { buildWaiverAcceptanceCertificatePdf } from "./waiverAcceptancePdf.js";
import type { WaiverSignatureInput } from "./eventWaivers.js";

type DbConn = Pool | PoolConnection;

/**
 * After signatures are stored: generate stamped acceptance PDFs, upload to CDN,
 * persist acceptance_pdf_url. Failures are logged but do not roll back registration.
 */
export async function stampRegistrationWaiverAcceptancePdfs(
  executor: DbConn,
  registrationId: number,
  opts: {
    locale: "en" | "es";
    athleteFullName: string;
    eventTitle: string;
    categoryName: string;
    registrationNumber: string;
    organizerName?: string | null;
    clientIp?: string | null;
  },
): Promise<Array<{ waiverId: number; url: string; filename: string; bytes: Uint8Array }>> {
  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT rws.waiver_id, rws.waiver_version_at_sign, rws.signed_at, rws.ip_address,
            ew.title AS waiver_title, ew.pdf_url, ew.version
     FROM registration_waiver_signatures rws
     JOIN event_waivers ew ON ew.id = rws.waiver_id
     WHERE rws.registration_id = ?
       AND (rws.signature_data IS NULL OR rws.signature_data NOT LIKE 'WAIVED_BY_STAFF%')`,
    [registrationId],
  );

  const out: Array<{ waiverId: number; url: string; filename: string; bytes: Uint8Array }> = [];
  const acceptedAtIso = new Date().toISOString();

  for (const row of rows) {
    try {
      const bytes = await buildWaiverAcceptanceCertificatePdf({
        locale: opts.locale,
        athleteFullName: opts.athleteFullName,
        eventTitle: opts.eventTitle,
        categoryName: opts.categoryName,
        registrationNumber: opts.registrationNumber,
        waiverTitle: String(row.waiver_title ?? "Waiver"),
        waiverVersion: Number(row.waiver_version_at_sign ?? row.version ?? 1),
        waiverPdfUrl: row.pdf_url ? String(row.pdf_url) : null,
        acceptedAtIso: row.signed_at
          ? new Date(row.signed_at as string).toISOString()
          : acceptedAtIso,
        clientIp: opts.clientIp ?? (row.ip_address ? String(row.ip_address) : null),
        organizerName: opts.organizerName,
      });

      const filename = `waiver-acceptance-${opts.registrationNumber}-${row.waiver_id}.pdf`;
      let url = `test://waiver-acceptance/${registrationId}/${row.waiver_id}.pdf`;
      if (process.env.VITEST !== "true" && process.env.ATLEITA_TEST_MODE !== "1") {
        const uploaded = await uploadFileBufferToCdn({
          buffer: Buffer.from(bytes),
          filename,
          mimeType: "application/pdf",
          uploadId: `waiver_accept_${registrationId}_${row.waiver_id}`,
          folder: "atleita",
        });
        url = uploaded.url;
      }

      await executor.query<ResultSetHeader>(
        `UPDATE registration_waiver_signatures
         SET acceptance_pdf_url = ?
         WHERE registration_id = ? AND waiver_id = ?`,
        [url.slice(0, 500), registrationId, row.waiver_id],
      );

      out.push({
        waiverId: Number(row.waiver_id),
        url,
        filename,
        bytes,
      });
    } catch (err) {
      console.error("[waiver:acceptance-pdf]", { registrationId, waiverId: row.waiver_id, err });
    }
  }

  return out;
}
