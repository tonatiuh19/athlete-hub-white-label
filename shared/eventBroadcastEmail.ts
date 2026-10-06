/**
 * Atleita-branded broadcast email shell — mirrors transactional templates in api/index.ts.
 * Used for organizer preview and Resend broadcast HTML.
 */

export const EVENT_BROADCAST_EMAIL_BRAND = {
  black: "#18231F",
  bgDark: "#0F1613",
  surfaceDark: "#1A2E26",
  orange: "#D7ED70",
  red: "#214B3A",
  textPrimary: "#FFFFFF",
  textMuted: "#A8B5AF",
  textDim: "#7A8A83",
  border: "#2A3D35",
  fontFamily:
    "'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

const UNSUBSCRIBE_PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailLogoBlock(height = 36): string {
  const fontSize = Math.max(18, Math.round(height * 0.72));
  const brand = EVENT_BROADCAST_EMAIL_BRAND;
  return `<span style="display:inline-block;font-size:${fontSize}px;font-weight:800;letter-spacing:-0.02em;color:${brand.textPrimary};line-height:1;">atleita<span style="color:${brand.orange};">.</span></span>`;
}

export type EventBroadcastEmailStrings = {
  footer: {
    tagline: string;
    help: string;
    copyright: string;
    unsubscribe: string;
    organizerVia: string;
  };
};

const STRINGS_ES: EventBroadcastEmailStrings = {
  footer: {
    tagline: "Atleita — plataforma para eventos deportivos",
    help:
      "Este correo fue enviado por tu organizador a través de Atleita. Para dudas sobre el evento, contacta directamente al organizador.",
    copyright: "© {{year}} Atleita. Todos los derechos reservados.",
    unsubscribe: "Cancelar suscripción a actualizaciones de eventos",
    organizerVia: "Mensaje de {{organizer_name}} vía Atleita",
  },
};

const STRINGS_EN: EventBroadcastEmailStrings = {
  footer: {
    tagline: "Atleita — platform for sports events",
    help:
      "This email was sent by your organizer through Atleita. For event questions, contact the organizer directly.",
    copyright: "© {{year}} Atleita. All rights reserved.",
    unsubscribe: "Unsubscribe from event updates",
    organizerVia: "Message from {{organizer_name}} via Atleita",
  },
};

function strings(locale: "es" | "en"): EventBroadcastEmailStrings {
  return locale === "en" ? STRINGS_EN : STRINGS_ES;
}

export type BuildEventBroadcastEmailInput = {
  locale: "es" | "en";
  preheader: string;
  title: string;
  /** Inner HTML from the rich editor (may include Resend merge tags). */
  bodyHtml: string;
  organizerName: string;
  appUrl: string;
  /** When true, replace merge tags with sample values for UI preview. */
  previewMode?: boolean;
};

export function buildEventBroadcastEmail(
  input: BuildEventBroadcastEmailInput,
): string {
  const {
    locale,
    preheader,
    title,
    bodyHtml,
    organizerName,
    appUrl,
    previewMode = false,
  } = input;
  const s = strings(locale);
  const year = new Date().getFullYear();
  const brand = EVENT_BROADCAST_EMAIL_BRAND;

  let content = bodyHtml;
  if (previewMode) {
    content = content
      .replace(/\{\{\{contact\.first_name\|[^}]+\}\}\}/g, locale === "en" ? "Alex" : "María")
      .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#");
  }

  const organizerLine = s.footer.organizerVia.replace(
    "{{organizer_name}}",
    escapeHtml(organizerName),
  );
  const copyright = s.footer.copyright.replace("{{year}}", String(year));

  const unsubscribeHtml = previewMode
    ? `<p style="margin:16px 0 0;font-size:12px;color:${brand.textDim};"><span style="color:${brand.textMuted};">${escapeHtml(s.footer.unsubscribe)}</span></p>`
    : `<p style="margin:16px 0 0;font-size:12px;color:${brand.textDim};"><a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:${brand.orange};text-decoration:underline;">${escapeHtml(s.footer.unsubscribe)}</a></p>`;

  return `<!DOCTYPE html>
<html lang="${locale === "es" ? "es-MX" : "en"}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    body, table, td { margin: 0; padding: 0; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content, .email-header, .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${brand.bgDark};font-family:${brand.fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.bgDark}">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px;">
        <table role="presentation" class="email-container" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.surfaceDark}" style="width:560px;max-width:560px;border-radius:16px;border:1px solid ${brand.border};">
          <tr>
            <td class="email-header" bgcolor="${brand.black}" style="padding:28px 32px 20px;border-bottom:2px solid ${brand.orange};">
              ${emailLogoBlock()}
              <p style="margin:12px 0 0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${brand.orange};">${organizerLine}</p>
              <h1 style="margin:12px 0 0;font-size:24px;font-weight:800;color:${brand.textPrimary};line-height:1.3;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:28px 32px;color:${brand.textPrimary};font-size:16px;line-height:1.65;">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="email-footer" bgcolor="${brand.black}" style="padding:24px 32px 28px;border-top:1px solid ${brand.border};">
              <p style="margin:0 0 8px;font-size:13px;color:${brand.orange};font-weight:600;">${escapeHtml(s.footer.tagline)}</p>
              <p style="margin:0 0 16px;font-size:12px;color:${brand.textDim};line-height:1.5;">${escapeHtml(s.footer.help)}</p>
              ${unsubscribeHtml}
              <p style="margin:12px 0 0;font-size:11px;color:${brand.textMuted};">${escapeHtml(copyright)}</p>
              <p style="margin:12px 0 0;font-size:11px;"><a href="${escapeHtml(appUrl)}" style="color:${brand.orange};text-decoration:none;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Extract no-reply address from Atleita FROM string e.g. `Atleita <no-reply@...>`. */
export function extractFromEmailAddress(fromEmail: string): string {
  const match = fromEmail.match(/<([^>]+)>/);
  return match?.[1]?.trim() || fromEmail.trim();
}

export function buildOrganizerBroadcastFrom(
  organizerName: string,
  fromEmail: string,
): string {
  const address = extractFromEmailAddress(fromEmail);
  const safeName = organizerName.replace(/"/g, "'").trim() || "Organizer";
  return `${safeName} via Atleita <${address}>`;
}
