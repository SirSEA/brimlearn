import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/_core/api";
import { Settings2, BellRing, LockKeyhole, Mail } from "lucide-react";
import { BackToDashboard } from "@/components/account/AccountPage";

export function SettingsTab() {
  const { user, refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  if (!user) return null;

  const emailOn = user.preferences?.emailNotifications !== false;

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setChanging(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your password.");
    } finally {
      setChanging(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setSavingPrefs(true);
    try {
      await api.updateProfile({ preferences: { emailNotifications: value } });
      await refresh();
      toast.success(value ? "Email notifications on." : "Email notifications off.");
    } catch (error) {
      toast.error("Could not save that setting.");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(35,27,22,.16)] sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
          <Settings2 size={13} /> Settings
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[44px]">
          Security and notifications.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D9C4B0]">
          Manage your password and choose how loud BrimLearn gets.
        </p>
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
          <LockKeyhole size={14} /> Change password
        </div>

        {user.loginMethod !== "email" ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#F7EFE3] px-4 py-3 text-sm text-[#765F4F]">
            <Mail size={15} /> You signed in with {user.loginMethod}, so there's no password to change here.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-[#765F4F]">
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
              />
            </label>
            <label className="block text-xs font-semibold text-[#765F4F]">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
              />
            </label>
            <div>
              <span className="block text-xs font-semibold text-[#765F4F]">
                Confirm new password
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#3B241A] outline-none transition focus:border-[#8CAE70] focus:ring-2 focus:ring-[#FFC857]/40"
                />
                <button
                  onClick={changePassword}
                  disabled={changing || !currentPassword || !newPassword}
                  className="shrink-0 rounded-full bg-[#FFC857] px-4 py-2.5 text-sm font-semibold text-[#1A1512] transition hover:bg-[#FFC857] disabled:opacity-50"
                >
                  {changing ? "Saving…" : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
          <BellRing size={14} /> Notifications
        </div>
        <div className="mt-4 flex items-start justify-between rounded-2xl bg-[#F7EFE3] px-4 py-4">
          <div>
            <div className="text-sm font-semibold text-[#3B241A]">Email notifications</div>
            <div className="mt-0.5 text-xs text-[#8A7361]">
              New quizzes, results, and class updates straight to your inbox.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={emailOn}
            onClick={() => toggleNotifications(!emailOn)}
            disabled={savingPrefs}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${emailOn ? "bg-[#4B6B3C]" : "bg-[#D4BFA9]"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${emailOn ? "left-6" : "left-1"}`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}