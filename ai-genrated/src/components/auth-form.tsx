"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";

export function AuthForm({
  mode,
  redirectUrl: explicitRedirectUrl,
}: {
  mode: "login" | "register";
  redirectUrl?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode & Tabs
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");

  // General state
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP Verification state
  const [otpStep, setOtpStep] = useState<"input" | "verify">("input");
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [resendingWhatsapp, setResendingWhatsapp] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clean error on field change
  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const getCleanPhone = (val: string) => val.replace(/^(?:\+91|91|0)/, "").replace(/\D/g, "");

  // Determine redirection target safely
  const getRedirectTarget = (userRole?: string) => {
    let redirectParam = explicitRedirectUrl;
    if (!redirectParam && searchParams) {
      try {
        redirectParam = searchParams.get("redirect") || undefined;
      } catch {}
    }

    const isValidRedirect =
      typeof redirectParam === "string" &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//");

    return (isValidRedirect && redirectParam)
      ? redirectParam
      : userRole === "admin" || userRole === "super_admin"
      ? "/admin"
      : "/";
  };

  const navigateToTarget = (userRole?: string) => {
    const target = getRedirectTarget(userRole);
    if (typeof window !== "undefined") {
      window.location.href = target;
    } else {
      router.push(target);
    }
  };

  // 1. Send OTP for Login or Registration
  async function handleSendOtp(trigger: "login" | "register") {
    setError("");
    setFieldErrors({});
    const cleanPhone = getCleanPhone(phone);

    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFieldErrors({ phone: "Please enter a valid 10-digit Indian mobile number." });
      return;
    }

    if (trigger === "register") {
      const errs: Record<string, string> = {};
      if (!name.trim() || name.trim().length < 2) {
        errs.name = "Full name must be at least 2 characters.";
      }
      if (!email.trim() || !email.includes("@")) {
        errs.email = "Please enter a valid email address.";
      }
      if (!password || password.length < 6) {
        errs.password = "Password must be at least 6 characters.";
      }
      if (password !== confirmPassword) {
        errs.confirmPassword = "Passwords do not match.";
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone, trigger }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send OTP. Please try again.");
        return;
      }

      setOtpStep("verify");
      setResendTimer(60);
      if (data.devOtp) setDevOtp(data.devOtp);
      if (data.isSimulated) setIsSimulated(true);
      setSuccessMsg(`Verification code sent to +91 ${cleanPhone}`);
    } catch {
      setError("Network error while sending verification OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Resend via WhatsApp
  async function handleResendWhatsApp(trigger: "login" | "register") {
    const cleanPhone = getCleanPhone(phone);
    if (!cleanPhone) return;

    setResendingWhatsapp(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone, trigger }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend via WhatsApp.");
        return;
      }

      setSuccessMsg(`Verification code resent via WhatsApp to +91 ${cleanPhone}`);
      setResendTimer(60);
      if (data.devOtp) setDevOtp(data.devOtp);
    } catch {
      setError("Failed to reach WhatsApp service. Please try again.");
    } finally {
      setResendingWhatsapp(false);
    }
  }

  // 3. Verify OTP for Login
  async function handleVerifyLoginOtp(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const cleanPhone = getCleanPhone(phone);
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length < 4 || cleanOtp.length > 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone, userOtp: cleanOtp, trigger: "login" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid OTP code. Please try again.");
        return;
      }

      setSuccessMsg("✓ Verification successful! Starting your session...");
      navigateToTarget(data.user?.role);
    } catch {
      setError("Verification failed due to a network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 4. Verify OTP for Registration & Create Account
  async function handleVerifyRegister(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const cleanPhone = getCleanPhone(phone);
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length < 4 || cleanOtp.length > 6) {
      setError("Please enter the 6-digit verification code sent to your mobile.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
          if (
            data.fields.name ||
            data.fields.email ||
            data.fields.password ||
            data.fields.confirmPassword ||
            data.fields.phone
          ) {
            setOtpStep("input");
          }
        }
        setError(data.error || "Registration failed. Please check your details.");
        return;
      }

      setSuccessMsg("✓ Account created & phone verified! Redirecting...");
      navigateToTarget(data.user?.role);
    } catch {
      setError("Registration failed due to a network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 5. Standard Password Login (Legacy & Admin fallback)
  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.fields) {
          setFieldErrors(data.fields);
        } else {
          setError(data?.error || "Invalid email or password. Please try again.");
        }
        return;
      }

      setSuccessMsg("✓ Welcome back! Signing you in...");
      navigateToTarget(data?.user?.role);
    } catch {
      setError("Sign in failed. Please check your network and credentials.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // RENDER: LOGIN FLOW
  // ==========================================
  if (mode === "login") {
    return (
      <div className="mithai-card mt-8 rounded-3xl p-6 shadow-sm border border-[#6b1d1d]/10">
        {/* Login Method Tabs */}
        <div className="flex rounded-2xl bg-[#6b1d1d]/5 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginMethod("otp");
              setError("");
              setOtpStep("input");
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              loginMethod === "otp"
                ? "bg-white text-[#6b1d1d] shadow-sm border border-[#6b1d1d]/10"
                : "text-[#2a1a12]/60 hover:text-[#6b1d1d]"
            }`}
          >
            <span>📱</span> Mobile OTP Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("password");
              setError("");
              setOtpStep("input");
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              loginMethod === "password"
                ? "bg-white text-[#6b1d1d] shadow-sm border border-[#6b1d1d]/10"
                : "text-[#2a1a12]/60 hover:text-[#6b1d1d]"
            }`}
          >
            <span>🔑</span> Password Login
          </button>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            {successMsg}
          </div>
        )}

        {/* Development Helper Badge */}
        {devOtp && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <span className="font-bold">🧪 Test Simulation OTP:</span>{" "}
            <code className="rounded bg-amber-200 px-1.5 py-0.5 font-mono font-bold tracking-widest text-amber-950">
              {devOtp}
            </code>{" "}
            <span className="text-[11px] text-amber-800">(Fast2SMS Quick Route Simulation)</span>
          </div>
        )}

        {/* TAB 1: MOBILE OTP LOGIN */}
        {loginMethod === "otp" && (
          <div>
            {otpStep === "input" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendOtp("login");
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-[#6b1d1d] mb-1">
                    Mobile Phone Number
                  </label>
                  <div className="relative flex rounded-2xl border border-[#6b1d1d]/15 bg-white focus-within:border-[#c45c26] focus-within:ring-2 focus-within:ring-[#c45c26]/20">
                    <span className="inline-flex items-center px-3.5 border-r border-[#6b1d1d]/10 text-xs font-bold text-[#6b1d1d] bg-[#faf8f5] rounded-l-2xl">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError("phone");
                      }}
                      placeholder="98765 43210"
                      maxLength={10}
                      required
                      autoFocus
                      className="w-full rounded-r-2xl px-3 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.phone}</p>
                  )}
                  <p className="text-[11px] text-[#2a1a12]/50 mt-1.5">
                    We will send a 6-digit verification code to this mobile number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full rounded-full py-3 text-sm font-semibold shadow-sm transition"
                >
                  {loading ? "Sending OTP..." : "Send Verification OTP 🚀"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#2a1a12]/70 bg-[#faf8f5] p-3 rounded-2xl border border-[#6b1d1d]/10">
                  <div>
                    <span className="text-[11px] text-[#2a1a12]/50 block">Code sent to:</span>
                    <span className="font-bold text-[#6b1d1d]">+91 {getCleanPhone(phone)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("input");
                      setOtpCode("");
                      setError("");
                      setDevOtp(null);
                    }}
                    className="text-xs font-semibold text-[#c45c26] hover:underline"
                  >
                    Change Number
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6b1d1d] mb-1">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-2xl border border-[#6b1d1d]/20 px-3 py-3 bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
                  />
                  <p className="text-[11px] text-[#2a1a12]/50 text-center mt-1">
                    Valid for 5 minutes
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 4}
                  className="btn-primary w-full rounded-full py-3 text-sm font-semibold shadow-sm transition"
                >
                  {loading ? "Verifying..." : "Verify OTP & Sign In 🔐"}
                </button>

                {/* Resend Options */}
                <div className="pt-2 flex flex-col gap-2 text-center text-xs">
                  {resendTimer > 0 ? (
                    <span className="text-[#2a1a12]/60">
                      Resend SMS OTP in <strong className="text-[#6b1d1d]">{resendTimer}s</strong>
                    </span>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSendOtp("login")}
                        disabled={loading}
                        className="font-semibold text-[#c45c26] hover:underline"
                      >
                        Resend via SMS
                      </button>
                      <span className="text-[#2a1a12]/20">|</span>
                      <button
                        type="button"
                        onClick={() => handleResendWhatsApp("login")}
                        disabled={resendingWhatsapp}
                        className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <span>💬</span> {resendingWhatsapp ? "Sending..." : "Resend via WhatsApp"}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: PASSWORD LOGIN */}
        {loginMethod === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6b1d1d] mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                required
                placeholder="patron@vardayini.com"
                className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3.5 py-2.5 text-sm bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6b1d1d] mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3.5 py-2.5 text-sm bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full rounded-full py-3 text-sm font-semibold shadow-sm transition"
            >
              {loading ? "Signing in..." : "Login with Password"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: REGISTER FLOW (OTP VERIFIED)
  // ==========================================
  return (
    <div className="mithai-card mt-8 rounded-3xl p-6 shadow-sm border border-[#6b1d1d]/10">
      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-[#6b1d1d]/10 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#6b1d1d]">
          {otpStep === "input" ? "Step 1 of 2: Customer Details" : "Step 2 of 2: Verify Mobile OTP"}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
          Fast2SMS Verified
        </span>
      </div>

      {/* Global Feedback Banners */}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Development Helper Badge */}
      {devOtp && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-bold">🧪 Test Simulation OTP:</span>{" "}
          <code className="rounded bg-amber-200 px-1.5 py-0.5 font-mono font-bold tracking-widest text-amber-950">
            {devOtp}
          </code>{" "}
          <span className="text-[11px] text-amber-800">(Fast2SMS Quick Route Simulation)</span>
        </div>
      )}

      {otpStep === "input" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendOtp("register");
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-[#6b1d1d] mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              required
              placeholder="e.g. Anandbhai Patel"
              className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3.5 py-2.5 text-sm bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6b1d1d] mb-1">
              Mobile Phone Number
            </label>
            <div className="relative flex rounded-2xl border border-[#6b1d1d]/15 bg-white focus-within:border-[#c45c26] focus-within:ring-2 focus-within:ring-[#c45c26]/20">
              <span className="inline-flex items-center px-3.5 border-r border-[#6b1d1d]/10 text-xs font-bold text-[#6b1d1d] bg-[#faf8f5] rounded-l-2xl">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError("phone");
                }}
                placeholder="98765 43210"
                maxLength={10}
                required
                className="w-full rounded-r-2xl px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
            {fieldErrors.phone && (
              <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.phone}</p>
            )}
            <p className="text-[11px] text-[#2a1a12]/50 mt-1">
              We will send a 6-digit SMS verification code to this mobile.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6b1d1d] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              required
              placeholder="anand@example.com"
              className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3.5 py-2.5 text-sm bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6b1d1d] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                required
                placeholder="Min 6 characters"
                className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3.5 py-2.5 text-sm bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6b1d1d] mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                required
                placeholder="Repeat password"
                className="w-full rounded-2xl border border-[#6b1d1d]/15 px-3.5 py-2.5 text-sm bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1 ml-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full rounded-full py-3 text-sm font-semibold shadow-sm transition mt-2"
          >
            {loading ? "Sending OTP..." : "Continue to Mobile Verification 📲"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyRegister} className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#2a1a12]/70 bg-[#faf8f5] p-3 rounded-2xl border border-[#6b1d1d]/10">
            <div>
              <span className="text-[11px] text-[#2a1a12]/50 block">Verifying Mobile:</span>
              <span className="font-bold text-[#6b1d1d]">+91 {getCleanPhone(phone)}</span>
              <span className="text-[11px] text-[#2a1a12]/60 block mt-0.5">({name})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOtpStep("input");
                setOtpCode("");
                setError("");
                setDevOtp(null);
              }}
              className="text-xs font-semibold text-[#c45c26] hover:underline"
            >
              Edit Details
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6b1d1d] mb-1">
              Enter 6-Digit Verification Code
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • • • •"
              maxLength={6}
              required
              autoFocus
              className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-2xl border border-[#6b1d1d]/20 px-3 py-3 bg-white focus:border-[#c45c26] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/20"
            />
            <p className="text-[11px] text-[#2a1a12]/50 text-center mt-1">
              Valid for 5 minutes
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length < 4}
            className="btn-primary w-full rounded-full py-3 text-sm font-semibold shadow-sm transition"
          >
            {loading ? "Verifying..." : "Verify OTP & Complete Registration 🎉"}
          </button>

          {/* Resend Options */}
          <div className="pt-2 flex flex-col gap-2 text-center text-xs">
            {resendTimer > 0 ? (
              <span className="text-[#2a1a12]/60">
                Resend SMS OTP in <strong className="text-[#6b1d1d]">{resendTimer}s</strong>
              </span>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSendOtp("register")}
                  disabled={loading}
                  className="font-semibold text-[#c45c26] hover:underline"
                >
                  Resend via SMS
                </button>
                <span className="text-[#2a1a12]/20">|</span>
                <button
                  type="button"
                  onClick={() => handleResendWhatsApp("register")}
                  disabled={resendingWhatsapp}
                  className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>💬</span> {resendingWhatsapp ? "Sending..." : "Resend via WhatsApp"}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

