// Transactional email seam for auth flows (password resets today).
// Until SMTP is configured the app runs in "demo" mode and reset links are
// returned in the API response so the whole flow is testable for free.
//
// Real delivery uses nodemailer, installed on demand. `sendPasswordResetEmail`
// degrades gracefully to `false` when it is missing or SMTP is unconfigured —
// no runtime or build-time hard dependency.
import { ENV } from "./env";

export { ENV };

export function isMailConfigured(): boolean {
  return ENV.mailConfigured;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  if (!isMailConfigured()) return false;

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
      to,
      subject: "Reset your BrimLearn password",
      text: `Someone asked to reset the password for this BrimLearn account. Open this link within ${ENV.passwordResetTtlMinutes} minutes to choose a new one:\n\n${resetUrl}\n\nIf you didn't ask for this, you can safely ignore this email.`,
      html: `<p>Someone asked to reset the password for this BrimLearn account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in ${ENV.passwordResetTtlMinutes} minutes. If you didn't ask for this, you can safely ignore this email.</p>`,
    });
    return true;
  } catch (error) {
    console.error("[Mail] Failed to send password reset email", error);
    return false;
  }
}