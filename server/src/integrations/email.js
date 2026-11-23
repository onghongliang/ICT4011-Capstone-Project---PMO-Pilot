import nodemailer from "nodemailer";
import { config } from "../config/env.js";

let cachedTransport = null;

// Falls back to nodemailer's "json" transport (captures what would have
// been sent; nothing goes out over the network) unless real SMTP settings
// are configured. This lets the whole invite pipeline run against the
// synthetic seed data (fake @*.test addresses) without mail credentials —
// switching to a real mail provider is just setting SMTP_HOST etc.
function getTransport() {
  if (cachedTransport) return cachedTransport;
  const { smtp } = config;
  cachedTransport = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return cachedTransport;
}

export async function sendInviteEmail({ to, subject, text, icsContent, icsFilename = "invite.ics", method = "REQUEST" }) {
  const info = await getTransport().sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    icalEvent: { filename: icsFilename, method, content: icsContent },
  });
  return { simulated: !config.smtp.host, message_id: info.messageId };
}
