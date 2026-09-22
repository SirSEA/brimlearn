// Optional dependency shim: `sendPasswordResetEmail` dynamic-imports nodemailer
// only when SMTP is configured. Keeping a declaration here means TypeScript
// stays green whether or not the package is installed.
declare module "nodemailer" {
  interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
  }
  interface Transporter {
    sendMail(options: unknown): Promise<unknown>;
  }
  interface TransportConfig {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
  }
  const nodemailer: {
    createTransport(config: TransportConfig): Transporter;
  };
  export default nodemailer;
}