import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type WaiverAcceptanceCertificateInput = {
  locale: "en" | "es";
  athleteFullName: string;
  eventTitle: string;
  categoryName: string;
  registrationNumber: string;
  waiverTitle: string;
  waiverVersion: number;
  waiverPdfUrl?: string | null;
  acceptedAtIso: string;
  clientIp?: string | null;
  /** Organizer display name for disclaimer */
  organizerName?: string | null;
};

const ATLEITA = "Atleita";

/**
 * One-page stamped acceptance certificate (not a wet-ink overlay on the organizer PDF).
 * Proves the official responsiva was accepted during checkout; attaches to confirmation email.
 */
export async function buildWaiverAcceptanceCertificatePdf(
  input: WaiverAcceptanceCertificateInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const es = input.locale === "es";
  const margin = 56;
  let y = 740;

  const draw = (text: string, opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const size = opts?.size ?? 11;
    const f = opts?.bold ? fontBold : font;
    const color = opts?.color ?? rgb(0.12, 0.12, 0.14);
    const lines = wrapText(text, 86);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 6;
    }
  };

  draw(es ? "Comprobante de aceptación de responsiva" : "Waiver acceptance certificate", {
    bold: true,
    size: 16,
  });
  y -= 8;
  draw(
    es
      ? "Documento generado automáticamente al confirmar la inscripción."
      : "Automatically generated when registration was confirmed.",
    { size: 10, color: rgb(0.4, 0.4, 0.45) },
  );
  y -= 12;

  const rows: Array<[string, string]> = [
    [es ? "Evento" : "Event", input.eventTitle],
    [es ? "Categoría" : "Category", input.categoryName],
    [es ? "Folio" : "Registration #", input.registrationNumber],
    [es ? "Participante" : "Participant", input.athleteFullName],
    [es ? "Responsiva" : "Waiver", input.waiverTitle],
    [es ? "Versión" : "Version", String(input.waiverVersion)],
    [es ? "Aceptada el" : "Accepted at", input.acceptedAtIso],
  ];
  if (input.clientIp) {
    rows.push([es ? "IP" : "IP", input.clientIp]);
  }
  if (input.waiverPdfUrl) {
    rows.push([es ? "PDF oficial" : "Official PDF", input.waiverPdfUrl]);
  }

  for (const [label, value] of rows) {
    draw(`${label}:`, { bold: true, size: 10, color: rgb(0.35, 0.35, 0.4) });
    draw(value, { size: 11 });
    y -= 4;
  }

  y -= 16;
  page.drawRectangle({
    x: margin,
    y: Math.max(y - 90, 48),
    width: 612 - margin * 2,
    height: 100,
    borderColor: rgb(0.85, 0.55, 0.2),
    borderWidth: 1,
    color: rgb(0.98, 0.96, 0.92),
  });
  y -= 18;
  const organizer = input.organizerName?.trim() || (es ? "el organizador del evento" : "the event organizer");
  draw(es ? "Aviso importante / Disclaimer" : "Important notice / Disclaimer", {
    bold: true,
    size: 11,
  });
  draw(
    es
      ? `${ATLEITA} es únicamente la plataforma tecnológica de inscripción. ${ATLEITA} no organiza el evento, no asume responsabilidad civil, deportiva ni de seguridad por la competencia, y no es parte de la responsiva. Toda la responsabilidad corresponde a ${organizer}.`
      : `${ATLEITA} is only the registration technology platform. ${ATLEITA} does not organize the event, assumes no civil, sporting, or safety liability for the competition, and is not a party to the waiver. All responsibility rests with ${organizer}.`,
    { size: 9, color: rgb(0.25, 0.25, 0.28) },
  );

  return doc.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
