import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/_core/api";
import { UserRound, Mail, KeyRound, CalendarDays, Clock, ShieldCheck } from "lucide-react";
import { BackToDashboard } from "@/components/account/AccountPage";

function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "tutor":
      return "Teacher";
    case "admin":
      return "Admin";
    case "parent":
      return "Parent";
    case "student":
      return "Student";
    default:
      return "Learner";
  }
}

export function ProfileTab() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const canEditEmail = user.loginMethod === "email";
  const hasChanges = name.trim() !== (user.name ?? "") || (canEditEmail && email.trim() !== (user.email ?? ""));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), ...(canEditEmail ? { email: email.trim() } : {}) });
      await refresh();
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <UserRound size={13} /> Your profile
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">Your account, your way.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Update the name and email on your account. Your role is managed by an admin — everything else here is yours to edit.
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-1/2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Personal details</div>
            <div className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-[#765F4F]">
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
                />
              </label>
              <label className="block text-xs font-semibold text-[#765F4F]">
                Email address
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!canEditEmail}
                  type="email"
                  className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40 disabled:opacity-60"
                />
                {!canEditEmail && <span className="mt-1.5 block text-[11px] text-[#A08A75]">You signed in with Google, so your email is managed by Google.</span>}
              </label>
              <button
                onClick={save}
                disabled={saving || !hasChanges}
                className="rounded-full bg-[#FFC857] px-5 py-2.5 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">Account info</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-[#F7EFE3] px-4 py-3">
                <span className="flex items-center gap-2 text-[#765F4F]"><ShieldCheck size={15} /> Role</span>
                <span className="font-semibold text-[#3B241A]">{roleLabel(user.role)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#F7EFE3] px-4 py-3">
                <span className="flex items-center gap-2 text-[#765F4F]"><KeyRound size={15} /> Sign-in method</span>
                <span className="font-semibold capitalize text-[#3B241A]">{user.loginMethod ?? "unknown"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#F7EFE3] px-4 py-3">
                <span className="flex items-center gap-2 text-[#765F4F]"><CalendarDays size={15} /> Joined</span>
                <span className="font-semibold text-[#3B241A]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#F7EFE3] px-4 py-3">
                <span className="flex items-center gap-2 text-[#765F4F]"><Clock size={15} /> Last signed in</span>
                <span className="font-semibold text-[#3B241A]">{user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "—"}</span>
              </div>
              {user.status === "suspended" && (
                <div className="rounded-2xl bg-[#F8EAE3] px-4 py-3 text-sm font-semibold text-[#A94A3D]">
                  Your account is currently suspended. Contact support to reactivate it.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}