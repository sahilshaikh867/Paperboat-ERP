'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  ArrowRight,
  Loader2,
  GraduationCap,
  Briefcase,
} from 'lucide-react';

function ActivateAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token in the URL. Please verify your activation link.');
    }
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.acceptInvitation({
        invitationToken: token,
        password,
        fullName: fullName.trim() || undefined,
      });

      setSuccess('Account activated successfully! Redirecting to your workspace...');
      sessionStorage.setItem('exam_forge_token', res.token);
      sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));

      setTimeout(() => {
        if (res.user.role === 'TEACHER') {
          sessionStorage.setItem('teacher_token', res.token);
          sessionStorage.setItem('teacher_user', JSON.stringify(res.user));
          router.push('/teacher');
        } else if (res.user.role === 'RECRUITER') {
          sessionStorage.setItem('recruiter_token', res.token);
          sessionStorage.setItem('recruiter_user', JSON.stringify(res.user));
          router.push('/recruiter');
        } else {
          router.push('/dashboard');
        }
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to activate account. The invitation link may have expired or already been used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-6 selection:bg-purple-600 selection:text-white">
      <Card className="p-8 max-w-md w-full bg-neutral-900/90 border-neutral-800 space-y-6 shadow-2xl">
        <div className="space-y-1.5 text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 mx-auto mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-white">Activate Your Staff Account</h2>
          <p className="text-xs text-neutral-400">
            Set your secure password to complete your institutional onboarding.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {!token ? (
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-neutral-800 text-neutral-300 hover:text-white"
          >
            Return to Homepage
          </Button>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-400">Your Full Name (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. Dr. Alan Turing"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-neutral-950 border-neutral-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-400">Create Password (min. 8 chars)</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-neutral-950 border-neutral-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-400">Confirm Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-neutral-950 border-neutral-800 text-white text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Activate Account & Access Workspace</span>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <ActivateAccountContent />
    </Suspense>
  );
}
