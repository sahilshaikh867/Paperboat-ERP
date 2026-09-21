'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';

function SuperAdminVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const action = searchParams.get('action') || 'confirm';

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'SUCCESS' | 'REJECTED' | 'ERROR'>('SUCCESS');
  const [message, setMessage] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStatus('ERROR');
      setMessage('Missing cryptographic security token in URL.');
      return;
    }

    async function processVerification() {
      try {
        if (action === 'reject') {
          const res = await api.rejectSuperAdminLogin(token!);
          setStatus('REJECTED');
          setMessage(res.message || 'Login attempt has been successfully rejected and blocked.');
        } else {
          const res = await api.confirmSuperAdminLogin(token!);
          setStatus('SUCCESS');
          setMessage(res.message || 'Login authorization confirmed. Session activated.');
          if (res.user?.fullName) setAdminName(res.user.fullName);
          if (res.jwtToken) {
            sessionStorage.setItem('exam_forge_token', res.jwtToken);
            sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
          }
        }
      } catch (err: any) {
        setStatus('ERROR');
        setMessage(err.message || 'Security token is invalid, expired, or was already consumed (single-use token).');
      } finally {
        setLoading(false);
      }
    }

    processVerification();
  }, [token, action]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-6 selection:bg-purple-600 selection:text-white">
      <Card className="p-8 max-w-md w-full bg-neutral-900/90 border-neutral-800 space-y-6 text-center shadow-2xl">
        {loading && (
          <div className="space-y-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto" />
            <h2 className="text-lg font-bold text-white">Validating Security Authorization...</h2>
            <p className="text-xs text-neutral-400">Verifying single-use cryptographic token with audit log.</p>
          </div>
        )}

        {!loading && status === 'SUCCESS' && (
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-950/60 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Session Activated</h2>
              <p className="text-xs text-neutral-300">{message}</p>
              {adminName && (
                <p className="text-xs text-purple-300 font-semibold pt-1">Welcome, Super Admin {adminName}</p>
              )}
            </div>

            <Button
              onClick={() => router.push('/admin')}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-2"
            >
              <span>Enter Super Admin Control Center</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!loading && status === 'REJECTED' && (
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-amber-950/60 border border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/40">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Login Attempt Denied</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">{message}</p>
            </div>
            <p className="text-[11px] text-neutral-500">
              The pending session has been invalidated and recorded in audit security logs.
            </p>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full border-neutral-800 text-neutral-300 hover:text-white"
            >
              Return to Homepage
            </Button>
          </div>
        )}

        {!loading && status === 'ERROR' && (
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-red-950/60 border border-red-500 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-950/40">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Authorization Link Expired / Dead</h2>
              <p className="text-xs text-red-300 leading-relaxed">{message}</p>
            </div>
            <p className="text-[11px] text-neutral-500">
              For enterprise security, login authorization links are strictly single-use and expire within 10 minutes.
            </p>
            <Button
              onClick={() => router.push('/admin/login')}
              variant="outline"
              className="w-full border-neutral-800 text-neutral-300 hover:text-white"
            >
              Initiate New Login
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function SuperAdminVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <SuperAdminVerifyContent />
    </Suspense>
  );
}
