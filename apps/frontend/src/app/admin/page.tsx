'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  api,
  ExamSummary,
  UserProfile,
  UserRole,
  SystemAnalytics,
} from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  Users,
  BookOpen,
  Activity,
  Calendar,
  Clock,
  PlusCircle,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  Radio,
  Sparkles,
  KeyRound,
  FileCode,
  GraduationCap,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();

  // Authentication & Profile State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab: 'analytics' | 'exams' | 'users'
  const [activeTab, setActiveTab] = useState<'analytics' | 'exams' | 'users'>('analytics');

  // Data State
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Filtering & Searching
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [examSearch, setExamSearch] = useState('');
  const [examStatusFilter, setExamStatusFilter] = useState<string>('ALL');

  // Modals: User Creation
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CANDIDATE');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Modals: Exam Create / Edit / Schedule
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examDuration, setExamDuration] = useState('60');
  const [examStatus, setExamStatus] = useState<'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [examRequireSecret, setExamRequireSecret] = useState(true);
  const [examStartsAt, setExamStartsAt] = useState('');
  const [examEndsAt, setExamEndsAt] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  // Modal: Send Invitation
  const [inviteModalExam, setInviteModalExam] = useState<ExamSummary | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteResult, setInviteResult] = useState<{ secretCode: string; directUrl: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Modal: Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'exam' | 'user';
    id: string;
    name: string;
    isDeleting: boolean;
  } | null>(null);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('exam_forge_token');
    if (!storedToken) {
      router.push('/admin/login');
      return;
    }
    setToken(storedToken);
    loadAllData(storedToken);
  }, [router]);

  async function loadAllData(authToken: string) {
    setLoading(true);
    setError(null);
    try {
      // 1. Verify User is Super Admin
      const me = await api.getMe(authToken);
      setUser(me);
      if (me.role !== 'SUPER_ADMIN') {
        setError('Access Restricted: You must be a Super Admin to access this control center.');
        setLoading(false);
        return;
      }

      // 2. Fetch System Analytics, Exams, and Users in parallel
      const [analyticsData, examsData, usersData] = await Promise.all([
        api.getSystemAnalytics(authToken),
        api.getExams(authToken),
        api.getUsers(authToken),
      ]);

      setAnalytics(analyticsData);
      setExams(Array.isArray(examsData) ? examsData : []);
      setUsers(Array.isArray(usersData) ? usersData : (usersData as any)?.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Super Admin panel');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      const [analyticsData, examsData, usersData] = await Promise.all([
        api.getSystemAnalytics(token),
        api.getExams(token),
        api.getUsers(token),
      ]);
      setAnalytics(analyticsData);
      setExams(Array.isArray(examsData) ? examsData : []);
      setUsers(Array.isArray(usersData) ? usersData : (usersData as any)?.users || []);
      setSuccessMsg('Data refreshed successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }

  // --- USER MANAGEMENT HANDLERS ---
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newUserEmail || !newUserFullName) return;
    setCreatingUser(true);
    setError(null);
    try {
      const created = await api.createUser(token, {
        email: newUserEmail,
        fullName: newUserFullName,
        role: newUserRole,
        password: newUserPassword || undefined,
      });
      setUsers((prev) => [created, ...(prev || [])]);
      setShowCreateUserModal(false);
      setNewUserEmail('');
      setNewUserFullName('');
      setNewUserPassword('');
      setNewUserRole('CANDIDATE');
      setSuccessMsg(`User ${created.fullName} (${created.role}) created successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      // Refresh analytics in background
      api.getSystemAnalytics(token).then(setAnalytics).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    if (!token) return;
    try {
      const updated = await api.updateUserRole(token, userId, newRole);
      setUsers((prev) => (prev || []).map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      setSuccessMsg(`Role updated to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      api.getSystemAnalytics(token).then(setAnalytics).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  }

  function handleDeleteUser(userId: string, userName: string) {
    if (!token) return;
    if (userId === user?.id) {
      alert('You cannot delete your own active Super Admin account.');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      type: 'user',
      id: userId,
      name: userName,
      isDeleting: false,
    });
  }

  // --- EXAM MANAGEMENT & SCHEDULING HANDLERS ---
  function openCreateExamModal() {
    setEditingExamId(null);
    setExamTitle('');
    setExamDescription('');
    setExamDuration('60');
    setExamStatus('ACTIVE');
    setExamRequireSecret(true);
    setExamStartsAt('');
    setExamEndsAt('');
    setShowExamModal(true);
  }

  function openEditExamModal(exam: ExamSummary) {
    setEditingExamId(exam.id);
    setExamTitle(exam.title);
    setExamDescription(exam.description || '');
    setExamDuration(String(exam.durationMins || exam.durationMinutes || 60));
    setExamStatus(exam.status as any);
    setExamRequireSecret(Boolean(exam.requiresSecretCode || exam.accessCode));
    setExamStartsAt(exam.startsAt ? new Date(exam.startsAt).toISOString().slice(0, 16) : '');
    setExamEndsAt(exam.endsAt ? new Date(exam.endsAt).toISOString().slice(0, 16) : '');
    setShowExamModal(true);
  }

  async function handleSaveExam(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !examTitle) return;
    setSavingExam(true);
    setError(null);
    try {
      const payload = {
        title: examTitle.trim(),
        description: examDescription.trim(),
        durationMins: parseInt(examDuration) || 60,
        status: examStatus,
        requiresSecretCode: examRequireSecret,
        startsAt: examStartsAt ? new Date(examStartsAt).toISOString() : null,
        endsAt: examEndsAt ? new Date(examEndsAt).toISOString() : null,
      };

      if (editingExamId) {
        const updated = await api.updateExam(token, editingExamId, payload);
        setExams((prev) => prev.map((e) => (e.id === editingExamId ? { ...e, ...updated } : e)));
        setSuccessMsg(`Exam "${updated.title}" schedule & settings saved!`);
      } else {
        const created = await api.createExam(token, payload);
        setExams((prev) => [created, ...prev]);
        setSuccessMsg(`Exam "${created.title}" successfully created!`);
      }
      setShowExamModal(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      api.getSystemAnalytics(token).then(setAnalytics).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exam');
    } finally {
      setSavingExam(false);
    }
  }

  function handleDeleteExam(examId: string, examTitle: string) {
    if (!token) return;
    setDeleteConfirm({
      isOpen: true,
      type: 'exam',
      id: examId,
      name: examTitle,
      isDeleting: false,
    });
  }

  async function handleConfirmDelete() {
    if (!token || !deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    setDeleteConfirm((prev) => (prev ? { ...prev, isDeleting: true } : null));
    try {
      if (type === 'exam') {
        await api.deleteExam(token, id);
        setExams((prev) => prev.filter((e) => e.id !== id));
        setSuccessMsg(`Exam "${name}" permanently deleted.`);
      } else if (type === 'user') {
        await api.deleteUser(token, id);
        setUsers((prev) => (prev || []).filter((u) => u.id !== id));
        setSuccessMsg(`User "${name}" successfully deleted.`);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
      api.getSystemAnalytics(token).then(setAnalytics).catch(() => {});
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${type}`);
      setDeleteConfirm(null);
    }
  }

  // --- INVITATION HANDLER ---
  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inviteModalExam || !inviteEmail) return;
    setInviteLoading(true);
    try {
      const res = await api.inviteCandidate(token, inviteModalExam.id, inviteEmail, inviteName);
      setInviteResult({
        secretCode: res.invitation.secretCode,
        directUrl: `${window.location.origin}/exam/${inviteModalExam.id}`,
      });
      setInviteEmail('');
      setInviteName('');
      // Update invitation count locally
      setExams((prev) =>
        prev.map((ex) =>
          ex.id === inviteModalExam.id
            ? { ...ex, _count: { ...ex._count, invitations: (ex._count?.invitations || 0) + 1, attempts: ex._count?.attempts || 0 } }
            : ex
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  }

  // Filtered lists
  const filteredUsers = (users || []).filter((u) => {
    const fullName = u?.fullName || '';
    const email = u?.email || '';
    const matchesSearch =
      fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u?.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(examSearch.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(examSearch.toLowerCase()));
    const matchesStatus = examStatusFilter === 'ALL' || e.status === examStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Initializing Super Admin Control Center...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 px-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restricted Access</h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400">{error}</p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button variant="primary">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Super Admin Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  Exam<span className="text-purple-600 dark:text-purple-400">Forge</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  SUPER ADMIN PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Master Governance, Scheduling & Telemetry Control Center
              </p>
            </div>
          </div>

          {/* Right Actions: Links, Theme Toggle, User */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="text-xs py-1.5 px-3 flex items-center gap-1.5"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>

            <Link href="/dashboard">
              <Button variant="ghost" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Button>
            </Link>

            {/* Theme Toggle Component */}
            <ThemeToggle />

            {/* Admin Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-neutral-800">
              <div className="h-8 w-8 rounded-full bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center">
                SA
              </div>
              <div className="hidden md:block text-right">
                <div className="text-xs font-semibold leading-tight">{user?.fullName}</div>
                <div className="text-[10px] text-slate-500 dark:text-neutral-400">Super Administrator</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications / Alerts */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-4">
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:opacity-80">
              &times;
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/60 text-red-800 dark:text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:opacity-80">
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>System Analytics & Health</span>
            </button>

            <button
              onClick={() => setActiveTab('exams')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'exams'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Manage & Schedule Exams</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-300 dark:bg-neutral-700">
                {exams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>System Users & Students</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-300 dark:bg-neutral-700">
                {users.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'exams' && (
              <Button
                variant="primary"
                onClick={openCreateExamModal}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create / Schedule Exam</span>
              </Button>
            )}
            {activeTab === 'users' && (
              <Button
                variant="primary"
                onClick={() => setShowCreateUserModal(true)}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User / Student</span>
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: SYSTEM ANALYTICS & INFRASTRUCTURE HEALTH */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Top Stat Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Total Platform Users
                  </div>
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black mt-2">{analytics.metrics.totalUsers}</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 flex gap-2">
                  <span>Admins: {analytics.usersByRole?.SUPER_ADMIN || 0}</span>
                  <span>•</span>
                  <span>Students: {analytics.usersByRole?.CANDIDATE || 0}</span>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Total Exams
                  </div>
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black mt-2">{analytics.metrics.totalExams}</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 flex gap-2">
                  <span>Active: {analytics.examsByStatus?.ACTIVE || 0}</span>
                  <span>•</span>
                  <span>Scheduled: {analytics.examsByStatus?.SCHEDULED || 0}</span>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Submission Pass Rate
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black mt-2">{analytics.metrics.passRate}%</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                  Across {analytics.metrics.totalSubmissions} code executions
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Avg Proctor Integrity
                  </div>
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black mt-2">{analytics.metrics.avgIntegrity}%</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                  {analytics.metrics.totalViolations} flagged anomalies
                </div>
              </Card>
            </div>

            {/* Infrastructure Health Status */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-500" />
                <span>Enterprise Core Infrastructure Health</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Postgres */}
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-neutral-200">
                      <Database className="h-4 w-4 text-blue-500" />
                      PostgreSQL 16
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Host Port: 5434 • Containerized Engine
                  </p>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Pool Status: Active (Prisma ORM)
                  </div>
                </Card>

                {/* Redis */}
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-neutral-200">
                      <Radio className="h-4 w-4 text-red-500" />
                      Redis 7 BullMQ
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      OPERATIONAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Port: 6339 • Async Execution Queue
                  </p>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Heartbeat: Keep-Alive Daemon
                  </div>
                </Card>

                {/* API Orchestrator */}
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-neutral-200">
                      <Layers className="h-4 w-4 text-indigo-500" />
                      API Orchestrator
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Port: {analytics.infrastructure?.orchestrator?.port || 5001} • Express/TS
                  </p>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                    Auth: JWT + Email OTP Verified
                  </div>
                </Card>

                {/* Sandbox */}
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-neutral-200">
                      <Cpu className="h-4 w-4 text-amber-500" />
                      Execution Sandbox
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      SANDBOX READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Max CPU: 3.0s • Memory: 256MB
                  </p>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                    Security: Ephemeral Isolation
                  </div>
                </Card>
              </div>
            </div>

            {/* Distribution Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* User Roles */}
              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  User Hierarchy Breakdown
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(analytics.usersByRole || {}).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{role.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 dark:text-neutral-400">{count}</span>
                        <div className="w-16 bg-slate-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, (count / (analytics.metrics.totalUsers || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Submissions by Verdict */}
              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Submissions by Verdict
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(analytics.subsByStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{status}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 dark:text-neutral-400">{count}</span>
                        <div className="w-16 bg-slate-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              status === 'PASSED' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (count / (analytics.metrics.totalSubmissions || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(analytics.subsByStatus || {}).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No submissions recorded yet.</p>
                  )}
                </div>
              </Card>

              {/* Submissions by Language */}
              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Programming Languages
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(analytics.subsByLang || {}).map(([lang, count]) => (
                    <div key={lang} className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase">{lang}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 dark:text-neutral-400">{count}</span>
                        <div className="w-16 bg-slate-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, (count / (analytics.metrics.totalSubmissions || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(analytics.subsByLang || {}).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No code submissions yet.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: EXAM MANAGEMENT & SCHEDULING */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search exams by title or topic..."
                  className="pl-9 text-xs"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
                {['ALL', 'ACTIVE', 'SCHEDULED', 'DRAFT', 'COMPLETED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setExamStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      examStatusFilter === st
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Exams Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-neutral-800 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Exam Title & Details</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4">Status & Security</th>
                      <th className="py-3 px-4">Schedule Window</th>
                      <th className="py-3 px-4 text-center">Invites / Submissions</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                    {filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{exam.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-1 max-w-sm">
                            {exam.description || 'No description provided.'}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-neutral-400">
                            <Clock className="h-3 w-3" />
                            <span>{exam.durationMins} mins</span>
                            <span>•</span>
                            <span>{exam.challenges?.length || 0} coding challenges</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-neutral-300">
                          <div className="font-medium">{exam.author?.fullName || 'Platform Staff'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400">{exam.author?.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                exam.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                  : exam.status === 'SCHEDULED'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                                  : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            >
                              {exam.status}
                            </span>
                            {exam.requiresSecretCode && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                <KeyRound className="h-3 w-3" />
                                Secret Code Enforced
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-slate-600 dark:text-neutral-300">
                          {exam.startsAt || exam.endsAt ? (
                            <div className="space-y-0.5">
                              {exam.startsAt && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 text-[10px]">Start:</span>
                                  <span>{new Date(exam.startsAt).toLocaleDateString()} {new Date(exam.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                              {exam.endsAt && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 text-[10px]">End:</span>
                                  <span>{new Date(exam.endsAt).toLocaleDateString()} {new Date(exam.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Continuous / Unscheduled</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-slate-800 dark:text-neutral-200">
                            {exam._count?.invitations || 0} invites
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                            {exam._count?.attempts || 0} submissions
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Send Invite */}
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setInviteModalExam(exam);
                                setInviteResult(null);
                              }}
                              title="Invite Candidates"
                              className="p-1.5 h-8 w-8 text-indigo-600 dark:text-indigo-400"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>

                            {/* View Results */}
                            <Link href={`/admin/results/${exam.id}`}>
                              <Button
                                variant="ghost"
                                title="Check Results & Anti-Cheat"
                                className="p-1.5 h-8 w-8 text-emerald-600 dark:text-emerald-400"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>

                            {/* Edit / Schedule */}
                            <Button
                              variant="ghost"
                              onClick={() => openEditExamModal(exam)}
                              title="Edit Schedule & Settings"
                              className="p-1.5 h-8 w-8 text-purple-600 dark:text-purple-400"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>

                            {/* Delete Exam */}
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteExam(exam.id, exam.title)}
                              title="Permanently Delete Exam"
                              className="text-xs px-2.5 py-1.5 h-8 flex items-center gap-1.5 font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredExams.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          No exams match the search or filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: SYSTEM USERS & STUDENTS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Role Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by student or admin name / email..."
                  className="pl-9 text-xs"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
                {['ALL', 'SUPER_ADMIN', 'TEACHER', 'RECRUITER', 'CANDIDATE'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      userRoleFilter === r
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {r === 'CANDIDATE' ? 'STUDENT' : r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-neutral-800 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Current Role</th>
                      <th className="py-3 px-4">Role Re-Assignment</th>
                      <th className="py-3 px-4 text-center">Activity Metrics</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                u.role === 'SUPER_ADMIN'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border border-purple-400/40'
                                  : u.role === 'TEACHER'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-400/40'
                                  : u.role === 'RECRUITER'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-400/40'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-400/40'
                              }`}
                            >
                              {u.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                              <div className="text-[11px] text-slate-500 dark:text-neutral-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                : u.role === 'TEACHER'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                : u.role === 'RECRUITER'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {u.role === 'CANDIDATE' ? 'STUDENT / CANDIDATE' : u.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            disabled={u.id === user?.id || u.email === 'devopsbysahil@gmail.com'}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs rounded-md px-2 py-1 outline-none focus:border-purple-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="TEACHER">Teacher</option>
                            <option value="RECRUITER">Recruiter</option>
                            <option value="CANDIDATE">Student (Candidate)</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-center text-[11px] text-slate-600 dark:text-neutral-400">
                          {u.role === 'CANDIDATE' ? (
                            <span>{u._count?.examAttempts || 0} exams taken</span>
                          ) : (
                            <span>
                              {u._count?.examsAuthored || u._count?.testsCreated || 0} exams created • {u._count?.invitationsSent || 0} invites
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-neutral-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="destructive"
                            disabled={u.id === user?.id || u.email === 'devopsbysahil@gmail.com' || u.role === 'SUPER_ADMIN'}
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            title={
                              u.email === 'devopsbysahil@gmail.com' || u.role === 'SUPER_ADMIN'
                                ? 'Primary Super Admin cannot be deleted'
                                : u.id === user?.id
                                ? 'Cannot delete your own account'
                                : 'Permanently Delete User'
                            }
                            className="text-xs px-2.5 py-1.5 h-8 flex items-center gap-1.5 font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm rounded-lg disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete User</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          No users found matching search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* MODAL: CREATE USER / STUDENT */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>Add Platform User or Student</span>
              </h3>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="e.g. Maya Chen"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Email Address
                </label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. candidate@university.edu"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Account Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="CANDIDATE">Student (Candidate with Email OTP & Secret Code)</option>
                  <option value="TEACHER">Teacher (Can author tests, check results & invite)</option>
                  <option value="RECRUITER">Recruiter (Can create assessments & invite candidates)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full system master governance)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Initial Password <span className="text-[10px] text-slate-400">(Default: password12345)</span>
                </label>
                <Input
                  type="password"
                  placeholder="Leave blank for password12345"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={creatingUser}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: CREATE OR SCHEDULE EXAM */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>{editingExamId ? 'Edit Exam & Schedule Settings' : 'Create & Schedule New Exam'}</span>
              </h3>
              <button
                onClick={() => setShowExamModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Assessment Title
                </label>
                <Input
                  required
                  placeholder="e.g. Fall 2026 Algorithms & Data Structures Final"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  placeholder="Provide examination syllabus, instructions, and proctoring expectations..."
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Duration (Minutes)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="360"
                    value={examDuration}
                    onChange={(e) => setExamDuration(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Status
                  </label>
                  <select
                    value={examStatus}
                    onChange={(e) => setExamStatus(e.target.value as any)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  >
                    <option value="ACTIVE">ACTIVE (Open for candidate entry)</option>
                    <option value="SCHEDULED">SCHEDULED (Upcoming exam)</option>
                    <option value="DRAFT">DRAFT (Under review)</option>
                    <option value="COMPLETED">COMPLETED (Concluded)</option>
                  </select>
                </div>
              </div>

              {/* Scheduling Date/Time Pickers */}
              <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Exam Window Scheduling (Optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-300">
                      Starts At (Date & Time)
                    </label>
                    <Input
                      type="datetime-local"
                      className="text-xs"
                      value={examStartsAt}
                      onChange={(e) => setExamStartsAt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-300">
                      Ends At (Date & Time)
                    </label>
                    <Input
                      type="datetime-local"
                      className="text-xs"
                      value={examEndsAt}
                      onChange={(e) => setExamEndsAt(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Leaving these blank allows students to start the exam anytime. Specifying dates restricts access to the given timeframe.
                </p>
              </div>

              {/* Secret Code Enforce Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                    <span>Enforce Secret Access Code</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                    Candidate must enter their unique invitation key before unlocking the code IDE
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={examRequireSecret}
                  onChange={(e) => setExamRequireSecret(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                {editingExamId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setShowExamModal(false);
                      handleDeleteExam(editingExamId, examTitle || 'Exam');
                    }}
                    className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Exam</span>
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowExamModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingExam}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {savingExam ? 'Saving...' : editingExamId ? 'Update Exam' : 'Create Exam'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: CANDIDATE INVITATION & SECRET CODE */}
      {inviteModalExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Invite Student / Candidate</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">{inviteModalExam.title}</p>
              </div>
              <button
                onClick={() => setInviteModalExam(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            {!inviteResult ? (
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Candidate Email Address
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="student@university.edu"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Candidate Name <span className="text-[10px] text-slate-400">(Optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. Alex Morgan"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                  <Button type="button" variant="ghost" onClick={() => setInviteModalExam(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={inviteLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {inviteLoading ? 'Dispatching...' : 'Dispatch Invitation'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 space-y-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Invitation & Secret Code Generated!
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    The student has received an invitation email with this one-time access passcode:
                  </p>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-emerald-400 dark:border-emerald-700 font-mono text-base font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {inviteResult.secretCode}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full text-xs"
                  onClick={() => {
                    setInviteResult(null);
                    setInviteModalExam(null);
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl border border-red-200 dark:border-red-900/60 animate-scaleIn">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    &ldquo;{deleteConfirm.name}&rdquo;
                  </strong>
                  ? {deleteConfirm.type === 'exam' ? 'All candidate submissions, proctoring audit events, and invitations associated with this exam will be removed.' : 'All system records, tests authored, and permissions for this user will be removed.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-300">
              ⚠️ <strong>Warning:</strong> This operation is permanent and cannot be reversed.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
              <Button
                type="button"
                variant="ghost"
                disabled={deleteConfirm.isDeleting}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteConfirm.isDeleting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteConfirm.isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
