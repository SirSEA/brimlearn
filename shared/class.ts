// Class groups that admins create and assign to teachers. A class has one
// owning tutor (the teacher) and a list of enrolled student openIds. There is
// no relational DB — student membership is just an array on the class doc.

export type ClassGroup = {
  id: string;
  name: string;
  grade: string | null;
  subject: string | null;
  /** openId of the assigned teacher (see users collection). Null until assigned. */
  tutorId: string | null;
  tutorName: string | null;
  /** openIds of students (role "student") enrolled in this class. */
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
};