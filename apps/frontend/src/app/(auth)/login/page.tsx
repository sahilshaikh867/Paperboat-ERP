'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ThemeToggle';
import PaperboatLogo from '@/components/PaperboatLogo';
import {
  Code2,
  Mail,
  Lock,
  Sparkles,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  User,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: OTP (Student Only) vs PASSWORD (Staff & Registered Users)
  const [authMode, setAuthMode] = useState<'OTP' | 'PASSWORD'>('OTP');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [examSecretInfo, setExamSecretInfo] = useState<{ secretCode: string; examTitle: string } | null>(null);

  // Loading & Alerts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Google Login Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check URL params for direct password reset link
  useEffect(() => {
    const mode = searchParams.get('mode');
    const resetEmail = searchParams.get('email');
    const resetCode = searchParams.get('code');

    if (mode === 'reset' && resetEmail) {
      setForgotEmail(resetEmail);
      if (resetCode) {
        setResetToken(resetCode);
        setForgotStep(2);
      }
      setShowForgotModal(true);
    }
  }, [searchParams]);

  function routeByRole(role?: string, orgType?: string) {
    if (role === 'SUPER_ADMIN') {
      router.push('/admin');
    } else if (role === 'ORG_ADMIN') {
      if (orgType === 'COMPANY') {
        router.push('/company');
      } else {
        router.push('/college');
      }
    } else if (role === 'TEACHER') {
      router.push('/teacher');
    } else if (role === 'RECRUITER') {
      router.push('/recruiter');
    } else {
      router.push('/student');
    }
  }

  // Request 6-digit OTP & Exam Secret Code (Strictly for Students/Candidates)
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(email);
      setOtpSent(true);
      setSuccessMsg(`2 Separate Emails Dispatched via SMTP to ${email}!`);
      if (res.previewOtp) {
        setPreviewOtp(res.previewOtp);
        setOtp(res.previewOtp); // Pre-fill in development for fast testing
      }
      if (res.examSecretCode) {
        setExamSecretInfo({
          secretCode: res.examSecretCode,
          examTitle: res.examTitle || 'Assigned Technical Assessment',
        });
        sessionStorage.setItem('candidate_exam_secret_code', res.examSecretCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  }

  // Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !otp) return;

    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(email, otp);
      sessionStorage.setItem('exam_forge_token', res.token);
      localStorage.setItem('token', res.token);
      if (res.user) {
        sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      routeByRole(res.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  }

  // Staff / Password Login
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.requiresApproval) {
        setSuccessMsg(res.message || 'Security confirmation email dispatched. Please approve to activate session.');
        return;
      }
      if (res.token) {
        sessionStorage.setItem('exam_forge_token', res.token);
        localStorage.setItem('token', res.token);
        if (res.user) {
          sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        routeByRole(res.user?.role, res.user?.organization?.type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  }

  // 1-Click Role Presets
  async function handlePresetLogin(presetEmail: string, presetPassword = 'Password@123') {
    setEmail(presetEmail);
    setPassword(presetPassword);
    setAuthMode('PASSWORD');
    setError(null);
    setLoading(true);
    try {
      let res;
      try {
        res = await api.login(presetEmail, presetPassword);
      } catch {
        res = await api.login(presetEmail, 'password12345');
      }
      if (res.requiresApproval) {
        setSuccessMsg(res.message || 'Security confirmation email dispatched.');
        return;
      }
      if (res.token) {
        sessionStorage.setItem('exam_forge_token', res.token);
        localStorage.setItem('token', res.token);
        if (res.user) {
          sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        routeByRole(res.user?.role, res.user?.organization?.type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preset login failed');
    } finally {
      setLoading(false);
    }
  }

  // Google Sign-In Handler
  async function handleGoogleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!googleEmail) return;

    setGoogleLoading(true);
    setError(null);
    try {
      const res = await api.googleLogin({
        email: googleEmail,
        fullName: googleFullName || googleEmail.split('@')[0],
        googleId: `google-oauth-${Date.now()}`,
      });
      sessionStorage.setItem('exam_forge_token', res.token);
      setShowGoogleModal(false);
      routeByRole(res.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  // Quick One-Click Google Login (Alex Google Account)
  async function handleQuickGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await api.googleLogin({
        email: 'alex.rivera.google@gmail.com',
        fullName: 'Alex Rivera (Google SSO)',
        googleId: 'google-oauth-demo-alex-2026',
      });
      sessionStorage.setItem('exam_forge_token', res.token);
      setShowGoogleModal(false);
      routeByRole(res.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  // Forgot Password: Step 1 Request Code
  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    setForgotError(null);
    try {
      await api.forgotPassword(forgotEmail);
      setForgotStep(2);
      setResetToken('');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to request reset code');
    } finally {
      setForgotLoading(false);
    }
  }

  // Forgot Password: Step 2 Submit New Password
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail || !resetToken || !newPassword) return;

    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await api.resetPassword({
        email: forgotEmail,
        token: resetToken,
        newPassword,
      });
      sessionStorage.setItem('exam_forge_token', res.token);
      setShowForgotModal(false);
      setSuccessMsg('Password updated successfully! Logging you in...');
      routeByRole(res.user?.role);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 relative transition-colors duration-200 font-sans">
      {/* Top Floating Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <PaperboatLogo size="lg" variant="full" />
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Sign in to access your role-specific dashboard & assessments
          </p>
        </div>

        {/* Tab Toggle: Student Email OTP vs Staff Password */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-xs font-semibold shadow-inner">
          <button
            type="button"
            onClick={() => {
              setAuthMode('OTP');
              setError(null);
            }}
            className={`py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              authMode === 'OTP'
                ? 'bg-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Student Email Access</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('PASSWORD');
              setError(null);
            }}
            className={`py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              authMode === 'PASSWORD'
                ? 'bg-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Staff / Admin Sign In</span>
          </button>
        </div>

        <Card className="p-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-5 shadow-xl backdrop-blur-md rounded-2xl">
          {error && (
            <div className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-3 rounded-lg flex items-start gap-2 animate-fadeIn">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: STUDENT EMAIL AUTHENTICATION (STRICTLY FOR CANDIDATES) */}
          {authMode === 'OTP' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-[11px] text-indigo-700 dark:text-indigo-300">
                🎓 <strong>Student Examination Portal:</strong> Enter your candidate email to receive your 6-digit login passcode and assessment secret unlock code via SMTP.
              </div>

              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Student / Candidate Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="candidate@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-50 dark:bg-neutral-950 border-slate-300 dark:border-neutral-800"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-neutral-500">
                      Dispatches Email 1 (Login OTP) and Email 2 (Assigned Exam Passcode) to your inbox.
                    </p>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full text-xs font-bold h-10 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
                    {loading ? 'Sending Emails...' : 'Send Login OTP & Exam Code →'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                        Enter 6-Digit Email Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setPreviewOtp(null);
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        Change email
                      </button>
                    </div>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="662354"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      className="bg-slate-50 dark:bg-neutral-950 border-slate-300 dark:border-neutral-800 text-center text-lg tracking-widest font-mono font-bold"
                    />

                    {/* Dual Email Dispatch Badges */}
                    <div className="space-y-2 pt-1">
                      {previewOtp && (
                        <div className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-800 dark:text-indigo-300 p-2.5 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span><strong>Email 1:</strong> Verification OTP:</span>
                          </div>
                          <strong className="font-mono text-indigo-700 dark:text-white text-xs bg-white dark:bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-600">
                            {previewOtp}
                          </strong>
                        </div>
                      )}

                      {examSecretInfo && (
                        <div className="text-[11px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div>
                              <span><strong>Email 2:</strong> Exam Secret Code:</span>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 truncate max-w-[170px]">{examSecretInfo.examTitle}</div>
                            </div>
                          </div>
                          <strong className="font-mono text-emerald-700 dark:text-white text-xs bg-white dark:bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-600">
                            {examSecretInfo.secretCode}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full text-xs font-bold h-10 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
                    {loading ? 'Verifying...' : 'Verify OTP & Launch Student Dashboard'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: STAFF & ADMIN PASSWORD SIGN IN */}
          {authMode === 'PASSWORD' && (
            <div className="space-y-4">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-50 dark:bg-neutral-950 border-slate-300 dark:border-neutral-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotStep(1);
                        setForgotError(null);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-50 dark:bg-neutral-950 border-slate-300 dark:border-neutral-800"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full text-xs font-bold h-10 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
                  {loading ? 'Authenticating...' : 'Sign In with Password'}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-neutral-800" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-neutral-800" />
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={() => {
                  setGoogleEmail('');
                  setGoogleFullName('');
                  setShowGoogleModal(true);
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white hover:bg-slate-50 dark:bg-neutral-950 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-100 text-xs font-bold transition shadow-sm"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* 1-Click Role Presets */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 space-y-2.5">
            <div className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider text-center">
              1-Click Instant Role Presets (PostgreSQL DB)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePresetLogin('college.admin@stanford.edu')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 transition"
              >
                <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                <div className="truncate">
                  <div className="font-bold">College Admin</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">Dr. Mitchell (Stanford)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('teacher@example.com')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-teal-600 dark:text-teal-400 transition"
              >
                <GraduationCap className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-500" />
                <div className="truncate">
                  <div className="font-bold">Class Teacher</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">Prof. Reynolds (TE-A)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('rahul.teacher@stanford.edu')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-indigo-600 dark:text-indigo-400 transition"
              >
                <GraduationCap className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-500" />
                <div className="truncate">
                  <div className="font-bold">Subject Teacher</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">Prof. Sharma (CS501)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('company.admin@acme.corp')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-blue-600 dark:text-blue-400 transition"
              >
                <Briefcase className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-500" />
                <div className="truncate">
                  <div className="font-bold">Company Admin</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">Acme Corporation</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('recruiter@example.com')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-cyan-600 dark:text-cyan-400 transition"
              >
                <Briefcase className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-500" />
                <div className="truncate">
                  <div className="font-bold">Recruiter</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">Candidate Screening</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('devopsbysahil@gmail.com')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-purple-600 dark:text-purple-400 transition"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-500" />
                <div className="truncate">
                  <div className="font-bold">Super Admin</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">devopsbysahil</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('candidate@example.com')}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left text-xs font-medium text-amber-600 dark:text-amber-400 transition"
              >
                <User className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <div className="truncate">
                  <div className="font-bold">Student / Candidate</div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">Exam Workbench</div>
                </div>
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-500 dark:text-neutral-400">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition">
            ← Return to Homepage
          </Link>
        </p>
      </div>

      {/* MODAL: FORGOT & RESET PASSWORD */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-neutral-800 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {forgotStep === 1 ? 'Reset Account Password' : 'Enter Reset Code & New Password'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    PostgreSQL DB-Backed & SMTP Dispatched
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {forgotError && (
              <div className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg">
                {forgotError}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Account Email Address
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    We will send a 6-digit security reset passcode to this email address.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={forgotLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Password Reset Code →'}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    6-Digit Security Reset Code
                  </label>
                  <Input
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="font-mono font-bold tracking-widest text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    New Password (min. 8 characters)
                  </label>
                  <Input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowForgotModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={forgotLoading}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                    >
                      {forgotLoading ? 'Updating...' : 'Update Password & Sign In'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* MODAL: GOOGLE ACCOUNT SIGN IN */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-neutral-800 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Sign in with Google
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-400">
              Sign in or create a linked Exam-Forge profile using your Google identity.
            </p>

            {/* Quick 1-Click Google Account Option */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  AR
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Alex Rivera</div>
                  <div className="text-[10px] text-slate-500">alex.rivera.google@gmail.com</div>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={googleLoading}
                onClick={handleQuickGoogleLogin}
                className="text-xs px-3 py-1.5 h-8 bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                {googleLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-neutral-800" />
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase font-semibold">
                Or use custom Google email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-neutral-800" />
            </div>

            <form onSubmit={handleGoogleLoginSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Google Email Address
                </label>
                <Input
                  required
                  type="email"
                  placeholder="your.account@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Full Name (Optional)
                </label>
                <Input
                  placeholder="Your Full Name"
                  value={googleFullName}
                  onChange={(e) => setGoogleFullName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowGoogleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={googleLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  {googleLoading ? 'Signing In...' : 'Continue with Google'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 dark:text-neutral-500 space-y-1">
        <div>&copy; {new Date().getFullYear()} Paperboat Education Systems Inc. All rights reserved.</div>
        <div className="text-[11px] text-slate-500 dark:text-neutral-600">
          Powered by Paperboat ERP & ExamForge Engine
        </div>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
