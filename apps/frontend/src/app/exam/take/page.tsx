'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, ExamSessionItem } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  KeyRound,
  Maximize2,
  FileText,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
  Award,
} from 'lucide-react';

function CandidateExamTakeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  // Stages: 'LOADING' | 'EMAIL_VERIFY' | 'ENTER_OTP' | 'INSTRUCTIONS' | 'EXAM_IN_PROGRESS' | 'SUBMITTED' | 'ERROR'
  const [stage, setStage] = useState<
    'LOADING' | 'EMAIL_VERIFY' | 'ENTER_OTP' | 'INSTRUCTIONS' | 'EXAM_IN_PROGRESS' | 'SUBMITTED' | 'ERROR'
  >('LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-flight Data
  const [candidateName, setCandidateName] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [requiresAccessCode, setRequiresAccessCode] = useState(false);
  const [testInstructions, setTestInstructions] = useState('');

  // Form Inputs
  const [inputEmail, setInputEmail] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [inputAccessCode, setInputAccessCode] = useState('');
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);

  // Exam Session Data
  const [testId, setTestId] = useState('');
  const [questions, setQuestions] = useState<
    Array<{
      id: string;
      text: string;
      type: string;
      marks: number;
      negativeMarks: number;
      orderIndex: number;
      options: Array<{ id: string; text: string }>;
    }>
  >([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    totalMarks: number;
    percentage: number;
    isPassed: boolean;
  } | null>(null);

  // Load Pre-flight Check on Mount
  useEffect(() => {
    if (!token) {
      setStage('ERROR');
      setErrorMessage('No exam invitation token found in the URL. Please check your invitation link.');
      return;
    }

    async function checkToken() {
      try {
        setStage('LOADING');
        const res = await api.candidatePreFlight(token);
        if (res.valid) {
          setCandidateName(res.candidateName);
          setMaskedEmail(res.maskedEmail);
          setTestTitle(res.testTitle);
          setDurationMinutes(res.durationMinutes);
          setRequiresAccessCode(res.requiresAccessCode);
          setTestInstructions(res.instructions || 'Answer all questions to the best of your ability.');
          setStage('EMAIL_VERIFY');
        } else {
          setStage('ERROR');
          setErrorMessage('Invitation is no longer valid or has already been used.');
        }
      } catch (err: any) {
        setStage('ERROR');
        setErrorMessage(err.message || 'Failed to validate invitation token.');
      }
    }

    checkToken();
  }, [token]);

  // Timer countdown
  useEffect(() => {
    if (stage !== 'EXAM_IN_PROGRESS' || timeLeftSec <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, timeLeftSec]);

  // Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;

    setErrorMessage(null);
    setStage('LOADING');
    try {
      const res = await api.candidateRequestOtp(token, inputEmail.trim());
      if (res.previewOtp) {
        setPreviewOtp(res.previewOtp);
        setInputOtp(res.previewOtp); // Quick-fill in dev
      }
      setStage('ENTER_OTP');
    } catch (err: any) {
      setStage('EMAIL_VERIFY');
      setErrorMessage(err.message || 'Failed to request OTP. Ensure your email matches the invitation.');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim()) return;

    setErrorMessage(null);
    setStage('LOADING');
    try {
      const res = await api.candidateVerifyOtp(token, inputEmail.trim(), inputOtp.trim());
      setTestId(res.testId);
      setDurationMinutes(res.durationMinutes);
      setRequiresAccessCode(res.requiresAccessCode);
      if (res.instructions) setTestInstructions(res.instructions);
      setStage('INSTRUCTIONS');
    } catch (err: any) {
      setStage('ENTER_OTP');
      setErrorMessage(err.message || 'Invalid or expired OTP code.');
    }
  };

  // Request Fullscreen and Start Exam
  const handleStartExam = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      // Fullscreen request
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      }

      const startRes = await api.candidateStartExam(testId, token, inputAccessCode || undefined);
      const sessionData = await api.candidateGetExamSession(testId, token);

      if (sessionData.questions && sessionData.questions.length > 0) {
        setQuestions(sessionData.questions);
      } else {
        throw new Error('This exam currently has no questions published.');
      }

      setTimeLeftSec(startRes.durationMinutes * 60);
      setStage('EXAM_IN_PROGRESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize exam session.');
    } finally {
      setSubmitting(false);
    }
  };

  // Answer selection handler
  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: [optionId], // Single choice for MCQ
    }));
  };

  // Auto-submit on time expiry
  const handleAutoSubmit = async () => {
    handleSubmitExam();
  };

  // Manual Submit
  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.candidateSubmitExam(testId, token, answers);
      setExamResult(res.result);
      setStage('SUBMITTED');

      // Exit fullscreen if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit exam.');
    } finally {
      setSubmitting(false);
    }
  };

  // Formatting helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Exam<span className="text-purple-400">Forge</span>
            </span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
              Candidate Secure Portal
            </span>
          </div>
        </div>

        {stage === 'EXAM_IN_PROGRESS' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-sm">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className={timeLeftSec < 300 ? 'text-red-400 font-bold animate-pulse' : 'text-amber-300'}>
                {formatTime(timeLeftSec)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubmitExam}
              disabled={submitting}
              className="bg-emerald-600/10 border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/20"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finish Exam'}
            </Button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full flex flex-col justify-center items-center">
        {/* ERROR STATE */}
        {stage === 'ERROR' && (
          <Card className="p-8 max-w-lg w-full bg-neutral-900/90 border-red-900/50 text-center space-y-4 shadow-xl">
            <div className="h-12 w-12 rounded-full bg-red-900/30 border border-red-600/40 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Assessment Access Error</h2>
            <p className="text-sm text-neutral-300">{errorMessage || 'An error occurred.'}</p>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="mt-4 border-neutral-800 text-neutral-300 hover:text-white"
            >
              Return to Homepage
            </Button>
          </Card>
        )}

        {/* LOADING STATE */}
        {stage === 'LOADING' && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-neutral-400">Verifying security parameters...</p>
          </div>
        )}

        {/* STEP 1: EMAIL VERIFICATION */}
        {stage === 'EMAIL_VERIFY' && (
          <Card className="p-8 max-w-md w-full bg-neutral-900/90 border-neutral-800 space-y-6 shadow-2xl">
            <div className="space-y-1.5 text-center">
              <div className="h-10 w-10 rounded-xl bg-purple-900/20 border border-purple-600/30 text-purple-400 flex items-center justify-center mx-auto mb-2">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">{testTitle || 'Exam Invitation'}</h2>
              <p className="text-xs text-neutral-400">
                Welcome, <span className="text-purple-300 font-semibold">{candidateName}</span>. Please verify your email
                to receive your 6-digit access OTP.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Confirm Registered Email ({maskedEmail})
                </label>
                <Input
                  type="email"
                  required
                  placeholder="Enter your registered email address"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white"
                />
              </div>

              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium">
                <span>Send 6-Digit OTP Code</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </Card>
        )}

        {/* STEP 2: ENTER OTP */}
        {stage === 'ENTER_OTP' && (
          <Card className="p-8 max-w-md w-full bg-neutral-900/90 border-neutral-800 space-y-6 shadow-2xl">
            <div className="space-y-1.5 text-center">
              <div className="h-10 w-10 rounded-xl bg-purple-900/20 border border-purple-600/30 text-purple-400 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Enter 6-Digit OTP</h2>
              <p className="text-xs text-neutral-400">
                A single-use verification code was sent to <span className="text-purple-300">{inputEmail}</span>.
              </p>
            </div>

            {previewOtp && (
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-center text-xs text-emerald-400 font-mono">
                Development Preview Code: <span className="font-bold text-white">{previewOtp}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">6-Digit Verification Code</label>
                <Input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 123456"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white font-mono text-center tracking-widest text-lg"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStage('EMAIL_VERIFY')}
                  className="border-neutral-800 text-neutral-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  <span>Verify & Proceed</span>
                  <CheckCircle2 className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* STEP 3: EXAM INSTRUCTIONS & ACCESS CODE */}
        {stage === 'INSTRUCTIONS' && (
          <Card className="p-8 max-w-2xl w-full bg-neutral-900/90 border-neutral-800 space-y-6 shadow-2xl">
            <div className="space-y-1.5 text-left border-b border-neutral-800 pb-4">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                Candidate Verified
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">{testTitle}</h2>
              <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Duration: {durationMinutes} Minutes
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Fullscreen Mode Required
                </span>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-400" />
                Exam Instructions & Rules
              </h3>
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                {testInstructions}
              </div>
            </div>

            {requiresAccessCode && (
              <div className="space-y-2 text-left">
                <label className="block text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Assessment Secret Code Required
                </label>
                <Input
                  type="text"
                  placeholder="Enter secret code provided by your instructor/recruiter"
                  value={inputAccessCode}
                  onChange={(e) => setInputAccessCode(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white font-mono"
                />
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <p className="text-[11px] text-neutral-400">
                Clicking "Start Exam" will initiate your timer and request fullscreen view.
              </p>
              <Button
                onClick={handleStartExam}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 px-6"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Maximize2 className="h-4 w-4" />}
                <span>Start Exam</span>
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: EXAM IN PROGRESS */}
        {stage === 'EXAM_IN_PROGRESS' && questions.length > 0 && (
          <div className="w-full max-w-4xl space-y-6">
            {/* Question Card */}
            <Card className="p-8 bg-neutral-900/90 border-neutral-800 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-xs font-bold">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    +{questions[currentQIndex]?.marks} Marks | -{questions[currentQIndex]?.negativeMarks} Neg.
                  </span>
                </div>
                <span className="text-xs text-neutral-400">{questions[currentQIndex]?.type}</span>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-medium text-white leading-relaxed">
                {questions[currentQIndex]?.text}
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-3 pt-2">
                {questions[currentQIndex]?.options?.map((opt) => {
                  const isSelected = answers[questions[currentQIndex].id]?.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(questions[currentQIndex].id, opt.id)}
                      className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-200 ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/10'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-950'
                      }`}
                    >
                      <span className="text-sm font-medium">{opt.text}</span>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs ${
                          isSelected
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'border-neutral-700 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Question Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="border-neutral-800 text-neutral-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Previous
                </Button>

                <div className="flex gap-1.5 flex-wrap justify-center">
                  {questions.map((q, idx) => {
                    const isAnswered = !!answers[q.id]?.length;
                    const isCurrent = idx === currentQIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        className={`h-8 w-8 rounded text-xs font-mono font-semibold transition ${
                          isCurrent
                            ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                            : isAnswered
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {currentQIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitExam}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Submit Final
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* STEP 5: SUBMITTED / RESULT */}
        {stage === 'SUBMITTED' && examResult && (
          <Card className="p-8 max-w-md w-full bg-neutral-900/90 border-neutral-800 text-center space-y-6 shadow-2xl">
            <div
              className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center border ${
                examResult.isPassed
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400'
                  : 'bg-amber-950/50 border-amber-500 text-amber-400'
              }`}
            >
              <Award className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">Assessment Submitted</h2>
              <p className="text-xs text-neutral-400">
                Your responses have been securely evaluated and recorded in the organization database.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-4">
              <div className="text-center">
                <span className="text-xs uppercase font-mono text-neutral-400">Total Score</span>
                <div className="text-4xl font-extrabold text-white mt-1">
                  {examResult.score} <span className="text-lg text-neutral-500">/ {examResult.totalMarks}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-800">
                <span className="text-neutral-400">Percentage</span>
                <span className="font-mono font-bold text-white">{examResult.percentage}%</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Evaluation Status</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    examResult.isPassed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {examResult.isPassed ? 'PASSED' : 'COMPLETED'}
                </span>
              </div>
            </div>

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full border-neutral-800 text-neutral-300 hover:text-white"
            >
              Close Assessment Portal
            </Button>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 px-6 py-4 text-center text-xs text-neutral-500">
        ExamForge Assessment Engine • Powered by Enterprise Security Architecture
      </footer>
    </div>
  );
}

export default function CandidateExamTakePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <CandidateExamTakeContent />
    </Suspense>
  );
}
