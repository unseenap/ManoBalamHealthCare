import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, resetPassword } from "../api/auth.api";
import { passwordResetError } from "../api/passwordResetError";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(
    typeof location.state?.email === "string" ? location.state.email : "",
  );
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Use at least one uppercase letter and one number in your password.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), otp, password);
      toast.success("Password reset successfully. Please log in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(passwordResetError(error, "Unable to reset your password. Please try again; request a new code if needed."));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setSending(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setOtp("");
      toast.success("If an active account exists for that email, a new code has been sent. Use the latest code.");
    } catch (error) {
      toast.error(passwordResetError(error, "Unable to send a reset code. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-violet-50/40 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-violet-100 bg-white p-8 shadow-xl">
        <BrandLogo className="mx-auto" />
        <h1 className="mt-8 text-center text-2xl font-black">Enter your reset code</h1>
        <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-center text-sm leading-6 text-emerald-800">
          If an active account exists for your email, a six-digit code has been sent. Check your inbox and spam folder. Codes expire in five minutes.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium" htmlFor="reset-email">Account email
            <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setOtp(""); }} placeholder="email@example.com" className="h-12" disabled={loading || sending} />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="reset-otp">Six-digit code
            <Input id="reset-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="h-12 tracking-[0.4em]" disabled={loading || sending} />
          </label>
          <p className="text-sm text-slate-500" id="password-requirements">Use at least eight characters, one uppercase letter, and one number.</p>
          <label className="grid gap-2 text-sm font-medium" htmlFor="reset-password">New password
            <Input id="reset-password" type="password" autoComplete="new-password" aria-describedby="password-requirements" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12" disabled={loading || sending} />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="reset-confirm-password">Confirm new password
            <Input id="reset-confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12" disabled={loading || sending} />
          </label>
          <Button disabled={loading || sending} className="h-12 rounded-xl">{loading ? "Updating..." : "Update password"}</Button>
          <Button type="button" variant="outline" disabled={loading || sending || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onClick={resend} className="h-12 rounded-xl">{sending ? "Sending..." : "Send a new code"}</Button>
        </form>
        <Link to="/login" className="mt-6 block text-center text-sm font-bold text-primary hover:underline">Back to login</Link>
      </section>
    </main>
  );
}
