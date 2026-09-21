'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ExamAttemptResult, ProctorAuditData } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  User,
  Activity,
  Terminal,
  FileCode2,
  ExternalLink,
} from 'lucide-react';

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState<string>('Assessment Results');
  const [attempts, setAttempts] = useState<ExamAttemptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<ProctorAuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('exam_forge_token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    loadResults(storedToken, examId);
  }, [examId, router]);

  async function loadResults(authToken: string, id: string) {
    try {
      setLoading(true);
      const data = await api.getExamResults(authToken, id);
      setExamTitle(data.exam.title);
      setAttempts(data.attempts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInspectAudit(attemptId: string) {
    if (!token) return;
    try {
      setAuditLoading(true);
      const audit = await api.getProctorAudit(token, examId, attemptId);
      setSelectedAudit(audit);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  }

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((acc, c) => acc + (c.score || 0), 0) / attempts.length)
    : 0;

  const avgIntegrity = attempts.length > 0
    ? Math.round(attempts.reduce((acc, c) => acc + (c.integrityScore || 100), 0) / attempts.length)
    : 100;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/70 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" className="p-2 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                EVALUATION & PROCTOR REVIEW
              </span>
              <h1 className="text-lg font-bold text-white mt-0.5">{examTitle}</h1>
            </div>
          </div>

          <Link href="/dashboard">
            <Button variant="secondary" className="text-xs">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-neutral-900/80 border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Total Candidates Evaluated</div>
            <div className="text-2xl font-bold mt-1 text-white">{attempts.length}</div>
          </Card>
          <Card className="p-4 bg-neutral-900/80 border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Average Coding Score</div>
            <div className="text-2xl font-bold mt-1 text-indigo-400">{avgScore}%</div>
          </Card>
          <Card className="p-4 bg-neutral-900/80 border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Average Proctor Integrity</div>
            <div
              className={`text-2xl font-bold mt-1 ${
                avgIntegrity >= 80 ? 'text-emerald-400' : avgIntegrity >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {avgIntegrity}%
            </div>
          </Card>
          <Card className="p-4 bg-neutral-900/80 border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Proctoring Model</div>
            <div className="text-sm font-bold mt-2 text-purple-300 flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span>AI Face + Tab + Chords</span>
            </div>
          </Card>
        </div>

        {/* Results Table */}
        <Card className="p-0 overflow-hidden border-neutral-800 bg-neutral-900/70">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Candidate Submissions & Integrity Ledger</span>
            </h2>
            <span className="text-xs text-neutral-400">{attempts.length} attempts recorded</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              Loading assessment scorecards...
            </div>
          ) : attempts.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm space-y-2">
              <User className="h-8 w-8 text-neutral-600 mx-auto" />
              <p>No candidates have attempted this exam yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950/70 text-xs text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Secret Code Used</th>
                    <th className="px-5 py-3">Coding Score</th>
                    <th className="px-5 py-3">Integrity Trust</th>
                    <th className="px-5 py-3">Violations</th>
                    <th className="px-5 py-3">Started At</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono text-xs">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-neutral-800/30 transition">
                      <td className="px-5 py-3 font-sans">
                        <div className="font-semibold text-white">{att.candidate.fullName}</div>
                        <div className="text-[11px] text-neutral-400">{att.candidate.email}</div>
                      </td>
                      <td className="px-5 py-3 text-neutral-300">
                        {att.secretCodeUsed ? (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-indigo-300 font-bold">
                            {att.secretCodeUsed}
                          </span>
                        ) : (
                          <span className="text-neutral-500">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-bold text-sm ${
                            (att.score ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {att.score !== null ? `${att.score}%` : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            att.integrityScore >= 80
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : att.integrityScore >= 50
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {att.integrityScore}% Trust
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={att.violationCount > 0 ? 'text-rose-400 font-bold' : 'text-neutral-400'}
                        >
                          {att.violationCount} incidents
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-400 font-sans">
                        {new Date(att.startedAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => handleInspectAudit(att.id)}
                          className="text-xs px-3 py-1 font-sans"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                          Inspect Audit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Proctoring Timeline Audit Modal */}
        {selectedAudit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-neutral-900 border-neutral-800 p-6 space-y-4 overflow-hidden shadow-2xl">
              <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
                <div>
                  <span className="text-xs font-semibold text-indigo-400">AUDIT TRAIL INSPECTOR</span>
                  <h3 className="text-lg font-bold text-white">
                    {selectedAudit.candidate.fullName} ({selectedAudit.candidate.email})
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 font-mono">
                    <span>Score: <strong className="text-white">{selectedAudit.score ?? 0}%</strong></span>
                    <span>•</span>
                    <span>
                      Integrity:{' '}
                      <strong
                        className={
                          selectedAudit.integrityScore >= 80 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {selectedAudit.integrityScore}%
                      </strong>
                    </span>
                    <span>•</span>
                    <span>Violations: <strong className="text-rose-400">{selectedAudit.violationCount}</strong></span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedAudit(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              {/* Chronological Event Timeline */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans">
                <div className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                  Proctor Incident Chronology ({selectedAudit.proctorEvents.length} events logged)
                </div>

                {selectedAudit.proctorEvents.length === 0 ? (
                  <div className="text-xs text-neutral-500 py-6 text-center">
                    Clean sitting — no anti-cheat or visibility violations were triggered.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAudit.proctorEvents.map((ev) => {
                      const isBad = [
                        'FACE_NOT_DETECTED',
                        'MULTIPLE_FACES_DETECTED',
                        'GAZE_AWAY',
                        'TAB_HIDDEN',
                        'WINDOW_BLUR',
                        'FULLSCREEN_EXIT',
                        'COPY_BLOCKED',
                        'PASTE_BLOCKED',
                      ].includes(ev.type);

                      return (
                        <div
                          key={ev.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                            isBad
                              ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                              : 'bg-neutral-950/40 border-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isBad ? (
                              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-neutral-500 shrink-0" />
                            )}
                            <div>
                              <span className="font-mono font-bold text-[11px]">{ev.type}</span>
                              {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                <span className="text-[10px] text-neutral-400 ml-2">
                                  {JSON.stringify(ev.metadata)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {new Date(ev.occurredAt).toLocaleTimeString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedAudit(null)} className="text-xs">
                  Close Audit Inspector
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
