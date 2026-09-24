// Transactional email seam for auth flows, contact notifications, and school
// API-key mailouts. Delivery order:
//   1) Resend (RESEND_API_KEY) — the recommended provider for this app.
//   2) Generic SMTP via nodemailer (SMTP_*).
//   3) Neither → "demo" mode: senders resolve false and the caller returns the
//      reset link directly in the API response so the flow stays testable free.
//
// "Receiving" is handled by the contact-form → Firestore inbox pipeline (see
// db.ts / routers.ts): submissions always persist a message doc; email is just
// a notification on top, so nothing is lost without a mail provider.
import { ENV } from "./env";
import type { ContactMessage } from "@shared/message";
import type { School } from "@shared/school";

export { ENV };

export function isMailConfigured(): boolean {
  return ENV.mailConfigured;
}

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

const DEFAULT_FROM = "BrimLearn <onboarding@resend.dev>";

/** Sends via Resend when configured, else SMTP. Resolves false in demo mode. */
export async function sendMail(payload: MailPayload): Promise<boolean> {
  if (!isMailConfigured()) return false;

  if (ENV.resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: ENV.mailFrom || DEFAULT_FROM,
          to: [payload.to],
          reply_to: payload.replyTo || ENV.mailFrom || DEFAULT_FROM,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(`[Mail] Resend rejected send (${response.status}): ${detail.slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Mail] Resend send failed", error);
      return false;
    }
  }

  try {
    const nodeMailer = (await import("nodemailer")) as { default?: { createTransport: (config: unknown) => { sendMail: (opts: unknown) => Promise<unknown> } } };
    const module = nodeMailer.default;
    if (!module) return false;

    const transporter = module.createTransport({
      host: ENV.mailHost,
      port: ENV.mailPort,
      secure: ENV.mailSecure,
      auth: { user: ENV.mailUser, pass: ENV.mailPass },
    });

    await transporter.sendMail({
      from: ENV.mailFrom,
      ...payload,
    });
    return true;
  } catch (error) {
    console.error("[Mail] Failed to send email", error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendMail({
    to,
    subject: "Reset your BrimLearn password",
    text: `Someone asked to reset the password for this BrimLearn account. Open this link within ${ENV.passwordResetTtlMinutes} minutes to choose a new one:\n\n${resetUrl}\n\nIf you didn't ask for this, you can safely ignore this email.`,
    html: `<p>Someone asked to reset the password for this BrimLearn account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in ${ENV.passwordResetTtlMinutes} minutes. If you didn't ask for this, you can safely ignore this email.</p>`,
  });
}

/** Notifies the admin inbox owner that a landing contact form was submitted. */
export async function sendContactNotification(message: ContactMessage): Promise<boolean> {
  if (!ENV.contactNotifyEmail) return false;
  const kind = message.type === "school" ? "School partnership & API access request" : "Contact message";
  const lines = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    message.phone ? `Phone: ${message.phone}` : "",
    `Type: ${kind}`,
    message.schoolName ? `School: ${message.schoolName}` : "",
    message.roleAtSchool ? `Role at school: ${message.roleAtSchool}` : "",
    message.learnerCount ? `Approx. learners: ${message.learnerCount}` : "",
    "",
    "Message:",
    message.message,
  ].filter(Boolean);
  return sendMail({
    to: ENV.contactNotifyEmail,
    subject: `BrimLearn ${kind}: ${message.name}`,
    text: lines.join("\n"),
    html: `<p><strong>${kind}</strong></p><p>${lines.map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("<br/>")}</p>`,
  });
}

/** Sends the requester their API key when an admin approves a school (or a note on rejection). */
export async function sendSchoolDecisionEmail(school: School, approved: boolean): Promise<boolean> {
  if (approved && school.apiKey) {
    return sendMail({
      to: school.contactEmail,
      subject: "Your BrimLearn API access is ready",
      text: `Hi ${school.contactName},\n\nGood news — ${school.name} has been approved for BrimLearn API access.\n\nYour API key:\n${school.apiKey}\n\nKeep this key secret. Build it into your server-side integration and never expose it in client-side code.\n\nWelcome aboard,\nThe BrimLearn team`,
      html: `<p>Hi ${school.contactName},</p><p>Good news — <strong>${school.name}</strong> has been approved for BrimLearn API access.</p><p>Your API key:</p><p><code>${school.apiKey}</code></p><p>Keep this key secret. Build it into your server-side integration and never expose it in client-side code.</p><p>Welcome aboard,<br/>The BrimLearn team</p>`,
    });
  }
  return sendMail({
    to: school.contactEmail,
    subject: "Update on your BrimLearn API request",
    text: `Hi ${school.contactName},\n\nThanks for your interest in BrimLearn for ${school.name}. We can't approve API access right now, but you're welcome to get in touch again.\n\nThe BrimLearn team`,
    html: `<p>Hi ${school.contactName},</p><p>Thanks for your interest in BrimLearn for ${school.name}. We can't approve API access right now, but you're welcome to get in touch again.</p><p>The BrimLearn team</p>`,
  });
}