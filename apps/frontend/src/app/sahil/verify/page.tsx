'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function SahilVerifyContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('req');
  const token = searchParams.get('token');
  const action = searchParams.get('action') as 'approve' | 'deny' | null;

  const [status, setStatus] = useState<'loading' | 'success' | 'rejected' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing your security confirmation...');

  useEffect(() => {
    if (!requestId || !token || !action) {
      setStatus('error');
      setMessage('Invalid or missing security verification parameters.');
      return;
    }

    let isMounted = true;
    api
      .respondSahilLogin(requestId, token, action)
      .then((res) => {
        if (!isMounted) return;
        if (action === 'approve') {
          setStatus('success');
          setMessage(res.message || 'Super Admin login authorization confirmed successfully!');
        } else {
          setStatus('rejected');
          setMessage(res.message || 'Super Admin login request was rejected and blocked.');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(err.message || 'Authorization link has expired or is invalid.');
      });

    return () => {
      isMounted = false;
    };
  }, [requestId, token, action]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 selection:bg-purple-500 selection:text-white">
      <div className="max-w-md w-full rounded-2xl bg-neutral-900/90 border border-neutral-800 p-8 shadow-2xl space-y-6 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-white">Verifying Authorization...</h1>
            <p className="text-sm text-neutral-400">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">Login Authorized</h1>
              <p className="text-sm text-emerald-400 font-medium">{message}</p>
              <p className="text-xs text-neutral-400">
                Your hidden Super Admin session at <span className="font-mono text-purple-300">/sahil</span> has been verified and will automatically proceed.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/admin"
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-600/25"
              >
                Go to Super Admin Console
              </Link>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircle className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">Login Rejected & Blocked</h1>
              <p className="text-sm text-rose-400 font-medium">{message}</p>
              <p className="text-xs text-neutral-400">
                The login attempt has been immediately terminated. If this wasn't you, your credentials may be known to an unauthorized party.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">Verification Failed</h1>
              <p className="text-sm text-amber-400 font-medium">{message}</p>
              <p className="text-xs text-neutral-400">
                This verification link may have expired (10 min TTL) or was already processed.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/sahil"
                className="inline-block py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition border border-neutral-700"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
          <span>ExamForge Cryptographic Zero-Trust Super Admin Guard</span>
        </div>
      </div>
    </div>
  );
}

export default function SahilVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <SahilVerifyContent />
    </Suspense>
  );
}
