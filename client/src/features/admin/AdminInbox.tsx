import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type ContactMessage, type MessageStatus, type School, api } from "@/_core/api";
import { MessagesSquare, Mail, Phone, School as SchoolIcon, Check, X, Archive } from "lucide-react";

const STATUS_LABEL: Record<MessageStatus, string> = {
  new: "New",
  read: "Read",
  contacted: "Contacted",
  approved: "Approved",
  rejected: "Rejected",
};

function statusChip(status: MessageStatus) {
  const styles: Record<MessageStatus, string> = {
    new: "bg-[#FFC857] text-[#1A1512]",
    read: "bg-[#F3E9DE] text-[#765F4F]",
    contacted: "bg-[#E7E0F5] text-[#5B4A94]",
    approved: "bg-[#E7F0DD] text-[#4B6B3C]",
    rejected: "bg-[#F8EAE3] text-[#A94A3D]",
  };
  return styles[status];
}

export function AdminInbox({ onOpenSchools }: { onOpenSchools?: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<MessageStatus | "all" | "school">("all");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoaded(true);
    try {
      const [messageList, schoolList] = await Promise.all([api.listAdminMessages(), api.listAdminSchools()]);
      setMessages(messageList);
      setSchools(schoolList);
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server." : "Could not load the inbox.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const schoolByMessage = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach((school) => {
      if (school.messageId) map.set(school.messageId, school);
    });
    return map;
  }, [schools]);

  const visible = useMemo(() => {
    return messages
      .filter((message) => {
        if (filter === "all") return true;
        if (filter === "school") return message.type === "school";
        return message.status === filter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, filter]);

  const markStatus = async (message: ContactMessage, status: MessageStatus) => {
    setPending(message.id);
    try {
      const updated = await api.setAdminMessageStatus(message.id, status);
      setMessages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the message.");
    } finally {
      setPending(null);
    }
  };

  const decideSchool = async (school: School, status: "approved" | "rejected") => {
    setPending(`school-${school.id}`);
    try {
      const updated = await api.decideAdminSchool(school.id, status);
      setSchools((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (status === "approved") {
        toast.success(`Approved. API key sent to ${school.contactEmail}.`);
        window.navigator.clipboard?.writeText(updated.apiKey ?? "").catch(() => undefined);
      } else {
        toast.success("Request rejected.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the request.");
    } finally {
      setPending(null);
    }
  };

  const filters: { key: MessageStatus | "all" | "school"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "school", label: "School requests" },
    { key: "contacted", label: "Contacted" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <MessagesSquare size={13} /> Messages
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">Everyone who reached out.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Contact-form submissions from the public landing page. School requests land here too — approve one and the school gets its API key by email.
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === item.key ? "bg-[#3B241A] text-white" : "bg-[#F3E9DE] text-[#765F4F] hover:bg-[#EADDCB]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {!loaded ? (
            <p className="text-sm text-[#A08A75]">Loading messages…</p>
          ) : visible.length === 0 ? (
            <p className="rounded-2xl bg-[#F7EFE3] p-4 text-sm text-[#765F4F]">
              {messages.length === 0 ? "Nothing here yet. Messages from the landing-page contact form will appear in this inbox." : "No messages match that filter."}
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((message) => {
                const school = schoolByMessage.get(message.id);
                const open = expanded === message.id;
                return (
                  <div key={message.id} className={`rounded-2xl border bg-white ${message.status === "new" ? "border-[#FFC857]/60" : "border-[#F3E9DE]"}`}>
                    <button
                      onClick={() => {
                        setExpanded(open ? null : message.id);
                        if (message.status === "new") markStatus(message, "read");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E9DE] text-[#765F4F]">
                          <Mail size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[#3B241A]">{message.name}</span>
                            <span className="rounded-full bg-[#F3E9DE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#765F4F]">
                              {message.type === "school" ? "School request" : "General"}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusChip(message.status)}`}>
                              {STATUS_LABEL[message.status]}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-xs text-[#A08A75]">
                            {message.email} {message.schoolName ? `· ${message.schoolName}` : ""} · {new Date(message.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#8A7361]">{open ? "Close" : "Review →"}</span>
                    </button>

                    {open && (
                      <div className="border-t border-[#F3E9DE] px-4 py-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-[#3B241A]">{message.message}</p>

                        <div className="mt-4 grid gap-2 rounded-2xl bg-[#F7EFE3] p-4 text-xs text-[#765F4F] sm:grid-cols-3">
                          <div className="flex items-center gap-2">
                            <Mail size={14} /> {message.email}
                          </div>
                          {message.phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={14} /> {message.phone}
                            </div>
                          )}
                          {message.schoolName && (
                            <div className="flex items-center gap-2">
                              <SchoolIcon size={14} /> {message.schoolName} {message.roleAtSchool ? `· ${message.roleAtSchool}` : ""}
                            </div>
                          )}
                          {message.learnerCount && (
                            <div className="flex items-center gap-2">
                              <SchoolIcon size={14} /> ~{message.learnerCount} learners
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {message.type === "school" && school && school.status === "pending" && (
                            <>
                              <button
                                onClick={() => decideSchool(school, "approved")}
                                disabled={pending !== null}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#4B6B3C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3A532E] disabled:opacity-50"
                              >
                                <Check size={14} /> Approve &amp; issue API key
                              </button>
                              <button
                                onClick={() => decideSchool(school, "rejected")}
                                disabled={pending !== null}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#C97064] px-4 py-2 text-sm font-semibold text-[#A94A3D] transition hover:bg-[#F8EAE3] disabled:opacity-50"
                              >
                                <X size={14} /> Reject
                              </button>
                            </>
                          )}
                          {message.type === "school" && school && school.status !== "pending" && (
                            <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${statusChip(school.status === "approved" ? "approved" : "rejected")}`}>
                              {school.status === "approved" ? `Approved — key ${school.apiKey?.slice(0, 12)}…` : "Rejected"}
                            </span>
                          )}
                          {message.type === "school" && !school && (
                            <span className="text-xs text-[#A08A75]">No linked school request on file.</span>
                          )}
                          <button
                            onClick={() => (window.location.href = `mailto:${message.email}?subject=${encodeURIComponent("Re: your message to BrimLearn")}`)}
                            className="rounded-full border border-[#E2CDB8] px-4 py-2 text-sm font-semibold text-[#765F4F] transition hover:bg-[#F7EFE3]"
                          >
                            Reply by email
                          </button>
                          <button
                            onClick={() => markStatus(message, message.status === "contacted" ? "read" : "contacted")}
                            disabled={pending !== null}
                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[#765F4F] transition hover:bg-[#F7EFE3] disabled:opacity-50"
                          >
                            <Archive size={14} /> Mark {message.status === "contacted" ? "read" : "contacted"}
                          </button>
                          {message.type === "school" && school && (
                            <button onClick={onOpenSchools} className="text-xs font-semibold text-[#4B6B3C] underline-offset-2 hover:underline">
                              Open Schools tab →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}