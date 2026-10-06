export type EventBroadcastAudienceType = "confirmed";

export type EventBroadcastStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "failed"
  | "cancelled";

export type EventBroadcastSendMode = "now" | "scheduled";

export type EventBroadcastTemplateKey =
  | "race_day_reminder"
  | "weather_update"
  | "schedule_change"
  | "parking_info"
  | "general_update";

export const EVENT_BROADCAST_TEMPLATE_KEYS: EventBroadcastTemplateKey[] = [
  "race_day_reminder",
  "weather_update",
  "schedule_change",
  "parking_info",
  "general_update",
];

export type EventBroadcastTemplateStrings = {
  subject: string;
  preheader: string;
  title: string;
  bodyHtml: string;
};

export type EventBroadcastTemplateContext = {
  eventTitle: string;
  organizerName: string;
  eventDateLabel: string;
  eventLocation?: string | null;
};

function interpolate(
  template: string,
  ctx: EventBroadcastTemplateContext,
): string {
  return template
    .replace(/\{\{event_title\}\}/g, ctx.eventTitle)
    .replace(/\{\{organizer_name\}\}/g, ctx.organizerName)
    .replace(/\{\{event_date\}\}/g, ctx.eventDateLabel)
    .replace(/\{\{event_location\}\}/g, ctx.eventLocation ?? "");
}

const TEMPLATES_ES: Record<
  EventBroadcastTemplateKey,
  {
    subject: string;
    preheader: string;
    title: string;
    body: string;
  }
> = {
  race_day_reminder: {
    subject: "Recordatorio — {{event_title}}",
    preheader: "Todo lo que necesitas saber para el día del evento.",
    title: "¡Mañana es el gran día!",
    body: `<p>Hola {{{contact.first_name|atleta}}},</p>
<p><strong>{{organizer_name}}</strong> te recuerda que <strong>{{event_title}}</strong> está a la vuelta de la esquina.</p>
<ul>
<li><strong>Fecha:</strong> {{event_date}}</li>
<li><strong>Lugar:</strong> {{event_location}}</li>
</ul>
<p>Llega con tiempo, revisa tu equipo y disfruta la experiencia.</p>`,
  },
  weather_update: {
    subject: "Actualización del clima — {{event_title}}",
    preheader: "Condiciones esperadas y recomendaciones para tu carrera.",
    title: "Actualización del clima",
    body: `<p>Hola {{{contact.first_name|atleta}}},</p>
<p><strong>{{organizer_name}}</strong> comparte una actualización del clima para <strong>{{event_title}}</strong> el <strong>{{event_date}}</strong>.</p>
<p><em>Escribe aquí las condiciones esperadas, recomendaciones de vestimenta y cualquier cambio en el plan del evento.</em></p>`,
  },
  schedule_change: {
    subject: "Cambio de horario — {{event_title}}",
    preheader: "Revisa el nuevo horario del evento.",
    title: "Cambio de horario",
    body: `<p>Hola {{{contact.first_name|atleta}}},</p>
<p><strong>{{organizer_name}}</strong> informa un cambio de horario para <strong>{{event_title}}</strong>.</p>
<p><strong>Nuevo horario:</strong> <em>indica aquí la hora actualizada</em></p>
<p>Gracias por tu comprensión.</p>`,
  },
  parking_info: {
    subject: "Estacionamiento y acceso — {{event_title}}",
    preheader: "Indicaciones para llegar y estacionarte el día del evento.",
    title: "Estacionamiento y acceso",
    body: `<p>Hola {{{contact.first_name|atleta}}},</p>
<p><strong>{{organizer_name}}</strong> comparte indicaciones de acceso para <strong>{{event_title}}</strong> en <strong>{{event_location}}</strong>.</p>
<p><em>Agrega aquí mapas, puntos de encuentro, zonas de estacionamiento y horarios de apertura.</em></p>`,
  },
  general_update: {
    subject: "Actualización — {{event_title}}",
    preheader: "Novedades importantes de tu evento.",
    title: "Actualización del organizador",
    body: `<p>Hola {{{contact.first_name|atleta}}},</p>
<p><strong>{{organizer_name}}</strong> tiene novedades sobre <strong>{{event_title}}</strong>:</p>
<p><em>Escribe aquí tu mensaje para los inscritos confirmados.</em></p>`,
  },
};

const TEMPLATES_EN: Record<
  EventBroadcastTemplateKey,
  {
    subject: string;
    preheader: string;
    title: string;
    body: string;
  }
> = {
  race_day_reminder: {
    subject: "Reminder — {{event_title}}",
    preheader: "Everything you need for race day.",
    title: "Race day is almost here!",
    body: `<p>Hi {{{contact.first_name|athlete}}},</p>
<p><strong>{{organizer_name}}</strong> reminds you that <strong>{{event_title}}</strong> is coming up soon.</p>
<ul>
<li><strong>Date:</strong> {{event_date}}</li>
<li><strong>Location:</strong> {{event_location}}</li>
</ul>
<p>Arrive early, check your gear, and enjoy the experience.</p>`,
  },
  weather_update: {
    subject: "Weather update — {{event_title}}",
    preheader: "Expected conditions and recommendations for your race.",
    title: "Weather update",
    body: `<p>Hi {{{contact.first_name|athlete}}},</p>
<p><strong>{{organizer_name}}</strong> shares a weather update for <strong>{{event_title}}</strong> on <strong>{{event_date}}</strong>.</p>
<p><em>Add expected conditions, clothing tips, and any schedule adjustments here.</em></p>`,
  },
  schedule_change: {
    subject: "Schedule change — {{event_title}}",
    preheader: "Please review the updated event schedule.",
    title: "Schedule change",
    body: `<p>Hi {{{contact.first_name|athlete}}},</p>
<p><strong>{{organizer_name}}</strong> has a schedule update for <strong>{{event_title}}</strong>.</p>
<p><strong>New time:</strong> <em>add the updated start time here</em></p>
<p>Thank you for your understanding.</p>`,
  },
  parking_info: {
    subject: "Parking & access — {{event_title}}",
    preheader: "Directions for getting to the venue on event day.",
    title: "Parking & access",
    body: `<p>Hi {{{contact.first_name|athlete}}},</p>
<p><strong>{{organizer_name}}</strong> shares access details for <strong>{{event_title}}</strong> at <strong>{{event_location}}</strong>.</p>
<p><em>Add maps, meeting points, parking zones, and gate opening times here.</em></p>`,
  },
  general_update: {
    subject: "Update — {{event_title}}",
    preheader: "Important news about your event.",
    title: "Organizer update",
    body: `<p>Hi {{{contact.first_name|athlete}}},</p>
<p><strong>{{organizer_name}}</strong> has an update about <strong>{{event_title}}</strong>:</p>
<p><em>Write your message to confirmed registrants here.</em></p>`,
  },
};

export function buildEventBroadcastTemplate(
  key: EventBroadcastTemplateKey,
  locale: "es" | "en",
  ctx: EventBroadcastTemplateContext,
): EventBroadcastTemplateStrings {
  const src = locale === "en" ? TEMPLATES_EN[key] : TEMPLATES_ES[key];
  return {
    subject: interpolate(src.subject, ctx),
    preheader: interpolate(src.preheader, ctx),
    title: interpolate(src.title, ctx),
    bodyHtml: interpolate(src.body, ctx),
  };
}

export function segmentNameForEvent(
  eventId: number,
  audience: EventBroadcastAudienceType = "confirmed",
): string {
  return `atleita-event-${eventId}-${audience}`;
}
