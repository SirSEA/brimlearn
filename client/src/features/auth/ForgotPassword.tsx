import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { AuthLayout, Field } from "./AuthPage";
import { ApiUnavailableError, api } from "@/_core/api";
import { ArrowRight, CheckCircle2, KeyRound, Mail, TriangleAlert } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await api.requestPasswordReset(email.trim());
      setSent(true);
      setDemoUrl(result.demoMode ? result.resetUrl : null);
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        setError("Demo mode is offline — start the dev server to request a reset link.");
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
          Reset your password.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#765F4F]">
          Enter the email on your BrimLearn account and we'll send a one-time reset link.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-[#DDE5C9] bg-[#F0F2E4] p-4">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#4B6B3C]" />
              <div className="text-sm leading-6 text-[#3B241A]">
                {demoUrl
                  ? "A reset link was prepared for that account (if it exists). Email delivery isn't wired up yet, so here is a testing link you can use right now:"
                  : "If an account exists for that email, a reset link has been sent. Check your inbox (and spam folder)."}
              </div>
            </div>
            {demoUrl && (
              <div className="rounded-2xl border border-[#FFE7A8] bg-[#FFF1CD] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A6712]">
                  <TriangleAlert size={14} /> Testing link (demo mode)
                </div>
                <a
                  href={demoUrl}
                  className="mt-3 block break-all rounded-xl border border-[#E7C876] bg-[#FFFDF8] px-3.5 py-3 text-xs font-semibold text-[#9A6712] underline decoration-dotted hover:bg-[#FFFDF8]"
                >
                  {demoUrl}
                </a>
                <p className="mt-3 text-xs leading-5 text-[#9A6712]">
                  This link only appears here while no SMTP server is set. Once SMTP credentials are configured in .env, the link is emailed instead and never shown in the browser.
                </p>
              </div>
            )}
            <button
              onClick={() => setLocation("/login")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22]"
            >
              Back to sign in <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field
              label="Email address"
              icon={Mail}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }}
              error={error}
              required
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84A22] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={15} /> {submitting ? "Please wait…" : "Send reset link"}
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