import type {
  Express,
  Request,
  RequestHandler,
  Response,
} from "express";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { TransferRequest } from "../shared/api.js";

type ActorType = "athlete" | "organizer" | "admin";

interface Phase2Auth {
  actor: ActorType;
  id: number;
  email: string;
  organizerId?: number;
  jti: string;
}

interface AuthedRequest extends Request {
  auth?: Phase2Auth;
}

export interface Phase2Deps {
  pool: Pool;
  requireAthlete: RequestHandler;
  requireOrganizer: RequestHandler;
  requireAdmin: RequestHandler;
  newPublicUuid: () => string;
  sendEmail: (opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) => Promise<{ id: string }>;
  appUrl: string;
}

/**
 * Remaining Phase-2 athlete ops after Triboo communities/gamification purge.
 * Teams, XP, and public communities were removed from Atleita white-label.
 */
export function registerPhase2Routes(app: Express, deps: Phase2Deps): void {
  const { pool, requireAthlete, requireOrganizer, sendEmail, appUrl } = deps;

  // Deprecated — use event broadcasts.
  app.post(
    "/api/organizer/events/:eventId/messages/bulk",
    requireOrganizer,
    async (_req: AuthedRequest, res: Response) => {
      return res.status(410).json({
        error:
          "Bulk messaging queue is deprecated. Use POST /api/organizer/events/:eventId/broadcasts instead.",
      });
    },
  );

  app.post(
    "/api/athlete/registrations/:registrationId/transfer",
    requireAthlete,
    async (req: AuthedRequest, res: Response) => {
      const athleteId = req.auth!.id;
      const registrationId = Number(req.params.registrationId);
      if (!Number.isFinite(registrationId)) {
        return res.status(400).json({ error: "Invalid registration id" });
      }

      const transferBody = (req.body ?? {}) as TransferRequest;
      const recipientEmail = String(transferBody.recipientEmail ?? "")
        .trim()
        .toLowerCase();
      if (!recipientEmail || !recipientEmail.includes("@")) {
        return res.status(400).json({ error: "recipientEmail required" });
      }

      const [regRows] = await pool.query<RowDataPacket[]>(
        `SELECT r.id, r.public_uuid, r.status, r.athlete_id, r.event_id, r.registration_number,
                e.title AS event_title, e.allows_transfers, e.transfer_fee_cents
         FROM registrations r
         JOIN events e ON e.id = r.event_id AND e.deleted_at IS NULL
         WHERE r.id = ? AND r.athlete_id = ? AND r.deleted_at IS NULL LIMIT 1`,
        [registrationId, athleteId],
      );
      if (regRows.length === 0) {
        return res.status(404).json({ error: "Registration not found" });
      }

      const reg = regRows[0];
      if (reg.status !== "confirmed") {
        return res
          .status(400)
          .json({ error: "Only confirmed registrations can be transferred" });
      }
      if (!reg.allows_transfers) {
        return res
          .status(400)
          .json({ error: "This event does not allow registration transfers" });
      }

      const [pendingRows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM registration_transfers
         WHERE registration_id = ? AND status = 'pending' LIMIT 1`,
        [registrationId],
      );
      if (pendingRows.length > 0) {
        return res
          .status(409)
          .json({ error: "A transfer is already pending for this registration" });
      }

      const [recipientRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, email, first_name, last_name
         FROM athletes
         WHERE email = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
        [recipientEmail],
      );
      if (recipientRows.length === 0) {
        return res
          .status(404)
          .json({ error: "Recipient athlete not found for this email" });
      }

      const recipient = recipientRows[0];
      const toAthleteId = Number(recipient.id);
      if (toAthleteId === athleteId) {
        return res
          .status(400)
          .json({ error: "Cannot transfer registration to yourself" });
      }

      const transferFeeCents = Number(reg.transfer_fee_cents ?? 0);

      const [transferResult] = await pool.query<ResultSetHeader>(
        `INSERT INTO registration_transfers
           (registration_id, from_athlete_id, to_athlete_id, transfer_fee_cents, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [registrationId, athleteId, toAthleteId, transferFeeCents],
      );

      const transferId = transferResult.insertId;
      const eventTitle = String(reg.event_title);
      const regNumber = String(reg.registration_number);
      const portalUrl = `${appUrl.replace(/\/$/, "")}/portal/registrations`;
      const senderName = req.auth!.email;

      const emailSubject = `Registration transfer request: ${eventTitle}`;
      const emailHtml = `
        <p>Hello ${String(recipient.first_name)},</p>
        <p>${senderName} wants to transfer their registration <strong>${regNumber}</strong> for <strong>${eventTitle}</strong> to you.</p>
        <p><a href="${portalUrl}">Review and accept the transfer in your athlete portal</a>.</p>
      `;
      const emailText = `Registration transfer request for ${eventTitle}. Registration ${regNumber}. Review at ${portalUrl}`;

      void sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      });

      await pool.query<ResultSetHeader>(
        `INSERT INTO notification_queue
           (recipient_type, recipient_id, channel, to_address, subject, body, payload_json)
         VALUES ('athlete', ?, 'email', ?, ?, ?, ?)`,
        [
          toAthleteId,
          recipientEmail,
          emailSubject,
          emailHtml,
          JSON.stringify({
            type: "registration_transfer",
            transfer_id: transferId,
            registration_id: registrationId,
          }),
        ],
      );

      const [transferRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, registration_id, from_athlete_id, to_athlete_id,
                transfer_fee_cents, status, payment_id, completed_at, created_at
         FROM registration_transfers WHERE id = ? LIMIT 1`,
        [transferId],
      );

      res.status(201).json({ transfer: transferRows[0] });
    },
  );
}
