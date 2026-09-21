'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  GraduationCap,
  Users,
  KeyRound,
  Copy,
  Check,
  Plus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  LogOut,
  ExternalLink,
  Lock,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Filter,
  UserCheck,
  UserX,
  ArrowRight,
  School,
  Layers,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { api, StaffMember, UserProfile } from '@/lib/api';
import PaperboatLogo from '@/components/PaperboatLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function CollegeAdminDashboardPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'faculty' | 'college-info' | 'quick-erp'>('faculty');

  // Faculty State
  const [facultyList, setFacultyList] = useState<StaffMember[]>([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Secret code copy state
  const [copiedCode, setCopiedCode] = useState(false);

  // Add Faculty Modal
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    degree: 'Ph.D. in Computer Science',
  });
  const [facultyError, setFacultyError] = useState<string | null>(null);
  const [isSubmittingFaculty, setIsSubmittingFaculty] = useState(false);

  // College Info Form
  const [collegeForm, setCollegeForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    website: '',
  });
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);
  const [orgUpdateSuccess, setOrgUpdateSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('exam_forge_token');
    if (!savedToken) {
      router.push('/college/login');
      return;
    }

    setToken(savedToken);
    loadDashboard(savedToken);
  }, [router]);

  const loadDashboard = async (authToken: string) => {
    setIsLoading(true);
    try {
      const me = await api.getMe(authToken);
      setUser(me);

      if (me.role !== 'ORG_ADMIN' && me.role !== 'SUPER_ADMIN') {
        router.push('/college/login');
        return;
      }

      const currentOrg = await api.getCurrentOrganization(authToken).catch(() => null);
      if (currentOrg) {
        setOrgDetails(currentOrg);
        setCollegeForm({
          name: currentOrg.name || '',
          phone: currentOrg.phone || '',
          address: currentOrg.address || '',
          city: currentOrg.city || '',
          state: currentOrg.state || '',
          country: currentOrg.country || '',
          website: currentOrg.website || '',
        });
      }

      await fetchFaculty(authToken);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/college/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFaculty = async (authToken: string) => {
    setIsLoadingFaculty(true);
    try {
      const teachers = await api.getTeachers(authToken);
      setFacultyList(teachers);
    } catch {
      setFacultyList([]);
    } finally {
      setIsLoadingFaculty(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFacultyError(null);
    setIsSubmittingFaculty(true);

    try {
      await api.createTeacher(token, facultyForm);
      setShowAddFacultyModal(false);
      setFacultyForm({
        name: '',
        email: '',
        phone: '',
        department: 'Computer Science & Engineering',
        designation: 'Assistant Professor',
        degree: 'Ph.D. in Computer Science',
      });
      await fetchFaculty(token);
    } catch (err: any) {
      setFacultyError(err.message || 'Failed to add faculty member');
    } finally {
      setIsSubmittingFaculty(false);
    }
  };

  const handleUpdateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsUpdatingOrg(true);
    setOrgUpdateSuccess(null);

    try {
      await api.updateOrganization(token, collegeForm);
      setOrgUpdateSuccess('College information updated successfully!');
      setTimeout(() => setOrgUpdateSuccess(null), 3000);
    } catch (err: any) {
      // Handled
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('exam_forge_token');
    router.push('/college/login');
  };

  const filteredFaculty = facultyList.filter((f) => {
    const facultyName = f.fullName || (f as any).name || '';
    const matchesSearch =
      facultyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || f.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const allDepts = Array.from(new Set(facultyList.map((f) => f.department).filter(Boolean))) as string[];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Loading College ERP Dashboard...</p>
        </div>
      </div>
    );
  }

  const secretCode = orgDetails?.instituteSecretCode || 'STANFORD-7892';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* TOP INSTITUTIONAL HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PaperboatLogo size="sm" variant="badge" href="/" />

            <span className="text-slate-700 hidden sm:inline">/</span>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">
                  {orgDetails?.name || 'College Administration'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  COLLEGE ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{user?.fullName} ({user?.email})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick ERP Links */}
            <Link
              href="/academic"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 border border-slate-700 transition"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Academic ERP & Classes</span>
            </Link>

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-xs font-semibold text-red-300 border border-red-800/80 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD HERO BANNER WITH SECRET CODE */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Institutional Identity & Access Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {orgDetails?.name || 'College Administration'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Manage faculty staff appointments, institutional departments, class structure, and direct student academic progress.
            </p>
          </div>

          {/* INSTITUTE SECRET CODE BADGE */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-xl shadow-emerald-950/30 flex flex-col items-start gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              Institute Secret Code
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-black text-emerald-400 tracking-wider">
                {secretCode}
              </span>
              <button
                onClick={() => handleCopyCode(secretCode)}
                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition"
                title="Copy Secret Code"
              >
                {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 max-w-[220px]">
              Use this code to sign in instantly from any terminal or device.
            </p>
          </div>
        </div>
      </section>

      {/* NAVIGATION TABS */}
      <div className="border-b border-slate-800 bg-slate-950 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => setActiveTab('faculty')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'faculty'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Faculty Members ({facultyList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('college-info')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'college-info'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>College Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('quick-erp')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'quick-erp'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Class & Academic Portals</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENTS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* TAB 1: FACULTY */}
        {activeTab === 'faculty' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search faculty..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {allDepts.length > 0 && (
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Departments</option>
                    {allDepts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={() => setShowAddFacultyModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Appoint Faculty</span>
              </button>
            </div>

            {/* FACULTY GRID */}
            {isLoadingFaculty ? (
              <div className="py-12 text-center text-slate-500">Loading faculty list...</div>
            ) : filteredFaculty.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl">
                <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-300">No faculty members found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click "Appoint Faculty" to add professors and lecturers to this institution.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFaculty.map((f) => (
                  <div
                    key={f.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{f.fullName || (f as any).name}</h4>
                          <p className="text-xs text-emerald-400 mt-0.5 font-medium">{f.designation}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ACTIVE
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                        <p className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                          <span>{f.department}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          <span>{f.email}</span>
                        </p>
                        {f.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-500" />
                            <span>{f.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{f.degree || 'Faculty Member'}</span>
                      <Link
                        href="/teacher"
                        className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>View Hub</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COLLEGE INFO */}
        {activeTab === 'college-info' && (
          <div className="max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              <span>Institutional Information</span>
            </h3>

            {orgUpdateSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{orgUpdateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCollege} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">College / University Name</label>
                <input
                  type="text"
                  required
                  value={collegeForm.name}
                  onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={collegeForm.phone}
                    onChange={(e) => setCollegeForm({ ...collegeForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Website</label>
                  <input
                    type="text"
                    value={collegeForm.website}
                    onChange={(e) => setCollegeForm({ ...collegeForm, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={collegeForm.address}
                  onChange={(e) => setCollegeForm({ ...collegeForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={collegeForm.city}
                    onChange={(e) => setCollegeForm({ ...collegeForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={collegeForm.state}
                    onChange={(e) => setCollegeForm({ ...collegeForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={collegeForm.country}
                    onChange={(e) => setCollegeForm({ ...collegeForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingOrg}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {isUpdatingOrg ? 'Saving Changes...' : 'Save College Profile'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: QUICK ERP PORTAL LINKS */}
        {activeTab === 'quick-erp' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/academic"
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition group"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Academic ERP Hub</h3>
              <p className="text-xs text-slate-400 mt-2">
                Manage academic years, departments, programs, classes, subjects, faculty allocations, and class performance.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span>Enter Academic Hub</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>

            <Link
              href="/teacher"
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition group"
            >
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Teacher Portal</h3>
              <p className="text-xs text-slate-400 mt-2">
                Faculty grading studio, class attendance registers, practical lab evaluation marks, and oral viva assessment.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                <span>Access Teacher View</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>

            <Link
              href="/student"
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition group"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Student Academic Portal</h3>
              <p className="text-xs text-slate-400 mt-2">
                Student self-service dashboard: today's lectures, pending tasks, practical marks, test evaluations, and report cards.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                <span>Preview Student View</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>
        )}
      </main>

      {/* MODAL: ADD FACULTY */}
      {showAddFacultyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Appoint Faculty Member</h3>

            {facultyError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
                {facultyError}
              </div>
            )}

            <form onSubmit={handleAddFaculty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Mitchell"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={facultyForm.email}
                  onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                  placeholder="professor@college.edu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={facultyForm.department}
                    onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={facultyForm.designation}
                    onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Qualification / Degree</label>
                <input
                  type="text"
                  value={facultyForm.degree}
                  onChange={(e) => setFacultyForm({ ...facultyForm, degree: e.target.value })}
                  placeholder="e.g. Ph.D. in Computer Science"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFacultyModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFaculty}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {isSubmittingFaculty ? 'Appointing...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 mt-8">
        <div className="flex items-center gap-2">
          <PaperboatLogo size="sm" variant="icon" showSubtitle={false} />
          <span>&copy; {new Date().getFullYear()} Paperboat Education Systems Inc. Powered by ExamForge Assessment Engine.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/academic" className="hover:text-emerald-400 transition">Academic ERP</Link>
          <Link href="/teacher" className="hover:text-teal-400 transition">Teacher Hub</Link>
          <Link href="/student" className="hover:text-blue-400 transition">Student Portal</Link>
        </div>
      </footer>
    </div>
  );
}
