import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ApiUnavailableError, AuthError, type AuthUser, type SignupRole } from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrimMark } from "@/components/layout/BrimMark";
import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";
import { roleHomePath } from "@/lib/roles";
import { ArrowUpRight, Brain, GraduationCap, Lock, Mail, ShieldCheck, Sparkles, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GoogleButton({ role, enabled }: { role: SignupRole; enabled: boolean }) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => {
        if (!enabled) {
          toast.info("Google sign-in isn't configured on the server yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.");
          return;
        }
        window.location.assign(`/api/oauth/google/start?role=${encodeURIComponent(role)}`);
      }}
      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#e1e8df] bg-white px-4 py-3 text-sm font-semibold text-[#25483c] transition hover:border-[#99bda8] hover:bg-[#fbfcf9] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleMark /> Continue with Google
    </button>
  );
}

type Role = { id: SignupRole; label: string; icon: typeof Brain; blurb: string };

const ROLES: Role[] = [
  { id: "student", label: "Student", icon: Brain, blurb: "A learner building short, steady practice habits." },
  { id: "parent", label: "Parent", icon: Users, blurb: "Follow progress and always see the next best step." },
  { id: "tutor", label: "Tutor", icon: GraduationCap, blurb: "Run a classroom and respond to gaps before they grow." },
];

