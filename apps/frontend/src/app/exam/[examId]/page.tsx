'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProctorTracker, { ProctorEvent } from '@/components/ProctorTracker';
import CameraProctor, { CameraAnomalyType } from '@/components/CameraProctor';
import CodeEditor from '@/components/CodeEditor';
import TerminalOutput from '@/components/TerminalOutput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api, ExamSummary, UserProfile } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  Clock,
  Play,
  FileCode2,
  AlertTriangle,
  Loader2,
  Maximize2,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export default function ExamWorkbenchPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [attemptId, setAttemptId] = useState<string>('');
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [code, setCode] = useState<string>('// Write your solution here\n');
  const [language, setLanguage] = useState<'JAVASCRIPT' | 'TYPESCRIPT' | 'PYTHON'>('JAVASCRIPT');
  const [status, setStatus] = useState<string>('IDLE');
  const [output, setOutput] = useState<{ stdout?: string | null; stderr?: string | null }>({});

  // Proctoring State
  const [integrityScore, setIntegrityScore] = useState<number>(100);
  const [strikes, setStrikes] = useState<number>(0);
  const [proctorLogs, setProctorLogs] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Secret Code Guard State
  const [secretCodeVerified, setSecretCodeVerified] = useState(false);
  const [inputSecretCode, setInputSecretCode] = useState('');
  const [secretCodeError, setSecretCodeError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Authenticate and load exam
  useEffect(() => {
    const storedToken = sessionStorage.getItem('exam_forge_token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);

    // Check if secret code was already verified from dashboard
    const savedCode = sessionStorage.getItem(`exam_secret_${examId}`);
    if (savedCode) {
      setInputSecretCode(savedCode);
      setSecretCodeVerified(true);
    }

    loadExamInfo(storedToken, examId, savedCode || undefined);
  }, [examId, router]);

  // Connect WebSocket for live test run results
  const { isConnected, lastMessage } = useWebSocket(user?.id);

  useEffect(() => {
    if (!lastMessage || typeof lastMessage !== 'object') return;
    const msg = lastMessage as { type?: string; status?: string; score?: number; passed?: boolean; error?: string };

    if (msg.type === 'SUBMISSION_STATUS' && msg.status) {
      setStatus(msg.status);
      if (msg.status === 'PASSED' || msg.status === 'FAILED') {
        setSubmitting(false);
      }
      if (msg.error) {
        setOutput((prev) => ({ ...prev, stderr: msg.error }));
      }
    }
  }, [lastMessage]);

  async function loadExamInfo(authToken: string, id: string, initialSecret?: string) {
    try {
      setLoading(true);
      const [profileData, examData] = await Promise.all([
        api.getMe(authToken),
        api.getExam(authToken, id),
      ]);

      setUser(profileData);
      setExam(examData);

      // If exam does not require secret code, or if user is elevated staff, auto-verify
      if (
        !examData.requiresSecretCode ||
        profileData.role === 'SUPER_ADMIN' ||
        profileData.role === 'TEACHER' ||
        profileData.role === 'RECRUITER'
      ) {
        setSecretCodeVerified(true);
        const att = await api.startAttempt(authToken, id, initialSecret);
        setAttemptId(att.id);
        if (att.integrityScore !== undefined) setIntegrityScore(att.integrityScore);
      } else if (initialSecret) {
        const att = await api.startAttempt(authToken, id, initialSecret);
        setAttemptId(att.id);
        if (att.integrityScore !== undefined) setIntegrityScore(att.integrityScore);
      }

      if (examData.challenges.length > 0) {
        const first = examData.challenges[0].challenge;
        setCode(first.starterCode || '// Write your solution here\n');
      }
    } catch (err) {
      console.error(err);
      setStatus('ERROR_LOADING_EXAM');
    } finally {
      setLoading(false);
    }
  }

  // Handle Secret Code Verification in Workbench
  async function handleVerifyCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inputSecretCode) return;

    setSecretCodeError(null);
    try {
      const res = await api.verifySecretCode(token, examId, inputSecretCode);
      if (res.valid) {
        sessionStorage.setItem(`exam_secret_${examId}`, inputSecretCode.trim().toUpperCase());
        const att = await api.startAttempt(token, examId, inputSecretCode.trim().toUpperCase());
        setAttemptId(att.id);
        setSecretCodeVerified(true);
      }
    } catch (err) {
      setSecretCodeError(err instanceof Error ? err.message : 'Invalid secret access code');
    }
  }

  function handleSelectChallenge(index: number) {
    if (!exam || !exam.challenges[index]) return;
    setActiveChallengeIndex(index);
    const selected = exam.challenges[index].challenge;
    setCode(selected.starterCode || '// Write your solution here\n');
    setStatus('IDLE');
    setOutput({});
  }

  // Toggle Fullscreen Mode
  function requestFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }

  // Handle Proctoring Events
  const handleProctorEvent = useCallback((event: ProctorEvent) => {
    let warning = '';
    let deduction = 0;

    if (event.type === 'TAB_HIDDEN' || event.type === 'WINDOW_BLUR') {
      warning = `Focus Lost: Tab switched at ${new Date(event.timestamp).toLocaleTimeString()}`;
      deduction = 5;
    } else if (event.type === 'FULLSCREEN_EXIT') {
      warning = `Fullscreen Exited at ${new Date(event.timestamp).toLocaleTimeString()}`;
      deduction = 5;
    } else if (event.type === 'COPY_BLOCKED' || event.type === 'PASTE_BLOCKED') {
      warning = `Clipboard Chord Blocked at ${new Date(event.timestamp).toLocaleTimeString()}`;
      deduction = 2;
    }

    if (warning) {
      setProctorLogs((prev) => [warning, ...prev.slice(0, 4)]);
      setStrikes((prev) => prev + 1);
      setIntegrityScore((prev) => Math.max(0, prev - deduction));
    }
  }, []);

  // Handle AI Camera Anomalies
  const handleCameraAnomaly = useCallback((type: CameraAnomalyType, details: string) => {
    const warning = `AI Camera Alert: ${details}`;
    setProctorLogs((prev) => [warning, ...prev.slice(0, 4)]);
    setStrikes((prev) => prev + 1);
    setIntegrityScore((prev) => Math.max(0, prev - 4));
  }, []);

  async function handleSubmit() {
    if (!token || !exam || !exam.challenges[activeChallengeIndex]) return;
    const activeChallenge = exam.challenges[activeChallengeIndex].challenge;

    try {
      setSubmitting(true);
      setStatus('QUEUED');
      setOutput({ stdout: null, stderr: null });

      const res = await api.submitCode(token, {
        challengeId: activeChallenge.id,
        language,
        sourceCode: code,
      });

      setStatus(`QUEUED (${res.submissionId.slice(-6)})`);

      const pollInterval = setInterval(async () => {
        try {
          const sub = (await api.getSubmission(token, res.submissionId)) as {
            status: string;
            score?: number;
            stdout?: string | null;
            stderr?: string | null;
          };
          if (sub.status !== 'QUEUED' && sub.status !== 'RUNNING') {
            setStatus(sub.status);
            setOutput({ stdout: sub.stdout, stderr: sub.stderr });
            setSubmitting(false);
            clearInterval(pollInterval);
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 1500);
    } catch (err) {
      setSubmitting(false);
      setStatus('SUBMISSION_FAILED');
      setOutput({ stderr: err instanceof Error ? err.message : 'Submission failed' });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-300 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold">Initializing Ephemeral Examination Container...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-300 gap-4">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-lg font-semibold">Assessment Not Found</p>
        <Link href="/dashboard">
          <Button variant="secondary" className="text-xs">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Modal if Secret Code is required but unverified
  if (!secretCodeVerified) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-6 space-y-5 shadow-2xl">
          <div className="space-y-2 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-white">Secret Code Required</h1>
            <p className="text-xs text-neutral-400">
              This assessment requires a verified invitation secret access code dispatched to your email.
            </p>
          </div>

          <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Invitation Secret Code</label>
              <Input
                type="text"
                placeholder="FORGE-2026-SE"
                value={inputSecretCode}
                onChange={(e) => setInputSecretCode(e.target.value)}
                required
                className="bg-neutral-950 border-neutral-800 font-mono text-center text-base tracking-widest font-bold"
              />
            </div>

            {secretCodeError && (
              <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded">
                {secretCodeError}
              </div>
            )}

            <Button type="submit" className="w-full text-xs font-semibold h-10">
              Unlock Assessment Workbench →
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-neutral-500">
            <Link href="/dashboard" className="hover:text-neutral-300">
              ← Return to Dashboard
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  const activeChallenge = exam.challenges[activeChallengeIndex]?.challenge;

  return (
    <ProctorTracker
      examAttemptId={attemptId || examId}
      ingestUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/proctor-events`}
      authToken={token ?? undefined}
      onEvent={handleProctorEvent}
      enforceFullscreen={true}
    >
      <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 overflow-hidden select-none">
        {/* Top Control Bar */}
        <header className="h-14 border-b border-neutral-800 bg-neutral-900/90 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" className="p-2 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{exam.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  {exam.challenges.length} Tasks
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Trust / Integrity Score */}
            <div
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold font-mono border ${
                integrityScore >= 80
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : integrityScore >= 50
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{integrityScore}% Integrity</span>
            </div>

            {/* Fullscreen Button */}
            <Button
              variant="secondary"
              onClick={requestFullscreen}
              className="text-xs py-1 px-2.5 h-8 gap-1"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'JAVASCRIPT' | 'TYPESCRIPT' | 'PYTHON')}
              className="bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 rounded px-2.5 py-1.5 outline-none font-mono focus:border-indigo-500"
            >
              <option value="JAVASCRIPT">JavaScript (Node.js)</option>
              <option value="PYTHON">Python 3</option>
              <option value="TYPESCRIPT">TypeScript</option>
            </select>

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting}
              className="text-xs font-semibold gap-1.5 h-8 px-4"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Grading...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Submit Code</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Proctor Warning Banner */}
        {proctorLogs.length > 0 && (
          <div className="bg-rose-950/40 border-b border-rose-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{proctorLogs[0]}</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Total Infractions: <strong className="text-rose-400">{strikes}</strong>
            </span>
          </div>
        )}

        {/* Challenge Tabs */}
        <div className="flex items-center gap-1 bg-neutral-900 px-4 py-1.5 border-b border-neutral-800 overflow-x-auto shrink-0">
          {exam.challenges.map((c, i) => (
            <button
              key={c.id}
              onClick={() => handleSelectChallenge(i)}
              className={`px-3 py-1 text-xs rounded font-medium transition flex items-center gap-1.5 ${
                activeChallengeIndex === i
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span>{c.challenge.title}</span>
              <span className="text-[10px] opacity-60">({c.points} pts)</span>
            </button>
          ))}
        </div>

        {/* Split Workbench */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
          {/* Floating AI Camera Proctor HUD */}
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <CameraProctor onAnomaly={handleCameraAnomaly} active={true} />
          </div>

          {/* Left Column: Problem Description & Sample Cases (5 cols) */}
          <div className="lg:col-span-5 border-r border-neutral-800 flex flex-col overflow-y-auto p-5 space-y-5 bg-neutral-900/30">
            {activeChallenge ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-semibold font-mono">
                      {activeChallenge.difficulty}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      Limits: {activeChallenge.timeLimitMs}ms / {activeChallenge.memoryLimitMb}MB
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{activeChallenge.title}</h2>
                </div>

                <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line space-y-3 prose prose-invert max-w-none">
                  {activeChallenge.description}
                </div>

                {/* Sample Testcases */}
                {activeChallenge.testCases && activeChallenge.testCases.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-neutral-800">
                    <h3 className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                      Visible Sample Test Cases
                    </h3>
                    <div className="space-y-2.5">
                      {activeChallenge.testCases.map((tc, idx) => (
                        <div
                          key={tc.id || idx}
                          className="rounded-lg bg-neutral-900 border border-neutral-800 p-3 space-y-2 text-xs"
                        >
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-400 uppercase">Input:</span>
                            <pre className="bg-neutral-950 p-1.5 rounded font-mono text-neutral-200 mt-0.5 overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                              Expected Output:
                            </span>
                            <pre className="bg-neutral-950 p-1.5 rounded font-mono text-emerald-300 mt-0.5 overflow-x-auto">
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-neutral-400">Select a task above.</p>
            )}
          </div>

          {/* Right Column: Monaco Code Editor & Terminal (7 cols) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-neutral-950">
            <div className="flex-1 min-h-[55%] border-b border-neutral-800 relative">
              <CodeEditor language={language} value={code} onChange={setCode} />
            </div>

            <div className="h-[45%] flex flex-col overflow-hidden bg-neutral-900/50">
              <TerminalOutput
                stdout={output.stdout}
                stderr={output.stderr}
                status={status}
              />
            </div>
          </div>
        </div>
      </div>
    </ProctorTracker>
  );
}
