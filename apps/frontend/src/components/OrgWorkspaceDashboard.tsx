'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  api,
  UserProfile,
  StaffMember,
  TestItem,
  CandidateItem,
  TestInvitationItem,
  ResultItem,
} from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  GraduationCap,
  Briefcase,
  LayoutDashboard,
  FileCheck2,
  Users,
  UserCheck,
  Send,
  BarChart3,
  Settings,
  Plus,
  Upload,
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Sparkles,
  ExternalLink,
  Trash2,
  Copy,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface OrgWorkspaceDashboardProps {
  orgType: 'COLLEGE' | 'COMPANY';
  staffRole: 'TEACHER' | 'RECRUITER';
  staffLabel: string; // "Teacher" | "Recruiter"
  orgLabel: string; // "College" | "Company"
  themeColor: 'purple' | 'emerald' | 'blue';
  dashboardType?: 'COLLEGE_ADMIN' | 'TEACHER' | 'COMPANY_ADMIN' | 'RECRUITER';
  dashboardTitle?: string;
  subtitle?: string;
}

export default function OrgWorkspaceDashboard({
  orgType,
  staffRole,
  staffLabel,
  orgLabel,
  themeColor,
  dashboardType,
  dashboardTitle,
  subtitle,
}: OrgWorkspaceDashboardProps) {
  const router = useRouter();

  const pageTitle = dashboardTitle || `${orgLabel} Workspace`;
  const pageSubtitle = subtitle || (dashboardType === 'COLLEGE_ADMIN'
    ? 'College Institution Administration & Faculty Management'
    : dashboardType === 'TEACHER'
    ? 'Classroom Assessments, Tests & Grading Workbench'
    : dashboardType === 'COMPANY_ADMIN'
    ? 'Enterprise Hiring Headquarters & Recruiter Oversight'
    : dashboardType === 'RECRUITER'
    ? 'Technical Screening & Candidate Evaluation Hub'
    : `${orgLabel} Management & Examination Workspace`);

  const tabsList = (() => {
    if (dashboardType === 'COLLEGE_ADMIN') {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tests', label: 'College Exams', icon: FileCheck2 },
        { id: 'staff', label: 'Faculty Staff', icon: Users },
        { id: 'candidates', label: 'Enrolled Students', icon: UserCheck },
        { id: 'invitations', label: 'Exam Invitations', icon: Send },
        { id: 'results', label: 'Academic Results', icon: BarChart3 },
        { id: 'settings', label: 'College Settings', icon: Settings },
      ];
    }
    if (dashboardType === 'TEACHER') {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tests', label: 'My Tests & Challenges', icon: FileCheck2 },
        { id: 'candidates', label: 'My Students', icon: UserCheck },
        { id: 'invitations', label: 'Send Invitations', icon: Send },
        { id: 'results', label: 'Student Results', icon: BarChart3 },
        { id: 'staff', label: 'Department Faculty', icon: Users },
      ];
    }
    if (dashboardType === 'COMPANY_ADMIN') {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tests', label: 'Hiring Assessments', icon: FileCheck2 },
        { id: 'staff', label: 'Recruiters Team', icon: Users },
        { id: 'candidates', label: 'Candidate Pool', icon: UserCheck },
        { id: 'invitations', label: 'Test Invites', icon: Send },
        { id: 'results', label: 'Hiring Results', icon: BarChart3 },
        { id: 'settings', label: 'Company Settings', icon: Settings },
      ];
    }
    if (dashboardType === 'RECRUITER') {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tests', label: 'My Assessments', icon: FileCheck2 },
        { id: 'candidates', label: 'Candidates', icon: UserCheck },
        { id: 'invitations', label: 'Send Test Invites', icon: Send },
        { id: 'results', label: 'Evaluation Results', icon: BarChart3 },
        { id: 'staff', label: 'Recruiting Team', icon: Users },
      ];
    }
    return [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'tests', label: 'Tests', icon: FileCheck2 },
      { id: 'staff', label: `${staffLabel}s`, icon: Users },
      { id: 'candidates', label: orgType === 'COLLEGE' ? 'Students' : 'Candidates', icon: UserCheck },
      { id: 'invitations', label: 'Invitations', icon: Send },
      { id: 'results', label: 'Results', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  })();

  // Session State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Unauthenticated Forms
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Registration form fields
  const [regOrgName, setRegOrgName] = useState('');
  const [regOrgEmail, setRegOrgEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regCountry, setRegCountry] = useState('United States');
  const [regWebsite, setRegWebsite] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminEmail, setRegAdminEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Active Tab: 'overview' | 'tests' | 'staff' | 'candidates' | 'invitations' | 'results' | 'settings'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'tests' | 'staff' | 'candidates' | 'invitations' | 'results' | 'settings'
  >('overview');

  // Dashboard Data
  const [tests, setTests] = useState<TestItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [invitations, setInvitations] = useState<TestInvitationItem[]>([]);
  const [resultsData, setResultsData] = useState<{
    summary?: any;
    results: ResultItem[];
  }>({ results: [] });
  const [loadingData, setLoadingData] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>('');

  // Modals
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showIssueInviteModal, setShowIssueInviteModal] = useState(false);

  // Forms state inside modals
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [newTestDuration, setNewTestDuration] = useState('60');
  const [newTestPassMarks, setNewTestPassMarks] = useState('50');
  const [newTestAccessCode, setNewTestAccessCode] = useState('');
  const [newTestInstructions, setNewTestInstructions] = useState('');

  // Staff creation form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffDesignation, setStaffDesignation] = useState('');
  const [staffDepartment, setStaffDepartment] = useState('');
  const [staffDegree, setStaffDegree] = useState('');
  const [staffSuccessMsg, setStaffSuccessMsg] = useState<string | null>(null);

  // Candidate creation form
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [csvText, setCsvText] = useState('');

  // Question creation form
  const [qTestId, setQTestId] = useState('');
  const [qText, setQText] = useState('');
  const [qMarks, setQMarks] = useState('5');
  const [qNegMarks, setQNegMarks] = useState('1');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrectOpt, setQCorrectOpt] = useState('A');
  const [qExplanation, setQExplanation] = useState('');

  // Invitations form
  const [inviteTestId, setInviteTestId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Alert banner
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check stored session on mount
  useEffect(() => {
    try {
      const storedToken =
        sessionStorage.getItem('exam_forge_token') ||
        (staffRole === 'TEACHER' ? sessionStorage.getItem('teacher_token') : sessionStorage.getItem('recruiter_token'));
      const storedUser =
        sessionStorage.getItem('exam_forge_user') ||
        (staffRole === 'TEACHER' ? sessionStorage.getItem('teacher_user') : sessionStorage.getItem('recruiter_user'));

      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsed);
      }
    } catch {
      // Ignored
    } finally {
      setAuthChecking(false);
    }
  }, [staffRole]);

  // Load dashboard data when token is available
  useEffect(() => {
    if (token) {
      loadAllData(token);
    }
  }, [token]);

  const loadAllData = async (authToken: string) => {
    setLoadingData(true);
    try {
      const [testsRes, staffRes, candRes] = await Promise.all([
        api.getTests(authToken).catch(() => []),
        staffRole === 'TEACHER'
          ? api.getTeachers(authToken).catch(() => [])
          : api.getRecruiters(authToken).catch(() => []),
        api.getCandidates(authToken).catch(() => []),
      ]);

      setTests(testsRes);
      setStaffList(staffRes);
      setCandidates(candRes);

      if (testsRes.length > 0) {
        const firstTestId = testsRes[0].id;
        setSelectedTestId(firstTestId);
        setQTestId(firstTestId);
        setInviteTestId(firstTestId);

        // Fetch invitations & results for first test
        const [invRes, resultsRes] = await Promise.all([
          api.getInvitations(authToken, firstTestId).catch(() => []),
          api.getTestResults(authToken, firstTestId).catch(() => ({ results: [] })),
        ]);
        setInvitations(invRes);
        setResultsData(resultsRes);
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to load workspace data.' });
    } finally {
      setLoadingData(false);
    }
  };

  // Switch selected test for invitations & results tab
  const handleSelectTest = async (testId: string) => {
    setSelectedTestId(testId);
    if (!token) return;
    try {
      const [invRes, resultsRes] = await Promise.all([
        api.getInvitations(token, testId).catch(() => []),
        api.getTestResults(token, testId).catch(() => ({ results: [] })),
      ]);
      setInvitations(invRes);
      setResultsData(resultsRes);
    } catch {
      // Ignored
    }
  };

  // Instant Organization Registration Handler
  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    const payload = {
      phone: regPhone,
      address: regAddress,
      city: regCity,
      state: regState,
      country: regCountry,
      website: regWebsite || undefined,
      adminName: regAdminName,
      adminEmail: regAdminEmail,
      password: regPassword,
    };

    try {
      let res;
      if (orgType === 'COLLEGE') {
        res = await api.registerCollege({
          ...payload,
          collegeName: regOrgName,
          collegeEmail: regOrgEmail,
        });
      } else {
        res = await api.registerCompany({
          ...payload,
          companyName: regOrgName,
          companyEmail: regOrgEmail,
        });
      }

      setToken(res.token);
      setUser(res.admin);
      sessionStorage.setItem('exam_forge_token', res.token);
      sessionStorage.setItem('exam_forge_user', JSON.stringify(res.admin));
      setBannerMsg({ type: 'success', text: `Welcome to ExamForge! Your ${orgLabel} workspace is active.` });
    } catch (err: any) {
      setRegError(err.message || 'Organization registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      if (res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        sessionStorage.setItem('exam_forge_token', res.token);
        sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
        if (staffRole === 'TEACHER') {
          sessionStorage.setItem('teacher_token', res.token);
          sessionStorage.setItem('teacher_user', JSON.stringify(res.user));
        } else {
          sessionStorage.setItem('recruiter_token', res.token);
          sessionStorage.setItem('recruiter_user', JSON.stringify(res.user));
        }
      } else {
        throw new Error('Login credentials did not produce an active session.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify email and password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    router.push('/');
  };

  // 1. Create Test
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTestTitle.trim()) return;

    try {
      const created = await api.createTest(token, {
        title: newTestTitle.trim(),
        description: newTestDesc.trim() || undefined,
        durationMinutes: parseInt(newTestDuration, 10) || 60,
        passMarks: parseFloat(newTestPassMarks) || 50,
        accessCode: newTestAccessCode.trim() || undefined,
        instructions: newTestInstructions.trim() || undefined,
      });

      setTests((prev) => [created, ...prev]);
      setShowCreateTestModal(false);
      setNewTestTitle('');
      setNewTestDesc('');
      setNewTestAccessCode('');
      setBannerMsg({ type: 'success', text: `Test "${created.title}" drafted successfully!` });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to create test.' });
    }
  };

  // 2. Publish Test
  const handlePublishTest = async (testId: string) => {
    if (!token) return;
    try {
      const res = await api.publishTest(token, testId);
      setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, status: 'PUBLISHED' } : t)));
      setBannerMsg({ type: 'success', text: `Test is now PUBLISHED and ready for candidates!` });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to publish test.' });
    }
  };

  // 3. Delete Test
  const handleDeleteTest = async (testId: string) => {
    if (!token || !confirm('Are you sure you want to delete this test?')) return;
    try {
      await api.deleteTest(token, testId);
      setTests((prev) => prev.filter((t) => t.id !== testId));
      setBannerMsg({ type: 'success', text: 'Test deleted successfully.' });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to delete test.' });
    }
  };

  // 4. Add Question to Test
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !qTestId || !qText.trim()) return;

    try {
      const options = [
        { id: 'A', text: qOptA || 'Option A' },
        { id: 'B', text: qOptB || 'Option B' },
        { id: 'C', text: qOptC || 'Option C' },
        { id: 'D', text: qOptD || 'Option D' },
      ];

      await api.addQuestion(token, qTestId, {
        text: qText.trim(),
        type: 'MULTIPLE_CHOICE',
        options,
        correctAnswers: [qCorrectOpt],
        marks: parseFloat(qMarks) || 5,
        negativeMarks: parseFloat(qNegMarks) || 0,
        explanation: qExplanation.trim() || undefined,
      });

      setShowAddQuestionModal(false);
      setQText('');
      setQOptA('');
      setQOptB('');
      setQOptC('');
      setQOptD('');
      setBannerMsg({ type: 'success', text: 'Multiple choice question added to assessment!' });
      loadAllData(token);
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to add question.' });
    }
  };

  // 5. Add Staff (Teacher / Recruiter) & Send Invitation Link
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !staffEmail.trim() || !staffName.trim()) return;

    try {
      let res;
      if (staffRole === 'TEACHER') {
        res = await api.createTeacher(token, {
          name: staffName.trim(),
          email: staffEmail.trim(),
          phone: staffPhone.trim() || undefined,
          designation: staffDesignation.trim() || undefined,
          department: staffDepartment.trim() || undefined,
          degree: staffDegree.trim() || undefined,
        });
      } else {
        res = await api.createRecruiter(token, {
          name: staffName.trim(),
          email: staffEmail.trim(),
          phone: staffPhone.trim() || undefined,
          designation: staffDesignation.trim() || undefined,
          department: staffDepartment.trim() || undefined,
        });
      }

      setStaffList((prev) => [res.user, ...prev]);
      setStaffSuccessMsg(res.message);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setBannerMsg({ type: 'success', text: `Invitation link dispatched to ${res.user.email}!` });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to invite staff member.' });
    }
  };

  // 6. Add Single Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !candEmail.trim() || !candName.trim()) return;

    try {
      const created = await api.createCandidate(token, {
        name: candName.trim(),
        email: candEmail.trim(),
        phone: candPhone.trim() || undefined,
        testId: selectedTestId || undefined,
      });

      setCandidates((prev) => [created, ...prev]);
      setShowAddCandidateModal(false);
      setCandName('');
      setCandEmail('');
      setCandPhone('');
      setBannerMsg({ type: 'success', text: `Candidate ${created.fullName} registered successfully.` });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to add candidate.' });
    }
  };

  // 7. Bulk CSV Upload
  const handleBulkCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !csvText.trim()) return;

    try {
      const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
      const rows: Array<{ name: string; email: string; phone?: string }> = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 2 && parts[1].includes('@')) {
          rows.push({
            name: parts[0],
            email: parts[1],
            phone: parts[2] || undefined,
          });
        }
      }

      if (rows.length === 0) {
        throw new Error('No valid candidate rows found. Please use CSV format: Name, Email, Phone');
      }

      const res = await api.bulkImportCandidatesCsv(token, rows);
      setCandidates((prev) => [...res.candidates, ...prev]);
      setShowCsvModal(false);
      setCsvText('');
      setBannerMsg({ type: 'success', text: `Successfully imported ${res.count} candidates from CSV!` });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'CSV Import failed.' });
    }
  };

  // 8. Bulk Issue Test Invitations
  const handleBulkInvite = async () => {
    if (!token || !inviteTestId || selectedCandidateIds.length === 0) return;

    try {
      const res = await api.bulkInviteCandidates(token, {
        testId: inviteTestId,
        candidateIds: selectedCandidateIds,
      });

      setShowIssueInviteModal(false);
      setSelectedCandidateIds([]);
      setBannerMsg({
        type: 'success',
        text: `Dispatched ${res.count} test invitations with secure links!`,
      });

      const invRes = await api.getInvitations(token, inviteTestId);
      setInvitations(invRes);
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to issue invitations.' });
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ==========================================
  // VIEW 1: UNAUTHENTICATED (REGISTER / LOGIN)
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
        <header className="border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              {orgType === 'COLLEGE' ? <GraduationCap className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Exam<span className="text-purple-400">Forge</span>
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                {orgLabel} Portal
              </span>
            </div>
          </Link>

          <Link href="/" className="text-xs text-neutral-400 hover:text-white">
            ← Return to Homepage
          </Link>
        </header>

        <main className="max-w-xl mx-auto px-6 py-12 flex-1 w-full flex flex-col justify-center">
          <Card className="p-8 bg-neutral-900/90 border-neutral-800 shadow-2xl space-y-6">
            <div className="flex border-b border-neutral-800 pb-3 gap-4">
              <button
                type="button"
                onClick={() => setAuthTab('LOGIN')}
                className={`pb-2 text-sm font-bold border-b-2 transition ${
                  authTab === 'LOGIN'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign In to {orgLabel}
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('REGISTER')}
                className={`pb-2 text-sm font-bold border-b-2 transition ${
                  authTab === 'REGISTER'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Register New {orgLabel} (Instant Active)
              </button>
            </div>

            {/* TAB A: LOGIN */}
            {authTab === 'LOGIN' && (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Staff / Admin Email Address</label>
                  <Input
                    type="email"
                    required
                    placeholder="e.g. administrator@institution.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Password</label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-2"
                >
                  {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>Sign In to {pageTitle}</span>
                </Button>

                {/* Quick 1-Click Role Presets for testing */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-center">
                    Instant Test Credentials
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {orgType === 'COLLEGE' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('college.admin@stanford.edu');
                            setLoginPassword('password12345');
                          }}
                          className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-xs transition"
                        >
                          <div className="font-bold text-emerald-400">College Admin</div>
                          <div className="text-[10px] text-neutral-400">college.admin@stanford.edu</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('teacher@example.com');
                            setLoginPassword('password12345');
                          }}
                          className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-xs transition"
                        >
                          <div className="font-bold text-emerald-400">Teacher</div>
                          <div className="text-[10px] text-neutral-400">teacher@example.com</div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('company.admin@acme.corp');
                            setLoginPassword('password12345');
                          }}
                          className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-xs transition"
                        >
                          <div className="font-bold text-blue-400">Company Admin</div>
                          <div className="text-[10px] text-neutral-400">company.admin@acme.corp</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('recruiter@example.com');
                            setLoginPassword('password12345');
                          }}
                          className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-xs transition"
                        >
                          <div className="font-bold text-blue-400">Recruiter</div>
                          <div className="text-[10px] text-neutral-400">recruiter@example.com</div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* TAB B: INSTANT REGISTRATION */}
            {authTab === 'REGISTER' && (
              <form onSubmit={handleRegisterOrg} className="space-y-3.5">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Institutional self-onboarding creates your organization and initial administrator account immediately
                  without manual verification.
                </p>

                {regError && (
                  <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">{orgLabel} Name *</label>
                    <Input
                      required
                      placeholder={orgType === 'COLLEGE' ? 'e.g. Stanford University' : 'e.g. Stripe Inc.'}
                      value={regOrgName}
                      onChange={(e) => setRegOrgName(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Official {orgLabel} Email *</label>
                    <Input
                      type="email"
                      required
                      placeholder={orgType === 'COLLEGE' ? 'admissions@stanford.edu' : 'contact@stripe.com'}
                      value={regOrgEmail}
                      onChange={(e) => setRegOrgEmail(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Phone Number *</label>
                    <Input
                      required
                      placeholder="+1 (555) 019-2834"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Official Website (Optional)</label>
                    <Input
                      placeholder="https://organization.edu"
                      value={regWebsite}
                      onChange={(e) => setRegWebsite(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Address *</label>
                    <Input
                      required
                      placeholder="Street address"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">City *</label>
                    <Input
                      required
                      placeholder="City"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">State / Province *</label>
                    <Input
                      required
                      placeholder="State"
                      value={regState}
                      onChange={(e) => setRegState(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <h4 className="text-xs font-bold text-purple-400 mb-2">Initial Organization Administrator</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-400">Admin Full Name *</label>
                      <Input
                        required
                        placeholder="e.g. Dean Sarah Connor"
                        value={regAdminName}
                        onChange={(e) => setRegAdminName(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-400">Admin Email Address *</label>
                      <Input
                        type="email"
                        required
                        placeholder="sconnor@institution.edu"
                        value={regAdminEmail}
                        onChange={(e) => setRegAdminEmail(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 mt-2.5">
                    <label className="text-[11px] font-semibold text-neutral-400">Admin Password (min. 8 chars) *</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={regLoading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-2 mt-2"
                >
                  {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Complete Registration & Open Dashboard</span>
                </Button>
              </form>
            )}
          </Card>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: AUTHENTICATED WORKSPACE DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800/80 px-6 py-3 flex items-center justify-between bg-neutral-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            {orgType === 'COLLEGE' ? <GraduationCap className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white">ExamForge</span>
            <span className="ml-2 text-xs text-neutral-400 font-medium">
              {user?.organization?.name || `${orgLabel} Workspace`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{user?.fullName}</div>
            <div className="text-[10px] text-purple-400 font-mono">{user?.role}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-neutral-800 text-neutral-400 hover:text-white text-xs flex items-center gap-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Navigation Sub-header */}
      <div className="border-b border-neutral-800/60 bg-neutral-900/30 px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner Feedback */}
      {bannerMsg && (
        <div
          className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-950/70 text-emerald-300 border-b border-emerald-800'
              : 'bg-red-950/70 text-red-300 border-b border-red-800'
          }`}
        >
          <span>{bannerMsg.text}</span>
          <button type="button" onClick={() => setBannerMsg(null)} className="font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-5 bg-neutral-900/60 border-neutral-800 space-y-1">
                <span className="text-xs text-neutral-400 font-medium">Total Tests</span>
                <div className="text-2xl font-black text-white">{tests.length}</div>
              </Card>
              <Card className="p-5 bg-neutral-900/60 border-neutral-800 space-y-1">
                <span className="text-xs text-neutral-400 font-medium">Active {staffLabel}s</span>
                <div className="text-2xl font-black text-purple-400">{staffList.length}</div>
              </Card>
              <Card className="p-5 bg-neutral-900/60 border-neutral-800 space-y-1">
                <span className="text-xs text-neutral-400 font-medium">Candidates Enrolled</span>
                <div className="text-2xl font-black text-white">{candidates.length}</div>
              </Card>
              <Card className="p-5 bg-neutral-900/60 border-neutral-800 space-y-1">
                <span className="text-xs text-neutral-400 font-medium">Exam Invitations</span>
                <div className="text-2xl font-black text-emerald-400">{invitations.length}</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Tests */}
              <Card className="p-6 bg-neutral-900/60 border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-purple-400" />
                    Recent Assessments
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateTestModal(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New Test
                  </Button>
                </div>
                {tests.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4">No tests created yet. Click "New Test" to draft your first assessment.</p>
                ) : (
                  <div className="space-y-2">
                    {tests.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">{t.title}</span>
                          <div className="text-neutral-500 text-[11px]">{t.durationMinutes} mins • Pass: {t.passMarks}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <Card className="p-6 bg-neutral-900/60 border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-purple-600/50 text-left transition space-y-1"
                  >
                    <Users className="h-4 w-4 text-purple-400" />
                    <div className="text-xs font-bold text-white">Add {staffLabel}</div>
                    <div className="text-[11px] text-neutral-400">Send account invite</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCandidateModal(true)}
                    className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-purple-600/50 text-left transition space-y-1"
                  >
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <div className="text-xs font-bold text-white">Enroll Candidate</div>
                    <div className="text-[11px] text-neutral-400">Single addition</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(true)}
                    className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-purple-600/50 text-left transition space-y-1"
                  >
                    <Upload className="h-4 w-4 text-blue-400" />
                    <div className="text-xs font-bold text-white">Bulk CSV Upload</div>
                    <div className="text-[11px] text-neutral-400">Batch import students</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('invitations');
                      setShowIssueInviteModal(true);
                    }}
                    className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-purple-600/50 text-left transition space-y-1"
                  >
                    <Send className="h-4 w-4 text-amber-400" />
                    <div className="text-xs font-bold text-white">Issue Invitations</div>
                    <div className="text-[11px] text-neutral-400">Generate secure URLs</div>
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TESTS */}
        {/* ========================================================= */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Assessment Tests</h2>
                <p className="text-xs text-neutral-400">
                  Manage test lifecycle: DRAFT → PUBLISHED → ACTIVE → COMPLETED
                </p>
              </div>
              <Button
                onClick={() => setShowCreateTestModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-xs flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Test</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map((test) => (
                <Card key={test.id} className="p-5 bg-neutral-900/60 border-neutral-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                        {test.status}
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {test.durationMinutes}m
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white">{test.title}</h3>
                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {test.description || 'No description provided.'}
                    </p>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-3 pt-1">
                      <span>Total: {test.totalMarks} pts</span>
                      <span>Pass: {test.passMarks} pts</span>
                      {test.accessCode && <span className="text-amber-400 font-mono">Code: {test.accessCode}</span>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQTestId(test.id);
                        setShowAddQuestionModal(true);
                      }}
                      className="border-neutral-800 text-neutral-300 hover:text-white text-xs flex-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Question
                    </Button>

                    {test.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        onClick={() => handlePublishTest(test.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex-1"
                      >
                        Publish
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteTest(test.id)}
                      className="p-2 rounded text-neutral-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STAFF (TEACHERS / RECRUITERS) */}
        {/* ========================================================= */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{staffLabel} Management</h2>
                <p className="text-xs text-neutral-400">
                  Invite {staffLabel.toLowerCase()}s with single-use cryptographic invitation tokens
                </p>
              </div>
              <Button
                onClick={() => setShowAddStaffModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-xs flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Invite {staffLabel}</span>
              </Button>
            </div>

            <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400">
                  <tr>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Designation</th>
                    <th className="p-3.5">Department</th>
                    {orgType === 'COLLEGE' && <th className="p-3.5">Degree</th>}
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-neutral-900/40">
                      <td className="p-3.5 font-semibold text-white">{st.fullName}</td>
                      <td className="p-3.5 text-neutral-400 font-mono">{st.email}</td>
                      <td className="p-3.5">{st.designation || 'Faculty'}</td>
                      <td className="p-3.5">{st.department || 'General'}</td>
                      {orgType === 'COLLEGE' && <td className="p-3.5">{st.degree || 'Ph.D / M.Tech'}</td>}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            st.isActive
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {st.isActive ? 'ACTIVE' : 'INVITED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CANDIDATES */}
        {/* ========================================================= */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Candidates Roster</h2>
                <p className="text-xs text-neutral-400">
                  Registered test candidates (password-less token + OTP access)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCsvModal(true)}
                  className="border-neutral-800 text-neutral-300 text-xs flex items-center gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  <span>CSV Import</span>
                </Button>
                <Button
                  onClick={() => setShowAddCandidateModal(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-xs flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Candidate</span>
                </Button>
              </div>
            </div>

            <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400">
                  <tr>
                    <th className="p-3.5">Candidate Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5">Invitations Sent</th>
                    <th className="p-3.5">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-neutral-900/40">
                      <td className="p-3.5 font-semibold text-white">{cand.fullName}</td>
                      <td className="p-3.5 text-neutral-400 font-mono">{cand.email}</td>
                      <td className="p-3.5">{cand.phone || '—'}</td>
                      <td className="p-3.5 font-mono">{cand._count?.invitations || 0}</td>
                      <td className="p-3.5 text-neutral-500">
                        {new Date(cand.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: INVITATIONS */}
        {/* ========================================================= */}
        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Test Invitations & Link Dispatch</h2>
                <p className="text-xs text-neutral-400">
                  Track candidate lifecycle: INVITED → EMAIL_SENT → OPENED → OTP_VERIFIED → STARTED → COMPLETED
                </p>
              </div>
              <Button
                onClick={() => setShowIssueInviteModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-xs flex items-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                <span>Issue Invitations</span>
              </Button>
            </div>

            {/* Test Selector */}
            {tests.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 font-medium">Filter by Test:</span>
                <select
                  value={selectedTestId}
                  onChange={(e) => handleSelectTest(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400">
                  <tr>
                    <th className="p-3.5">Candidate Email</th>
                    <th className="p-3.5">Candidate Name</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Sent At</th>
                    <th className="p-3.5">OTP Verified</th>
                    <th className="p-3.5">Direct Exam Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {invitations.map((inv) => {
                    const examUrl = `${window.location.origin}/exam/take?token=${inv.invitationToken}`;
                    return (
                      <tr key={inv.id} className="hover:bg-neutral-900/40">
                        <td className="p-3.5 font-mono text-white">{inv.candidateEmail}</td>
                        <td className="p-3.5">{inv.candidate?.fullName || '—'}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-500">
                          {inv.sentAt ? new Date(inv.sentAt).toLocaleTimeString() : '—'}
                        </td>
                        <td className="p-3.5 text-neutral-500">
                          {inv.otpVerifiedAt ? '✓ Verified' : 'Pending'}
                        </td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(examUrl);
                              alert('Exam URL copied to clipboard!');
                            }}
                            className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs font-mono"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy URL</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: RESULTS */}
        {/* ========================================================= */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Assessment Results & Analytics</h2>
                <p className="text-xs text-neutral-400">Scorecards and candidate evaluation performance</p>
              </div>

              {tests.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Test:</span>
                  <select
                    value={selectedTestId}
                    onChange={(e) => handleSelectTest(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    {tests.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {resultsData.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-neutral-900/60 border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400">Submissions</span>
                  <div className="text-xl font-bold text-white">{resultsData.summary.totalSubmissions}</div>
                </Card>
                <Card className="p-4 bg-neutral-900/60 border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400">Pass Rate</span>
                  <div className="text-xl font-bold text-emerald-400">{resultsData.summary.passRate}%</div>
                </Card>
                <Card className="p-4 bg-neutral-900/60 border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400">Average Score</span>
                  <div className="text-xl font-bold text-purple-400">{resultsData.summary.averageScore} pts</div>
                </Card>
                <Card className="p-4 bg-neutral-900/60 border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400">Passed / Failed</span>
                  <div className="text-xl font-bold text-white">
                    {resultsData.summary.passedCount} / {resultsData.summary.failedCount}
                  </div>
                </Card>
              </div>
            )}

            <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400">
                  <tr>
                    <th className="p-3.5">Candidate Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Score</th>
                    <th className="p-3.5">Percentage</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {resultsData.results.map((res) => (
                    <tr key={res.id} className="hover:bg-neutral-900/40">
                      <td className="p-3.5 font-semibold text-white">{res.candidate?.fullName}</td>
                      <td className="p-3.5 font-mono text-neutral-400">{res.candidate?.email}</td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        {res.totalScore} / {res.maxScore}
                      </td>
                      <td className="p-3.5 font-mono">{res.percentage}%</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            res.isPassed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {res.isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-neutral-500">
                        {new Date(res.submittedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: SETTINGS */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">{orgLabel} Organization Profile</h2>
              <p className="text-xs text-neutral-400">Institutional settings and administrative metadata</p>
            </div>

            <Card className="p-6 bg-neutral-900/60 border-neutral-800 space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">{orgLabel} Name:</span>
                <span className="font-bold text-white">{user?.organization?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">Official Contact Email:</span>
                <span className="font-mono text-white">{user?.organization?.officialEmail}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">Organization Type:</span>
                <span className="font-mono text-purple-400">{user?.organization?.type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">City / Country:</span>
                <span className="text-white">
                  {user?.organization?.city || 'N/A'}, {user?.organization?.country || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-400">Organization Administrator:</span>
                <span className="font-bold text-white">{user?.fullName} ({user?.email})</span>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE TEST */}
      {/* ========================================================= */}
      {showCreateTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 bg-neutral-900 border-neutral-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create New Assessment Test</h3>
            <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Test Title *</label>
                <Input
                  required
                  placeholder="e.g. Midterm Data Structures & Algorithms"
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Description (Optional)</label>
                <Input
                  placeholder="Assessment scope, topics covered..."
                  value={newTestDesc}
                  onChange={(e) => setNewTestDesc(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Duration (Minutes) *</label>
                  <Input
                    type="number"
                    required
                    value={newTestDuration}
                    onChange={(e) => setNewTestDuration(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Pass Marks *</label>
                  <Input
                    type="number"
                    required
                    value={newTestPassMarks}
                    onChange={(e) => setNewTestPassMarks(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Secret Access Code (Optional)</label>
                <Input
                  placeholder="e.g. EXAM2026"
                  value={newTestAccessCode}
                  onChange={(e) => setNewTestAccessCode(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTestModal(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  Draft Test
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD QUESTION */}
      {/* ========================================================= */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-xl w-full p-6 bg-neutral-900 border-neutral-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Add Multiple Choice Question</h3>
            <form onSubmit={handleAddQuestion} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Question Prompt *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the question text here..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 p-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Marks for Correct *</label>
                  <Input
                    type="number"
                    value={qMarks}
                    onChange={(e) => setQMarks(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Negative Marks *</label>
                  <Input
                    type="number"
                    value={qNegMarks}
                    onChange={(e) => setQNegMarks(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-neutral-400 font-semibold">Answer Options *</label>
                <div className="flex items-center gap-2">
                  <span className="w-6 font-mono text-purple-400 font-bold">A.</span>
                  <Input
                    required
                    placeholder="Option A text"
                    value={qOptA}
                    onChange={(e) => setQOptA(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 font-mono text-purple-400 font-bold">B.</span>
                  <Input
                    required
                    placeholder="Option B text"
                    value={qOptB}
                    onChange={(e) => setQOptB(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 font-mono text-purple-400 font-bold">C.</span>
                  <Input
                    placeholder="Option C text"
                    value={qOptC}
                    onChange={(e) => setQOptC(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 font-mono text-purple-400 font-bold">D.</span>
                  <Input
                    placeholder="Option D text"
                    value={qOptD}
                    onChange={(e) => setQOptD(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Select Correct Answer *</label>
                <select
                  value={qCorrectOpt}
                  onChange={(e) => setQCorrectOpt(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white text-xs"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  Save Question
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD STAFF (TEACHER / RECRUITER) */}
      {/* ========================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-neutral-900 border-neutral-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Invite {staffLabel} to Workspace</h3>
            <p className="text-xs text-neutral-400">
              An invitation email will be dispatched with a single-use account activation link.
            </p>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">{staffLabel} Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Email Address *</label>
                <Input
                  type="email"
                  required
                  placeholder="staff@institution.edu"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Designation</label>
                  <Input
                    placeholder="Associate Professor"
                    value={staffDesignation}
                    onChange={(e) => setStaffDesignation(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Department</label>
                  <Input
                    placeholder="Computer Science"
                    value={staffDepartment}
                    onChange={(e) => setStaffDepartment(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
              </div>

              {orgType === 'COLLEGE' && (
                <div>
                  <label className="block text-neutral-400 mb-1">Academic Degree</label>
                  <Input
                    placeholder="Ph.D in AI & Algorithms"
                    value={staffDegree}
                    onChange={(e) => setStaffDegree(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddStaffModal(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  Dispatch Invitation
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ADD CANDIDATE */}
      {/* ========================================================= */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-neutral-900 border-neutral-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Enroll Candidate</h3>
            <form onSubmit={handleAddCandidate} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Candidate Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Alex Student"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Candidate Email *</label>
                <Input
                  type="email"
                  required
                  placeholder="student@gmail.com"
                  value={candEmail}
                  onChange={(e) => setCandEmail(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Phone Number (Optional)</label>
                <Input
                  placeholder="+1 (555) 012-3456"
                  value={candPhone}
                  onChange={(e) => setCandPhone(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  Enroll Candidate
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: BULK CSV IMPORT */}
      {/* ========================================================= */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 bg-neutral-900 border-neutral-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Bulk Candidate CSV Import</h3>
            <p className="text-xs text-neutral-400">
              Paste lines in standard CSV format: <code>FullName, Email, Phone</code>
            </p>

            <form onSubmit={handleBulkCsv} className="space-y-3 text-xs">
              <textarea
                rows={6}
                required
                placeholder="Alex Morgan, alex.morgan@stanford.edu, +1555123456&#10;Jordan Lee, jordan.lee@stanford.edu, +1555987654"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 p-2.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
              />

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCsvModal(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  Parse & Import CSV
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: ISSUE INVITATIONS */}
      {/* ========================================================= */}
      {showIssueInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 bg-neutral-900 border-neutral-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Dispatch Test Invitations</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Target Assessment Test *</label>
                <select
                  value={inviteTestId}
                  onChange={(e) => setInviteTestId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white text-xs"
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">
                  Select Candidates to Invite ({selectedCandidateIds.length} selected) *
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-800 rounded-lg p-2 bg-neutral-950/60">
                  {candidates.map((c) => {
                    const isChecked = selectedCandidateIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-neutral-900 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidateIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedCandidateIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-0"
                        />
                        <span className="font-semibold text-white">{c.fullName}</span>
                        <span className="text-neutral-500 font-mono">({c.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIssueInviteModal(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={selectedCandidateIds.length === 0}
                  onClick={handleBulkInvite}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
                >
                  Dispatch {selectedCandidateIds.length} Invitations
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
