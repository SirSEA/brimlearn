import { useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type ContactType, api } from "@/_core/api";
import { Send, CheckCircle2, Building2, MessageSquareText } from "lucide-react";

const SCHOOL_ROLES = ["Teacher / tutor", "Curriculum lead", "Head / principal", "Admin / ICT officer", "Other"];

export function ContactForm() {
  const [type, setType] = useState<ContactType>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [roleAtSchool, setRoleAtSchool] = useState("");
  const [learnerCount, setLearnerCount] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Add your name.");
    if (!email.trim()) return toast.error("Add your email so we can reply.");
    if (!message.trim() || message.trim().length < 10) return toast.error("Tell us a bit more — at least 10 characters.");
    if (type === "school" && !schoolName.trim()) return toast.error("Add your school or organisation name.");
    setSending(true);
    try {
      await api.submitContact({
        type,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim(),
        schoolName: type === "school" ? schoolName.trim() : null,
        roleAtSchool: type === "school" ? roleAtSchool.trim() || null : null,
        learnerCount: type === "school" ? learnerCount.trim() || null : null,
      });
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiUnavailableError) {
        toast.error("Offline — start the dev server to send the message.");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not send your message.");
      }
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="grid h-full min-h-[560px] place-items-center rounded-[28px] bg-[#3B241A] p-8 text-center">
        <div>
          <CheckCircle2 size={40} className="mx-auto text-[#FFC857]" />
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.04em] text-white">Message sent, {name.split(" ")[0]}.</h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#D9C4B0]">
            Thanks for reaching out{type === "school" ? " — your school request is on its way to us" : ""}. We'll get back to the inbox
            you gave us shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setMessage("");
              setSchoolName("");
            }}
            className="mt-6 rounded-full bg-[#FFC857] px-5 py-2.5 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857]/90"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-[#E8D7C3] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40";

  return (
    <div className="rounded-[28px] bg-[#3B241A] p-6 text-white sm:p-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFC857]">Contact us</div>
      <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">Say hello.</h3>
      <p className="mt-2 text-sm leading-6 text-[#D9C4B0]">
        A question, feedback, or a school that wants to use the BrimLearn model and API — this form lands straight in the admin inbox.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => setType("general")}
          className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold transition ${
            type === "general" ? "bg-[#FFC857] text-[#1A1512]" : "bg-white/10 text-[#D9C4B0] hover:bg-white/15"
          }`}
        >
          <MessageSquareText size={14} /> General
        </button>
        <button
          onClick={() => setType("school")}
          className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold transition ${
            type === "school" ? "bg-[#FFC857] text-[#1A1512]" : "bg-white/10 text-[#D9C4B0] hover:bg-white/15"
          }`}
        >
          <Building2 size={14} /> School & API
        </button>
      </div>

      <div className="mt-5 space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name *" maxLength={80} className={inputClass} />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email *" type="email" maxLength={200} className={inputClass} />
        </div>
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone (optional)" maxLength={40} className={inputClass} />

        {type === "school" && (
          <div className="space-y-3.5 rounded-2xl bg-white/5 p-4">
            <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="School / organisation *" maxLength={160} className={inputClass} />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <select value={roleAtSchool} onChange={(event) => setRoleAtSchool(event.target.value)} className={`${inputClass} text-[#765F4F]`}>
                <option value="">Your role…</option>
                {SCHOOL_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input value={learnerCount} onChange={(event) => setLearnerCount(event.target.value)} placeholder="Approx. learners (e.g. 1,200)" maxLength={40} className={inputClass} />
            </div>
          </div>
        )}

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={type === "school" ? "Tell us about your school and how you'd like to use the BrimLearn model/API… *" : "How can we help? *"}
          rows={4}
          maxLength={2000}
          className={`${inputClass} resize-none`}
        />
        <button
          onClick={submit}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full bg-[#FFC857] px-6 py-3 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857]/90 disabled:opacity-60"
        >
          <Send size={14} /> {sending ? "Sending…" : "Send message"}
        </button>
        <p className="text-[11px] text-[#A08A75]">We read everything and reply within a day or two.</p>
      </div>
    </div>
  );
}