'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  api,
  ExamSummary,
  SubmissionItem,
  UserProfile,
} from '@/lib/api';
import PaperboatLogo from '@/components/PaperboatLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Code2,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  ClipboardList,
  Check,
  Activity,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Mail,
  UserCheck,
  FileCode,
  Award,
  Bell,
} from 'lucide-react';

export default function StudentAcademicPortalPage() {
  const router = useRouter();

  // Auth & Profile State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email Verification & OTP State
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  // Academic Dashboard Data
  const [academicData, setAcademicData] = useState<any>(null);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  // In-App Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'progress' | 'attendance' | 'practicals' | 'tasks' | 'tests' | 'calendar'
  >('overview');

  // Secret Code modal for candidate exams
  const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('exam_forge_token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    loadAllStudentData(storedToken);
  }, [router]);

  // Resend Timer Countdown
  useEffect(() => {
    let interval: any;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  async function loadAllStudentData(authToken: string) {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, academicRes, examsRes, subsRes, notifsRes] = await Promise.all([
        api.getMe(authToken),
        api.getStudentDashboard(authToken).catch(() => null),
        api.getExams(authToken).catch(() => []),
        api.getSubmissions(authToken).catch(() => []),
        api.getNotifications(authToken).catch(() => ({ success: true, notifications: [], unreadCount: 0 })),
      ]);

      setUser(profileRes);
      setIsEmailVerified(Boolean(profileRes.isEmailVerified));
      setAcademicData(academicRes);
      setExams(examsRes.filter((e: any) => e.status === 'ACTIVE' || e.status === 'SCHEDULED' || e.status === 'PUBLISHED'));
      setSubmissions(subsRes);

      const notifList = notifsRes?.notifications || academicRes?.notifications || [];
      const unread = notifsRes?.unreadCount ?? academicRes?.unreadNotificationsCount ?? 0;
      setNotifications(notifList);
      setUnreadNotifCount(unread);
    } catch (err: any) {
      setError(err.message || 'Failed to load Student Portal data');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!token) return;
    try {
      await api.markAllNotificationsAsRead(token);
      setUnreadNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }

  async function handleMarkNotificationRead(id: string) {
    if (!token) return;
    try {
      await api.markNotificationAsRead(id, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  // Request Student Verification OTP
  async function handleSendOtp() {
    if (!user?.email) return;
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await api.sendStudentOtp(user.email);
      setOtpSent(true);
      setOtpTimer(60);
      setOtpSuccess(res.message);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send verification OTP');
    }
  }

  // Submit Student Verification OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      await api.verifyStudentOtp(user.email, otpCode);
      setIsEmailVerified(true);
      if (token) {
        await loadAllStudentData(token);
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleVerifyAndStartExam(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedExam) return;

    if (selectedExam.requiresSecretCode && !enteredCode.trim()) {
      setCodeError('Please enter the secret access code sent to your email.');
      return;
    }

    setVerifyingCode(true);
    setCodeError(null);
    try {
      if (selectedExam.requiresSecretCode) {
        const verifyRes = await api.verifySecretCode(token, selectedExam.id, enteredCode.trim());
        if (!verifyRes.valid) {
          setCodeError('Invalid or expired secret access code.');
          setVerifyingCode(false);
          return;
        }
      }

      sessionStorage.setItem(`exam_secret_${selectedExam.id}`, enteredCode.trim());
      router.push(`/exam/${selectedExam.id}`);
    } catch (err: any) {
      setCodeError(err.message || 'Failed to verify secret access code');
      setVerifyingCode(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('exam_forge_token');
    sessionStorage.removeItem('candidate_exam_secret_code');
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Loading Student Academic ERP...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 1. EMAIL VERIFICATION LOCK SCREEN (Section 5)
  // ==========================================================================
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-600/30">
                <Code2 className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-base text-white">Exam<span className="text-emerald-400">Forge</span></span>
            </div>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-7 w-7" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Student Email Verification</h2>
            <p className="text-xs text-slate-400 mt-2">
              Before you can access your academic progress, classes, and marks, you must verify your registered college email:
            </p>
            <p className="font-mono text-sm font-bold text-emerald-400 mt-1 mb-6 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800">
              {user?.email}
            </p>

            {otpError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{otpSuccess}</span>
              </div>
            )}

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                <span>Send 6-Digit OTP Code</span>
              </button>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enter 6-Digit Security OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full py-3 px-4 text-center font-mono text-2xl tracking-[8px] rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Code is valid for 10 minutes.</p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-sm shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifyingOtp ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Unlock Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Didn't receive code?</span>
                  {otpTimer > 0 ? (
                    <span className="font-mono text-slate-500">Resend in {otpTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================================
  // 2. UNLOCKED STUDENT ACADEMIC ERP DASHBOARD
  // ==========================================================================
  const student = academicData?.studentProfile || { fullName: user?.fullName, rollNumber: 'N/A', prnNumber: 'N/A' };
  const classInfo = academicData?.classInfo || {
    classCode: 'Academic Class',
    division: 'A',
    semester: 'Current',
    academicYear: '2026-27',
  };
  const attendance = academicData?.attendance || { overallPercentage: 85, present: 0, absent: 0, late: 0, leave: 0, subjectWise: [] };
  const progress = academicData?.progress || { overallPercentage: 82, completedTests: 0, totalTests: 0, completedTasks: 0, pendingTasks: 0, completedPracticals: 0, totalPracticals: 0, completedVivas: 0, totalVivas: 0 };
  const improvementAreas = academicData?.improvementAreas || [];
  const practicals = academicData?.practicals || [];
  const tasks = academicData?.tasks || [];
  const today = academicData?.today || { classes: [], tasks: [], upcomingTests: [], upcomingPracticals: [], upcomingViva: [] };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PaperboatLogo size="sm" variant="badge" href="/" />

            <span className="text-slate-600 hidden sm:inline">/</span>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">
                  Student Learning Hub
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {classInfo.classCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Roll: {student.rollNumber} • Sem: {classInfo.semester}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Notification Bell with Badge */}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition relative"
              title="Class Event Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {showNotifDrawer && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">Event Notifications</span>
                    {unreadNotifCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 font-bold border border-rose-800">
                        {unreadNotifCount} New
                      </span>
                    )}
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No notifications or scheduled events yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && handleMarkNotificationRead(n.id)}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                          !n.isRead
                            ? 'bg-slate-800/80 border-emerald-500/40 hover:border-emerald-500'
                            : 'bg-slate-950/60 border-slate-800/60 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-white text-[12px]">{n.title}</p>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] text-slate-500 mt-1.5 font-mono">
                          {new Date(n.createdAt).toLocaleDateString()} at{' '}
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{student.fullName}</span>
            </span>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-xs font-semibold text-red-300 border border-red-800/80 transition flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* NOTIFICATION EVENT ALERT BANNER (If unread scheduled events exist) */}
      {unreadNotifCount > 0 && (
        <div className="bg-emerald-950/70 border-b border-emerald-800/80 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                <strong>New Event Notification:</strong> You have {unreadNotifCount} unread update(s) or newly scheduled event(s) for your class!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNotifDrawer(true)}
              className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded-lg transition"
            >
              View Updates →
            </button>
          </div>
        </div>
      )}

      {/* SECTION 8: WELCOME HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Academic Year {classInfo.academicYear}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome, {student.fullName}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Class {classInfo.classCode} ({classInfo.division}) • {classInfo.department || 'Engineering'} • Semester {classInfo.semester}
            </p>
          </div>

          {/* QUICK STATS PILLS */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Attendance</span>
              <span className={`text-xl font-black ${attendance.overallPercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {attendance.overallPercentage}%
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Progress</span>
              <span className="text-xl font-black text-teal-400">{progress.overallPercentage}%</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Pending Tasks</span>
              <span className="text-xl font-black text-blue-400">{progress.pendingTasks}</span>
            </div>
          </div>
        </div>
      </section>

      {/* PORTAL NAVIGATION TABS */}
      <div className="border-b border-slate-800 bg-slate-950 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Today', icon: Clock },
            { id: 'progress', label: 'My Progress', icon: Activity },
            { id: 'attendance', label: 'Attendance', icon: BarChart3 },
            { id: 'practicals', label: 'My Practicals', icon: BookOpen },
            { id: 'tasks', label: `My Tasks (${tasks.length})`, icon: ClipboardList },
            { id: 'tests', label: `Exams & Tests (${exams.length})`, icon: Play },
            { id: 'calendar', label: 'Calendar & Schedule', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN BODY CONTENTS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW & TODAY */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* TODAY'S SCHEDULE (Section 8: TODAY) */}
            <div>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                <span>Today's Academic Schedule</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today's Classes */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Today's Classes & Lectures
                  </span>
                  {today.classes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No scheduled lectures today.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {today.classes.map((c: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <p className="font-semibold text-white">{c.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(c.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {c.location || 'Lecture Hall'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Tests & Viva */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Upcoming Tests & Viva
                  </span>
                  {today.upcomingTests.length === 0 && today.upcomingViva.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No exams or vivas scheduled today.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {today.upcomingTests.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs">
                          <p className="font-semibold text-emerald-300">{t.title}</p>
                          <p className="text-[11px] text-emerald-400/80 mt-0.5">{t.durationMins} mins • {t.academicTestType || 'Test'}</p>
                        </div>
                      ))}
                      {today.upcomingViva.map((v: any) => (
                        <div key={v.id} className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-xs">
                          <p className="font-semibold text-cyan-300">{v.title}</p>
                          <p className="text-[11px] text-cyan-400/80 mt-0.5">Viva • {v.subject?.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Tasks & Practicals */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Tasks & Practicals Due
                  </span>
                  {today.tasks.length === 0 && today.upcomingPracticals.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No urgent tasks due today.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {today.tasks.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <p className="font-semibold text-white">{t.title}</p>
                          <p className="text-[11px] text-amber-400 mt-0.5">Due Today • {t.category}</p>
                        </div>
                      ))}
                      {today.upcomingPracticals.map((p: any) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <p className="font-semibold text-white">{p.subject?.name} Lab</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Pending evaluation</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* IMPROVEMENT AREA (Section 8: IMPROVEMENT AREA) */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-400" />
                <span>Academic Improvement Areas</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Data-driven feedback computed from your actual test and laboratory performance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {improvementAreas.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-sm">{item.subject}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          Theory: {item.theoryPct}% | Practical: {item.practicalPct}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-3 font-medium bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-xl">
                        "{item.suggestion}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPLETED VS PENDING WORK (Section 8) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COMPLETED WORK */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Completed Work</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Completed Assessments / Tests</span>
                    <span className="font-bold text-emerald-400">{progress.completedTests} / {progress.totalTests}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Submitted Tasks & Assignments</span>
                    <span className="font-bold text-emerald-400">{progress.completedTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Evaluated Practical Experiments</span>
                    <span className="font-bold text-emerald-400">{progress.completedPracticals} / {progress.totalPracticals}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Evaluated Oral Vivas</span>
                    <span className="font-bold text-emerald-400">{progress.completedVivas} / {progress.totalVivas}</span>
                  </div>
                </div>
              </div>

              {/* PENDING WORK */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span>Pending & Upcoming Work</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Pending Tasks & Assignments</span>
                    <span className="font-bold text-amber-400">{progress.pendingTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Upcoming Tests & Mocks</span>
                    <span className="font-bold text-amber-400">{exams.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Pending Practical Sign-Offs</span>
                    <span className="font-bold text-amber-400">{progress.totalPracticals - progress.completedPracticals}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
                    <span className="text-slate-300">Pending Oral Vivas</span>
                    <span className="font-bold text-amber-400">{progress.totalVivas - progress.completedVivas}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MY PROGRESS & ACADEMIC PERFORMANCE (Section 10) */}
        {/* ================================================================= */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2">Academic Performance & Evaluation Distribution</h3>
              <p className="text-xs text-slate-400 mb-6">Comprehensive aggregation of your theory, practical, and viva scores.</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Overall Progress</span>
                  <span className="text-2xl font-black text-emerald-400">{progress.overallPercentage}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Tests Completed</span>
                  <span className="text-2xl font-black text-teal-400">{progress.completedTests}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Practicals Sign-Off</span>
                  <span className="text-2xl font-black text-cyan-400">{progress.completedPracticals}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Attendance Score</span>
                  <span className="text-2xl font-black text-blue-400">{attendance.overallPercentage}%</span>
                </div>
              </div>

              {/* Progress bar visual */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Semester Course Completion Benchmark</span>
                  <span className="text-emerald-400">{progress.overallPercentage}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress.overallPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ATTENDANCE (Section 9) */}
        {/* ================================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                    <span>Attendance Records & Compliance</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Minimum 75% attendance is required per academic governance rules.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Overall Rate</span>
                  <span className={`text-3xl font-black ${attendance.overallPercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {attendance.overallPercentage}%
                  </span>
                </div>
              </div>

              {/* STATS ROW */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block">Present</span>
                  <span className="text-xl font-bold text-white">{attendance.present}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-center">
                  <span className="text-[10px] font-bold text-red-400 uppercase block">Absent</span>
                  <span className="text-xl font-bold text-white">{attendance.absent}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">Late</span>
                  <span className="text-xl font-bold text-white">{attendance.late}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-center">
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">Leave</span>
                  <span className="text-xl font-bold text-white">{attendance.leave}</span>
                </div>
              </div>

              {/* SUBJECT-WISE ATTENDANCE PROGRESS */}
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                Subject-Wise Attendance Breakdown
              </h4>
              <div className="space-y-4">
                {attendance.subjectWise.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No subject attendance sessions recorded yet.</p>
                ) : (
                  attendance.subjectWise.map((sub: any) => (
                    <div key={sub.subjectId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{sub.subjectName} ({sub.subjectCode})</span>
                        <span className={`font-bold ${sub.percentage >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {sub.attendedSessions} / {sub.totalSessions} sessions ({sub.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sub.percentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${sub.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: MY PRACTICALS (Section 11) */}
        {/* ================================================================= */}
        {activeTab === 'practicals' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                <span>My Practicals & Laboratory Assessments</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Continuous laboratory evaluation breakdown including experiments, lab records, implementation, and oral viva marks.
              </p>

              {practicals.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No laboratory assessments configured for this class yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {practicals.map((p: any) => (
                    <div key={p.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-sm">{p.subjectName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.totalMarks > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{p.subjectCode} • Evaluator: {p.teacherName}</p>

                        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">Experiment</span>
                            <span className="font-bold text-white text-xs">{p.experimentMarks} / 20</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">Record</span>
                            <span className="font-bold text-white text-xs">{p.labRecordMarks} / 10</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">Code</span>
                            <span className="font-bold text-white text-xs">{p.implementationMarks} / 10</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">Viva</span>
                            <span className="font-bold text-white text-xs">{p.vivaMarks} / 10</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Total Marks:</span>
                        <span className="font-mono text-sm font-extrabold text-emerald-400">
                          {p.totalMarks} / {p.maxMarks}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: MY TASKS (Section 12) */}
        {/* ================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-400" />
                <span>My Academic Tasks & Assignments</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Assignments, projects, laboratory reports, and seminar submissions.
              </p>

              {tasks.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  <ClipboardList className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No tasks assigned to your account right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {task.category}
                          </span>
                          <h4 className="font-bold text-white text-sm">{task.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{task.description || 'No description provided'}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Subject: {task.subject?.name || 'General'} • Due:{' '}
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Open'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: TESTS & ONLINE EXAMINATIONS */}
        {/* ================================================================= */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Play className="h-5 w-5 text-emerald-400" />
                <span>Examinations & Coding Assessments</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Active institutional tests, coding assessments, and mock examinations available to take.
              </p>

              {exams.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  <Play className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No examinations are scheduled for your account right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-base">{exam.title}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {exam.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{exam.description || 'Institutional Assessment'}</p>

                        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {exam.durationMins} Mins
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            Proctored
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedExam(exam)}
                        className="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                      >
                        <span>Start Examination</span>
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: CALENDAR & CLASS SCHEDULE */}
        {/* ================================================================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    <span>Institutional Timetable & Class Event Schedule</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live schedule of lectures, unit tests, lab practicals, vivas, and assignment deadlines for {classInfo.classCode}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
                  {(academicData?.calendarEvents || []).length} Scheduled Events
                </span>
              </div>

              {/* Event Cards Grid */}
              {(academicData?.calendarEvents || []).length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                  <Calendar className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No scheduled events or exams on your calendar yet.</p>
                  <p className="text-[11px] text-slate-500">Events scheduled by your Class Teacher or Subject Teachers will appear here in real-time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(academicData?.calendarEvents || []).map((ev: any) => {
                    const isUpcoming = new Date(ev.startAt) > new Date();
                    const typeColor =
                      ev.eventType === 'UNIT_TEST' || ev.eventType === 'EXAM'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : ev.eventType === 'PRACTICAL'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : ev.eventType === 'VIVA'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                        : ev.eventType === 'ASSIGNMENT'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-blue-950 text-blue-300 border-blue-800';

                    return (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor}`}>
                              {String(ev.eventType).replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {new Date(ev.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                            {ev.subject && (
                              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                                {ev.subject.name} ({ev.subject.code})
                              </p>
                            )}
                            {ev.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {new Date(ev.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(ev.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {ev.location && (
                            <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                              📍 {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EXAM SECRET CODE INPUT */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Enter Exam Access Code</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedExam.title}</p>

            {codeError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
                {codeError}
              </div>
            )}

            <form onSubmit={handleVerifyAndStartExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Secret Access Code</label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="e.g. EXAM-4821"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30"
                >
                  {verifyingCode ? 'Verifying...' : 'Launch Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-4 px-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <PaperboatLogo size="sm" variant="icon" showSubtitle={false} />
          <span>&copy; {new Date().getFullYear()} Paperboat Education Systems Inc. Powered by ExamForge Engine.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/academic" className="hover:text-slate-300 transition">Academic ERP</Link>
          <Link href="/teacher" className="hover:text-slate-300 transition">Teacher Hub</Link>
          <Link href="/college" className="hover:text-slate-300 transition">College Admin</Link>
        </div>
      </footer>
    </div>
  );
}
