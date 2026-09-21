import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ApiUnavailableError, AuthError } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrimMark } from "@/components/layout/BrimMark";
import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";
import { Lock, Mail, ShieldCheck, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Please enter your admin email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Please enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const user = await adminLogin({ email, password });
      toast.success(`Welcome back, ${user.name?.split(" ")[0] || "admin"}.`);
      setLocation("/admin");
    } catch (error) {
      if (error instanceof AuthError) {
        toast.error(error.message);
      } else if (error instanceof ApiUnavailableError) {
        toast.error("Demo mode is offline — start the dev server to use the admin console.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#123d30] text-[#183c31]">
      <RedirectIfAuthed />
      <button
        onClick={() => setLocation("/login")}
        className="absolute left-5 top-5 z-20 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-[#c4ded0] transition hover:bg-white/20 hover:text-white"
      >
        <ArrowLeft size={13} /> Back to sign in
      </button>

      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <BrimMark />
          </div>
          <div className="w-full rounded-[28px] bg-white p-7 shadow-[0_24px_60px_rgba(0,0,0,.28)] sm:p-9">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34775e]">
              <ShieldCheck size={14} /> Admin console
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#183c31]">
              Restricted area.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#648075]">
              Authorised administrators only. Your session stays on this secure route.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-xs font-semibold text-[#527064]">Admin email<span className="ml-0.5 text-[#d9533f]" title="Required">*</span></span>
                <div className="relative mt-2">
                  <Mail size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${fieldErrors.email ? "text-[#d9533f]" : "text-[#9aaca2]"}`} />
                  <input
                    type="email"
                    placeholder="admin@brimlearn.com"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: "" })); }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    required
                    autoComplete="email"
                    className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-[#25483c] outline-none transition placeholder:font-medium placeholder:text-[#a7b5ad] focus:ring-2 ${fieldErrors.email ? "border-[#e4a9a1] bg-[#fff8f6] focus:border-[#d9533f] focus:ring-[#fbe1dc]/60" : "border-[#e1e8df] focus:border-[#6b9f88] focus:ring-[#d8f36a]/40"}`}
                  />
                </div>
                {fieldErrors.email && <span className="mt-1.5 block text-xs font-medium text-[#d9533f]">{fieldErrors.email}</span>}
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#527064]">Password<span className="ml-0.5 text-[#d9533f]" title="Required">*</span></span>
                <div className="relative mt-2">
                  <Lock size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${fieldErrors.password ? "text-[#d9533f]" : "text-[#9aaca2]"}`} />
                  <input
                    type="password"
                    placeholder="Your admin password"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: "" })); }}
                    aria-invalid={Boolean(fieldErrors.password)}
                    required
                    autoComplete="current-password"
                    className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-[#25483c] outline-none transition placeholder:font-medium placeholder:text-[#a7b5ad] focus:ring-2 ${fieldErrors.password ? "border-[#e4a9a1] bg-[#fff8f6] focus:border-[#d9533f] focus:ring-[#fbe1dc]/60" : "border-[#e1e8df] focus:border-[#6b9f88] focus:ring-[#d8f36a]/40"}`}
                  />
                </div>
                {fieldErrors.password && <span className="mt-1.5 block text-xs font-medium text-[#d9533f]">{fieldErrors.password}</span>}
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#d8f36a] px-4 py-3 text-sm font-semibold text-[#173c2e] transition hover:bg-[#e4fb8b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Enter admin console"}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-5 text-[#9aaca2]">
              Admin credentials are provisioned for school coordinators only.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[28px] border-[#c9e95b]/15" />
      <div className="absolute -bottom-36 -left-16 h-96 w-96 rounded-full border-[50px] border-[#c9e95b]/10" />
    </div>
  );
}