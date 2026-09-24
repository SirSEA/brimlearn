// Contact-form messages. Submitting the landing "Contact us" form (general
// question OR school partnership & API-access request) creates a message here,
// which is what the admin sees in the workspace "Messages" inbox. School-type
// messages also create a companion "school" request (see shared/school.ts) so
// the admin can approve/reject and issue an API key on the Schools tab.
//
// When SMTP is configured the message is ALSO emailed to CONTACT_NOTIFY_EMAIL,
// but Firestore is the source of truth — nothing is lost without a mail server.

export const CONTACT_TYPES = ["general", "school"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const MESSAGE_STATUSES = ["new", "read", "contacted", "approved", "rejected"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export type ContactMessage = {
  id: string;
  /** "general" question vs "school" partnership / API-access request. */
  type: ContactType;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  /** Extra fields shown only for school-type requests. */
  schoolName: string | null;
  roleAtSchool: string | null;
  learnerCount: string | null;
  status: MessageStatus;
  createdAt: string;
  readAt: string | null;
};