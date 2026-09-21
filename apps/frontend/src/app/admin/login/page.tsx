'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ThemeToggle from '@/components/ThemeToggle';
import PaperboatLogo from '@/components/PaperboatLogo';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCw,
  Lock,
  Info,
} from 'lucide-react';

function SuperAdminLoginContent() {
  const router = useRouter();

  const [email, setEmail] = useState('examforge.superadmin@gmail.com');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [showEmailNotice, setShowEmailNotice] = useState(false);

  // Cooldown countdown for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Step 1: Send OTP to default email
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccessMsg(null);

    try {
      await api.superAdminSendOtp(email);
      setStep('OTP');
      setCooldown(30);
      setSuccessMsg(`A 6-digit security OTP code has been dispatched to ${email}. Please check your inbox.`);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch OTP code');
    } finally {
      setLoading(false);
    }
  }

  // Handle Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) return;

    setError(null);
    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await api.superAdminVerifyOtp(email, cleanOtp);

      if (res.token) {
        sessionStorage.setItem('exam_forge_token', res.token);
        if (res.user) sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
        setSuccessMsg('Authentication verified! Loading Admin Control Center...');
        setTimeout(() => {
          router.push('/admin');
        }, 500);
      } else {
        setError('Authentication failed: No session token returned.');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col justify-between p-4 sm:p-6 relative font-sans transition-colors">
      {/* Top Bar Navigation */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link href="/">
          <PaperboatLogo variant="full" />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-xs text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white">
              Role Gateway
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="w-full max-w-sm mx-auto space-y-5 my-8">
        {/* Simple Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Super Administrator Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Cryptographic Zero-Trust 2FA OTP Verification
          </p>
        </div>

        {/* Clean Login Card */}
        <Card className="p-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl rounded-2xl space-y-4">
          {/* Status Banners */}
          {error && (
            <div className="text-xs bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Policy Notice if requested to change email */}
          {showEmailNotice && (
            <div className="text-[11px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 p-3 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Authorized Super Admin:</strong> The active Super Admin email is{' '}
                <span className="font-mono font-semibold">examforge.superadmin@gmail.com</span>.
              </div>
            </div>
          )}

          {/* STEP 1: Email Form */}
          {step === 'EMAIL' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-purple-600" />
                    <span>Administrator Email</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Super Admin
                  </span>
                </div>

                <div className="relative">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-10 bg-slate-50 dark:bg-neutral-800/80 border-slate-300 dark:border-neutral-700 font-mono text-slate-800 dark:text-neutral-200 select-all rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-400 dark:text-neutral-500">
                  <span>Authorized Administrator Access</span>
                  <button
                    type="button"
                    onClick={() => setShowEmailNotice((prev) => !prev)}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                  >
                    Change email?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs font-semibold h-10 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 rounded-xl"
              >
                {loading ? (
                  <span>Dispatching OTP...</span>
                ) : (
                  <>
                    <span>Send Security OTP</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* STEP 2: OTP Verification Form */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 dark:border-neutral-800">
                <span className="text-slate-500 dark:text-neutral-400 truncate max-w-[210px] font-mono">
                  {email}
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium">
                  OTP Sent
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300 block text-center">
                  Enter 6-Digit Code
                </label>
                <Input
                  required
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-center font-mono text-xl tracking-[0.35em] font-bold h-12 bg-slate-50 dark:bg-neutral-950 border-purple-300 dark:border-purple-700 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className="w-full text-xs font-semibold h-10 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 rounded-xl"
              >
                {loading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Verify & Enter Dashboard</span>
                  </>
                )}
              </Button>

              {/* Resend Link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1.5 font-medium"
                >
                  <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* Security Footer */}
        <p className="text-center text-[11px] text-slate-400 dark:text-neutral-500">
          Super Admin login strictly requires OTP. Passwords are not used.
        </p>
      </div>

      <footer className="border-t border-slate-200 dark:border-neutral-800/80 py-4 text-center text-xs text-slate-500 dark:text-neutral-500">
        &copy; {new Date().getFullYear()} Paperboat Education Systems Inc. All rights reserved. Powered by Paperboat ERP & ExamForge Engine.
      </footer>
    </main>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <SuperAdminLoginContent />
    </Suspense>
  );
}

