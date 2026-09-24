import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiUnavailableError, type School, api } from "@/_core/api";
import { Building2, Check, X, KeyRound, Mail, Copy } from "lucide-react";

export function AdminSchools({ onOpenMessages }: { onOpenMessages?: () => void }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoaded(true);
    try {
      setSchools(await api.listAdminSchools());
    } catch (error) {
      toast.error(error instanceof ApiUnavailableError ? "Offline — start the dev server." : "Could not load school requests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ordered = useMemo(() => {
    const rank = { pending: 0, approved: 1, rejected: 2 } as const;
    return [...schools].sort((a, b) => rank[a.status] - rank[b.status] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [schools]);

  const decide = async (school: School, status: "approved" | "rejected") => {
    setPending(school.id);
    try {
      const updated = await api.decideAdminSchool(school.id, status);
      setSchools((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (status === "approved") {
        toast.success(`Approved. Key sent to ${school.contactEmail}.`);
        window.navigator.clipboard?.writeText(updated.apiKey ?? "").catch(() => undefined);
      } else {
        toast.success("Request rejected.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not decide that request.");
    } finally {
      setPending(null);
    }
  };

  const stats = useMemo(
    () => ({
      pending: schools.filter((item) => item.status === "pending").length,
      approved: schools.filter((item) => item.status === "approved").length,
    }),
    [schools]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <Building2 size={13} /> Schools
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">Schools that want in.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Every school or organisation that asked to use the BrimLearn model/API. Approve to issue an API key by email, or reject the request.
          {stats.pending > 0 && ` ${stats.pending} request${stats.pending > 1 ? "s" : ""} waiting on you.`}
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-end justify-between rounded-2xl bg-[#F7EFE3] px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Pending</div>
              <div className="mt-1 font-display text-3xl font-semibold text-[#3B241A]">{stats.pending}</div>
            </div>
            <span className="text-xs text-[#765F4F]">Awaiting your decision</span>
          </div>
          <div className="flex items-end justify-between rounded-2xl bg-[#E7F0DD] px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">Approved</div>
              <div className="mt-1 font-display text-3xl font-semibold text-[#2E4523]">{stats.approved}</div>
            </div>
            <span className="text-xs text-[#4B6B3C]">API keys issued</span>
          </div>
        </div>

        <div className="mt-6">
          {!loaded ? (
            <p className="text-sm text-[#A08A75]">Loading schools…</p>
          ) : ordered.length === 0 ? (
            <p className="rounded-2xl bg-[#F7EFE3] p-4 text-sm text-[#765F4F]">
              No school requests yet. School partnership form submissions on the landing page will appear here.
              {onOpenMessages && (
                <button onClick={onOpenMessages} className="ml-1 font-semibold text-[#4B6B3C] underline underline-offset-2">
                  View contact messages
                </button>
              )}
            </p>
          ) : (
            <div className="space-y-4">
              {ordered.map((school) => (
                <div key={school.id} className="rounded-2xl border border-[#F3E9DE] bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-[#3B241A]">{school.name}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                            school.status === "pending"
                              ? "bg-[#FFC857] text-[#1A1512]"
                              : school.status === "approved"
                                ? "bg-[#E7F0DD] text-[#4B6B3C]"
                                : "bg-[#F8EAE3] text-[#A94A3D]"
                          }`}
                        >
                          {school.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A08A75]">
                        <span className="flex items-center gap-1.5"><Mail size={13} /> {school.contactName} · {school.contactEmail}</span>
                        {school.learnerCount && <span className="flex items-center gap-1.5"><Building2 size={13} /> ~{school.learnerCount} learners</span>}
                        <span>Requested {new Date(school.createdAt).toLocaleDateString()}</span>
                      </div>
                      {school.status === "approved" && school.apiKey && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#E7F0DD] px-3 py-2">
                          <KeyRound size={14} className="text-[#4B6B3C]" />
                          <code className="text-xs font-semibold text-[#2E4523]">{school.apiKey.slice(0, 14)}…</code>
                          <button
                            onClick={() => {
                              window.navigator.clipboard?.writeText(school.apiKey ?? "").then(() => toast.success("API key copied.")).catch(() => undefined);
                            }}
                            className="rounded-lg p-1 text-[#4B6B3C] hover:bg-[#D9E8C8]"
                            aria-label="Copy API key"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {school.status === "pending" ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => decide(school, "approved")}
                          disabled={pending !== null}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#4B6B3C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3A532E] disabled:opacity-50"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => decide(school, "rejected")}
                          disabled={pending !== null}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#C97064] px-4 py-2 text-sm font-semibold text-[#A94A3D] transition hover:bg-[#F8EAE3] disabled:opacity-50"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 text-right text-xs text-[#A08A75]">
                        {school.decidedAt ? `Decided ${new Date(school.decidedAt).toLocaleDateString()}` : school.status}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}