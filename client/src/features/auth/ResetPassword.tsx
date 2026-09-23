import { useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { AuthLayout, Field } from "./AuthPage";
import { ApiUnavailableError, api } from "@/_core/api";
import { ArrowRight, KeyRound, Lock, TriangleAlert } from "lucide-react";

/** Token + optional email arrive as query params on links issued by the reset flow. */
function readQuery(): { token: string; email: string } {
  const params = new URLSearchParams(window.location.search);
  return { token: params.get("token") ?? "", email: params.get("email") ?? "" };
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { token, email } = useMemo(readQuery, []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        setError("Demo mode is offline — start the dev server to reset your password.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full rounded-[28px] bg-[#FFFDF8] p-7 shadow-[0_18px_40px_rgba(59,36,26,.08)] sm:p-9">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B6B3C]">Account recovery</div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#1A1512]">
          Choose a new password.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#765F4F]">
          {email ? <>For <span className="font-semibold text-[#3B241A]">{email}</span>.</> : "Set a new password for your BrimLearn account."}
        </p>

        {done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#DDE5C9] bg-[#F0F2E4] p-4 text-sm leading-6 text-[#3B241A]">
              Your password has been updated. You can now sign in with it.
            </div>
            <button
              onClick={() => setLocation("/login")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22]"
            >
              Go to sign in <ArrowRight size={15} />
            </button>
          </div>
        ) : !token ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-[#FFE7A8] bg-[#FFF1CD] p-4">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#9A6712]" />
              <div className="text-sm leading-6 text-[#9A6712]">
                This link is missing its reset token. Open the reset link you received, or request a new one.
              </div>
            </div>
            <button
              onClick={() => setLocation("/forgot-password")}
              className="w-full rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22]"
            >
              Request a new link
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field
              label="New password"
              icon={Lock}
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => { setPassword(event.target.value); if (error) setError(""); }}
              error={error}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Field
              label="Confirm new password"
              icon={KeyRound}
              type="password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(event) => { setConfirm(event.target.value); if (error) setError(""); }}
              error={error}
              required
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Please wait…" : "Update password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-[#8A7361]">
          Remembered it?{" "}
          <button onClick={() => setLocation("/login")} className="font-semibold text-[#4B6B3C] hover:text-[#C65A2E]">
            Back to sign in
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}