function Field({
  label,
  icon: Icon,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: typeof Mail; error?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#527064]">
        {label}
        {props.required && <span className="ml-0.5 text-[#d9533f]" title="Required">*</span>}
      </span>
      <div className="relative mt-2">
        {Icon && <Icon size={16} className={cn("pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2", error ? "text-[#d9533f]" : "text-[#9aaca2]")} />}
        <input
          {...props}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-3 text-sm font-semibold text-[#25483c] outline-none transition",
            "placeholder:font-medium placeholder:text-[#a7b5ad]",
            "focus:ring-2",
            Icon && "pl-10",
            error
              ? "border-[#e4a9a1] bg-[#fff8f6] focus:border-[#d9533f] focus:ring-[#fbe1dc]/60"
              : "border-[#e1e8df] focus:border-[#6b9f88] focus:ring-[#d8f36a]/40"
          )}
        />
      </div>
      {error && <span className="mt-1.5 block text-xs font-medium text-[#d9533f]">{error}</span>}
    </label>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fbfbf6] text-[#183c31] lg:grid lg:grid-cols-[440px_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#123d30] p-10 text-white lg:flex">
        <div className="relative z-10">
          <BrimMark />
        </div>
        <div className="relative z-10 max-w-sm">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d8f36a]">
            <Sparkles size={13} /> One account, every view of learning
          </div>
          <h1 className="font-display text-[38px] font-semibold leading-[1.04] tracking-[-0.06em]">
            Short, steady practice.<br />
            <span className="text-[#d8f36a]">Real growth for everyone.</span>
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#c4ded0]">
            Sign in once and BrimLearn knows who you are — a learner, a parent, or a tutor — and meets you where you are.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <span key={role.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-[#c4ded0]">
                <role.icon size={13} /> {role.label}
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-[#82a79a]">
          <span>BrimLearn · An online school aligned with BECE | WAEC | NECO | JAMB Curriculum</span>
          <span>JSS1 – SS3</span>
        </div>
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[26px] border-[#c9e95b]/20" />
        <div className="absolute -bottom-32 right-6 h-72 w-72 rounded-full border-[45px] border-[#c9e95b]/10" />
      </aside>

      <main className="grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

export default function AuthPage({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [, setLocation] = useLocation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [role, setRole] = useState<SignupRole>("student");
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const activeRole = ROLES.find((item) => item.id === role) ?? ROLES[0];

  useEffect(() => {
    fetch("/api/oauth/google/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((config: { enabled?: boolean } | null) => {
        if (config && typeof config.enabled === "boolean") setGoogleEnabled(config.enabled);
      })
      .catch(() => {
        // Backend offline; keep the button enabled so the flow explains itself.
      });
  }, []);

  const run = (action: () => Promise<AuthUser>) => async (event: FormEvent) => {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) errors.name = "Please enter your full name.";
    if (!email.trim()) errors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!password) errors.password = mode === "signup" ? "Choose a password of at least 6 characters." : "Please enter your password.";
    else if (mode === "signup" && password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (mode === "signup") {
      if (!confirm) errors.confirm = "Please repeat your password.";
      else if (confirm !== password) errors.confirm = "Passwords do not match.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (mode === "signup" && password !== confirm) return;

    setSubmitting(true);
    try {
      const user = await action();
      toast.success(mode === "login" ? `Welcome back, ${user.name?.split(" ")[0] || "learner"}.` : `Account created. Welcome, ${user.name?.split(" ")[0] || "learner"}.`);
      setLocation(roleHomePath(user.role));
    } catch (error) {
      if (error instanceof AuthError) {
        toast.error(error.message);
      } else if (error instanceof ApiUnavailableError) {
        toast.error("Demo mode is offline — start the dev server to create accounts.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent) =>
    run(mode === "login" ? () => login({ email, password }) : () => signup({ name, email, password, role }))(event);

  return (
    <AuthLayout>
      <RedirectIfAuthed />
      <div className="w-full rounded-[28px] bg-white p-7 shadow-[0_18px_40px_rgba(18,61,48,.08)] sm:p-9">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34775e]">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[#183c31]">
          {mode === "login" ? "Sign in to keep learning." : "Start your learning journey."}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#648075]">{activeRole.blurb}</p>

        <div className="mt-6">
          <div className="text-xs font-semibold text-[#527064]">Signing in as</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLES.map((item) => {
              const selected = item.id === role;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold transition",
                    selected
                      ? "bg-[#d8f36a] text-[#133d2f] shadow-[0_4px_0_#0c3428]"
                      : "border border-[#e3e8df] bg-[#fbfcf9] text-[#527064] hover:border-[#99bda8]"
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex gap-1 rounded-2xl bg-[#f6f8f3] p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition",
                mode === item ? "bg-white text-[#25483c] shadow-sm" : "text-[#8aa096] hover:text-[#527064]"
              )}
            >
              {item === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <GoogleButton role={role} enabled={googleEnabled} />
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e7ece4]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aaca2]">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-[#e7ece4]" />
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <Field
              label="Full name"
              icon={User}
              type="text"
              placeholder="Amira Okafor"
              value={name}
              onChange={(event) => { setName(event.target.value); if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: "" })); }}
              error={fieldErrors.name}
              required
              autoComplete="name"
            />
          )}
          <Field
            label="Email address"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => { setEmail(event.target.value); if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: "" })); }}
            error={fieldErrors.email}
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            icon={Lock}
            type="password"
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            value={password}
            onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: "" })); }}
            error={fieldErrors.password}
            required
            minLength={mode === "signup" ? 6 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" && (
            <Field
              label="Confirm password"
              icon={Lock}
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(event) => { setConfirm(event.target.value); if (fieldErrors.confirm) setFieldErrors((current) => ({ ...current, confirm: "" })); }}
              error={fieldErrors.confirm}
              required
              autoComplete="new-password"
            />
          )}

          {mode === "login" && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => toast("Password reset will be available soon.")}
                className="text-xs font-semibold text-[#34775e] hover:text-[#286b51]"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#173f31] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#286b51] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create my account"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#7d958b]">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button onClick={() => setMode("signup")} className="font-semibold text-[#34775e]">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="font-semibold text-[#34775e]">
                Sign in
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setLocation("/admin/login")}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#e3e8df] bg-[#fbfcf9] px-4 py-3 text-xs font-semibold text-[#527064] transition hover:border-[#99bda8] hover:text-[#25483c]"
        >
          <ShieldCheck size={14} /> Administrator? Open the admin console <ArrowUpRight size={13} />
        </button>
      </div>
    </AuthLayout>
  );
}