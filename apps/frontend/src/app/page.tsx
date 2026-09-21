import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Activity,
  BarChart3,
  KeyRound,
  CheckCircle2,
  Lock,
  Sparkles,
  Users,
  Building2,
  Terminal,
  Zap,
  Globe,
  School,
  Layers,
  ChevronRight,
  Clock,
  Award,
  BookOpen,
  FileSpreadsheet,
  Check,
  UserCheck,
  ClipboardCheck,
  Compass,
  Cpu,
  Shield,
  FileText,
} from 'lucide-react';
import PaperboatLogo from '@/components/PaperboatLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-[32rem] h-[32rem] bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ---------------------------------------------------------------- */}
      {/* 1. TOP INSTITUTIONAL NAVIGATION */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-slate-200 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Paperboat Brand */}
          <PaperboatLogo size="md" variant="full" />

          {/* Institutional Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2 text-xs font-semibold">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800">
              <Link
                href="/college"
                className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-sm"
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>College Admin</span>
              </Link>
              <Link
                href="/academic"
                className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-sm"
              >
                <Layers className="h-3.5 w-3.5 text-teal-500" />
                <span>Academic ERP</span>
              </Link>
              <Link
                href="/teacher"
                className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-sm"
              >
                <GraduationCap className="h-3.5 w-3.5 text-cyan-500" />
                <span>Teacher Hub</span>
              </Link>
              <Link
                href="/student"
                className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-sm"
              >
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span>Student Portal</span>
              </Link>
            </div>
          </nav>

          {/* Direct Sign-In CTA & Theme Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 transition flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
              <span>Unified Login</span>
            </Link>
            <Link
              href="/college/login"
              className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <span>College Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* 2. HERO SECTION */}
      {/* ---------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto px-6 py-12 sm:py-16 flex-1 flex flex-col justify-center items-center text-center space-y-12">
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-semibold shadow-inner">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          <span>Paperboat Unified Education ERP • Role-Governed Academic Architecture</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-5 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            The Modern Education ERP for{' '}
            <span className="bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Colleges & Universities
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed max-w-3xl mx-auto">
            <strong className="text-slate-900 dark:text-neutral-200">Paperboat</strong> orchestrates seamless academic governance where <strong className="text-emerald-600 dark:text-emerald-400">Assignment Determines Access</strong>. Powered by the specialized <strong className="text-slate-900 dark:text-white">ExamForge Engine</strong> for class-isolated assessments, 50M practical rubrics, oral vivas, and official report cards.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/college"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition flex items-center gap-2 group"
          >
            <span>Enter College Portal</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/academic"
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 font-bold text-sm transition flex items-center gap-2 shadow-sm"
          >
            <Layers className="h-4 w-4 text-teal-500" />
            <span>Open Academic ERP Suite</span>
          </Link>
          <Link
            href="/student"
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 font-bold text-sm transition flex items-center gap-2 shadow-sm"
          >
            <Users className="h-4 w-4 text-blue-500" />
            <span>Student Learning Portal</span>
          </Link>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 3. FIVE DISTINCT INDEPENDENT ROLE SYSTEMS */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-4 w-full max-w-6xl text-left pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Independent Actor Systems & Dedicated Portals
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Each stakeholder operates inside an isolated, authenticated workspace tailored strictly to their responsibilities
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
              5 INDEPENDENT PORTALS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* PORTAL 1: COLLEGE ADMIN / PRINCIPAL */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-xl group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">College Admin</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      PRINCIPAL
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">Institutional Governance</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Dedicated portal for the Dean and Registrar. Creates Academic Departments, Programs, Academic Years, Classes, and designates Class Teachers.
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-700 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Institute Secret Code Onboarding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Class Teacher Designation & Faculty Registry</span>
                  </div>
                </div>
              </div>
              <Link
                href="/college/dashboard"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Open Principal Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* PORTAL 2: CLASS TEACHER */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-xl group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Class Teacher</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                      DIVISION LEAD
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">Division In-Charge Hub</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Assigned strictly to one division (e.g. BE-COMP-TE-A). Adds curriculum subjects, links Subject Teachers, enrolls students via CSV, marks daily attendance, and issues official semester report cards.
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-700 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span>Add Subjects & Assign Subject Teachers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span>Attendance Register & Report Card Generator</span>
                  </div>
                </div>
              </div>
              <Link
                href="/academic"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Open Class Teacher Hub</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* PORTAL 3: SUBJECT TEACHER */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-xl group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Subject Teacher</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold">
                      COURSE IN-CHARGE
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">Tests, Practicals & Vivas</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Conducts class-restricted unit tests with ExamForge Engine, enters 50M practical rubrics (Exp + Record + Imp + Viva), scores oral vivas, and submits continuous internal assessment marks.
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-700 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                    <span>50M Practical Rubrics & Oral Viva Grading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                    <span>ExamForge Test Creator & CSV Question Importer</span>
                  </div>
                </div>
              </div>
              <Link
                href="/teacher"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-cyan-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Enter Subject Teacher Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* PORTAL 4: ENROLLED STUDENT */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-xl group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Student Portal</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                      LEARNER HUB
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">Academic Workspace</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Enrolled by Class ID and PRN. Attempt scheduled theory tests and quizzes, receive instant event notifications, track attendance percentage, and print semester report cards.
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-700 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>Real-Time In-App Event Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>ExamForge Test Runner & Verified Report Cards</span>
                  </div>
                </div>
              </div>
              <Link
                href="/student"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Enter Student Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* PORTAL 5: SUPER ADMIN */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-xl group md:col-span-2 lg:col-span-1">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Super Admin</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                      PLATFORM
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">Platform Governance</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  System administrators manage college subscriptions, verify new institution onboarding requests, audit global activity, and monitor ExamForge telemetry.
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-700 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span>Secure 6-digit OTP verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span>Multi-tenant institution management</span>
                  </div>
                </div>
              </div>
              <Link
                href="/super-admin/verify"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-purple-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Super Admin Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 4. ACADEMIC HIERARCHY BANNER */}
        {/* ---------------------------------------------------------------- */}
        <div className="w-full max-w-5xl p-6 rounded-3xl bg-gradient-to-r from-slate-100 via-white to-emerald-50 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-emerald-950/20 border border-slate-200 dark:border-neutral-800 text-left space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Paperboat Hierarchy: Assignment Determines Access
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
              STRICT CLASS ISOLATION
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs font-mono">
            <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase">Step 1</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">College</div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">Accreditation</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase">Step 2</div>
              <div className="font-bold text-teal-600 dark:text-teal-400">Department</div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">e.g. COMP / IT</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase">Step 3</div>
              <div className="font-bold text-cyan-600 dark:text-cyan-400">Class Division</div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">BE-COMP-TE-A</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase">Step 4</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">Assignments</div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">Class & Subject Faculty</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase">Step 5</div>
              <div className="font-bold text-purple-600 dark:text-purple-400">ExamForge Engine</div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">Tests • Marks • Cards</div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 5. SYSTEM FEATURE HIGHLIGHTS */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-5xl pt-2">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 text-left space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
              <span>Class-Restricted Tests</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">Division B cannot view or take Division A tests</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 text-left space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500" />
              <span>50M Practical Rubrics</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">Experiment 20M + Lab 10M + Imp 10M + Viva 10M</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 text-left space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
              <span>AI Proctoring Telemetry</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">Tab blur, copy-paste lock & candidate monitoring</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 text-left space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Award className="h-3.5 w-3.5 text-purple-500" />
              <span>Official Report Cards</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">Dean, Class & Subject Teacher signatures</p>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* 6. PUBLIC FOOTER */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-slate-200 dark:border-neutral-800/80 py-8 px-6 max-w-7xl mx-auto w-full text-xs text-slate-500 dark:text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PaperboatLogo size="sm" variant="badge" showSubtitle={false} />
          <span>&copy; {new Date().getFullYear()} Paperboat Education Systems Inc. All rights reserved. Powered by Paperboat ERP & ExamForge Engine.</span>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <Link href="/college" className="hover:text-emerald-500 transition">
            College Portal
          </Link>
          <Link href="/college/login" className="hover:text-emerald-500 transition">
            Faculty Sign In
          </Link>
          <Link href="/academic" className="hover:text-teal-500 transition">
            Academic ERP
          </Link>
          <Link href="/teacher" className="hover:text-cyan-500 transition">
            Teacher Hub
          </Link>
          <Link href="/student" className="hover:text-blue-500 transition">
            Student Portal
          </Link>
        </div>
      </footer>
    </div>
  );
}
