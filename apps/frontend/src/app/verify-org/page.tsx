'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Award,
  KeyRound,
  Check,
} from 'lucide-react';
import Link from 'next/link';

function VerifyOrgContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const typeParam = searchParams.get('type');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(8);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState(false);

  const [orgData, setOrgData] = useState<{
    orgName: string;
    orgType: 'COMPANY' | 'COLLEGE';
    officialEmail: string;
  } | null>(null);

  const hasCalledRef = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage('Missing organization verification token in link.');
      return;
    }

    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

    let isMounted = true;
    api
      .verifyOrganization(token)
      .then((res) => {
        if (!isMounted) return;
        setSuccess(true);
        setOrgData({
          orgName: res.orgName,
          orgType: res.orgType,
          officialEmail: res.officialEmail,
        });
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setErrorMessage(err.message || 'This verification link is invalid, has expired, or has already been used.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Countdown timer for automatic redirect
  useEffect(() => {
    if (!success || autoRedirectPaused) return;

    if (countdown <= 0) {
      const isCompany = (orgData?.orgType || typeParam) === 'company' || (orgData?.orgType || typeParam) === 'COMPANY';
      router.push(isCompany ? '/recruiter' : '/teacher');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [success, countdown, autoRedirectPaused, orgData, typeParam, router]);

  const isCompany = (orgData?.orgType || typeParam) === 'company' || (orgData?.orgType || typeParam) === 'COMPANY';
  const targetLoginPath = isCompany ? '/recruiter' : '/teacher';
  const portalName = isCompany ? 'Recruiter Login' : 'Teacher Login';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Background Ambient Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-emerald-600/20 via-blue-600/10 to-purple-600/20 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        <div className="rounded-3xl bg-neutral-900/90 border border-neutral-800 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden text-center">
          {/* Top subtle highlight */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-gradient-to-r ${
              isCompany ? 'from-transparent via-blue-500 to-transparent' : 'from-transparent via-emerald-500 to-transparent'
            }`}
          />

          {/* STATE 1: LOADING */}
          {loading && (
            <div className="space-y-6 py-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" />
                <div className="relative h-20 w-20 rounded-2xl bg-neutral-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50">
                  <Loader2 className="h-10 w-10 animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-black text-white tracking-tight">Authenticating Affiliation...</h1>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Validating your cryptographic verification link against platform records.
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: SUCCESS WITH CELEBRATORY ANIMATIONS */}
          {!loading && success && orgData && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
              {/* Animated Icon with Pulsing Halo */}
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                {/* Ripple 1 */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
                {/* Ripple 2 */}
                <div className="absolute -inset-2 rounded-full border border-emerald-500/30 animate-pulse" />
                {/* Center Badge */}
                <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-600/40 transform transition-transform hover:scale-105">
                  <CheckCircle2 className="h-11 w-11 drop-shadow-md" />
                </div>
              </div>

              {/* Header Title */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>SUCCESSFULLY VERIFIED</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {isCompany ? 'Company Affiliation Confirmed!' : 'College Affiliation Confirmed!'}
                </h1>
                <p className="text-sm font-semibold text-emerald-400">{orgData.orgName}</p>
              </div>

              {/* Key Credentials Notice */}
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-left space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <KeyRound className="h-4 w-4 text-emerald-400" />
                  <span>Credentials & Organization Verified</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Your official entity email <span className="font-mono text-emerald-300 font-semibold">{orgData.officialEmail}</span> has been authenticated.
                </p>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[12px] text-neutral-200 space-y-1">
                  <span className="font-bold text-white block">Next Step:</span>
                  <p className="text-neutral-300">
                    Go back to your <strong>{portalName}</strong> page and sign in using your registered personal email and password to access your workspace.
                  </p>
                </div>
              </div>

              {/* Primary Call to Action Button */}
              <div className="space-y-3 pt-1">
                <Link
                  href={targetLoginPath}
                  className={`w-full py-3.5 px-5 rounded-2xl text-white font-bold text-sm transition-all duration-300 shadow-xl flex items-center justify-center gap-2 group ${
                    isCompany
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  <span>Go to {portalName} & Sign In</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* Auto Redirect Countdown */}
                <div className="text-[11px] text-neutral-400 flex items-center justify-center gap-2 font-mono">
                  <span>Redirecting automatically in {countdown}s...</span>
                  <button
                    type="button"
                    onClick={() => setAutoRedirectPaused(true)}
                    className="underline text-neutral-300 hover:text-white"
                  >
                    Pause
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: ERROR */}
          {!loading && errorMessage && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="h-20 w-20 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/40">
                <XCircle className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-black text-white">Verification Failed</h1>
                <p className="text-xs text-rose-300 font-medium leading-relaxed">{errorMessage}</p>
                <p className="text-[11px] text-neutral-500">
                  This link may have expired (24 hour TTL) or was already confirmed.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={targetLoginPath}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition border border-neutral-700 block"
                >
                  Return to {portalName}
                </Link>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-6 mt-6 border-t border-neutral-800/80 text-[11px] text-neutral-500 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>ExamForge Zero-Trust Institution Verifier</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOrgPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <VerifyOrgContent />
    </Suspense>
  );
}
