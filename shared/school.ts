// School partnership & API-access requests. Created automatically when a
// "school" type contact message is submitted; the admin reviews it and either
// approves (issuing a BrimLearn API key sent by email) or rejects. Approved
// schools can use the BrimLearn model/API in their own product.

export const SCHOOL_STATUSES = ["pending", "approved", "rejected"] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export type School = {
  id: string;
  /** School / organisation name. */
  name: string;
  contactName: string;
  contactEmail: string;
  phone: string | null;
  /** Approximate number of learners, free text (e.g. "1,200"). */
  learnerCount: string | null;
  /** Link back to the originating contact message, if any. */
  messageId: string | null;
  status: SchoolStatus;
  /** Issued on approval (prefix `brim_`). Null until approved. */
  apiKey: string | null;
  createdAt: string;
  decidedAt: string | null;
};