'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SystemAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center text-xs text-slate-400">
      Redirecting to Super Admin Control Center...
    </div>
  );
}
