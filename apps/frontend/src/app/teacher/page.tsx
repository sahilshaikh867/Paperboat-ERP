'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PaperboatLogo from '@/components/PaperboatLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  GraduationCap,
  School,
  BookOpen,
  Users,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Upload,
  Plus,
  Search,
  FileSpreadsheet,
  TrendingUp,
  FileText,
  UserCheck,
  ShieldCheck,
  LogOut,
  Sparkles,
  ArrowRight,
  Printer,
  Lock,
  RefreshCw,
  Layers,
  ChevronRight,
  Check,
  Eye,
  BarChart3,
  Calendar,
  Bell,
  Filter,
  Download,
  Sliders,
  PieChart,
  Activity,
  Info,
  ExternalLink,
  Edit3,
  Save,
  X,
  Percent,
  Briefcase,
  AlertCircle,
  CheckCheck,
} from 'lucide-react';
import {
  api,
  UserProfile,
  AcademicClassItem,
  AcademicSubject,
  StudentEnrollmentItem,
  SubjectComponentType,
  AttendanceStatus,
  VivaType,
} from '@/lib/api';

// Timetable Slot Interface
interface TimetableSlot {
  day: string;
  time: string;
  subject: string;
  room: string;
  type: 'Theory' | 'Lab Practical' | 'Viva / Assessment' | 'Remedial';
  classCode: string;
  isNext?: boolean;
}

export default function TeacherPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  // Informatic Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'my-class' | 'assessments' | 'evaluations' | 'attendance' | 'performance' | 'timetable'
  >('overview');

  // Academic Assignments State
  const [assignments, setAssignments] = useState<{
    isClassTeacher: boolean;
    classTeacherOf: AcademicClassItem[];
    isSubjectTeacher: boolean;
    subjectTeacherOf: Array<{ class: AcademicClassItem; subject: AcademicSubject; componentType: SubjectComponentType }>;
  } | null>(null);

  // Selected Class & Subject
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Class Students Roster & Filter States
  const [classStudents, setClassStudents] = useState<StudentEnrollmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'AT_RISK' | 'TOP_PERFORMERS' | 'DEFAULTERS'>('ALL');

  // Performance & Report Cards
  const [classPerformance, setClassPerformance] = useState<any>(null);
  const [reportCards, setReportCards] = useState<any[]>([]);

  // Tests & Assessments
  const [testsList, setTestsList] = useState<any[]>([]);
  const [vivasList, setVivasList] = useState<any[]>([]);

  // Marksheets
  const [practicalRoster, setPracticalRoster] = useState<any[]>([]);
  const [theoryRoster, setTheoryRoster] = useState<any[]>([]);

  // Attendance Sheet
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, AttendanceStatus>>({});
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Modals & Drawers
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [showCsvQuestionModal, setShowCsvQuestionModal] = useState(false);
  const [showCreateVivaModal, setShowCreateVivaModal] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState<any>(null);
  const [selectedStudentDossier, setSelectedStudentDossier] = useState<StudentEnrollmentItem | null>(null);

  // Practical Grading Modal State (Modern in-app grading studio)
  const [gradingModalStudent, setGradingModalStudent] = useState<{
    enrollmentId: string;
    fullName: string;
    rollNumber: string;
    experimentMarks: number;
    labRecordMarks: number;
    implementationMarks: number;
    vivaMarks: number;
  } | null>(null);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Test Form
  const [testForm, setTestForm] = useState({
    title: '',
    academicTestType: 'UNIT_TEST',
    durationMins: 45,
    passMarks: 40,
    defaultMarks: 1,
    defaultNegativeMarks: 0,
    description: '',
  });
  const [targetTestId, setTargetTestId] = useState<string>('');

  // CSV Question Import
  const [csvQuestionsText, setCsvQuestionsText] = useState(
    'question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation\nWhat is the maximum payload size of a standard Ethernet frame?,MCQ,1500 bytes,1492 bytes,64 bytes,9000 bytes,A,2,0,Standard MTU is 1500 bytes\nWhich protocols operate at the transport layer?,MSQ,TCP,UDP,BGP,ICMP,A|B,2,0,TCP and UDP provide transport layer services\nExplain the three-way handshake process in TCP connection establishment.,CODING,SYN,SYN-ACK,ACK,ESTABLISHED,A|B|C,5,0,TCP uses SYN -> SYN-ACK -> ACK sequence'
  );
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);

  // Viva Form
  const [vivaForm, setVivaForm] = useState({
    title: '',
    topic: '',
    vivaType: 'INDIVIDUAL' as VivaType,
    maxMarks: 20,
    durationMins: 15,
  });

  // Login Form (if unauthenticated)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Live Database Calendar Timetable State (Dynamic)
  const [timetableEvents, setTimetableEvents] = useState<any[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    eventType: 'LECTURE',
    startAt: '',
    endAt: '',
    location: '',
    description: '',
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Class Details & Class Teacher Subject Management State
  const [classDetails, setClassDetails] = useState<any>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    type: 'THEORY' as SubjectComponentType,
    maxTheoryMarks: 100,
    maxPracticalMarks: 50,
    maxVivaMarks: 20,
    maxInternalMarks: 20,
  });
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Assign Subject Teacher Modal State
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [assignTeacherForm, setAssignTeacherForm] = useState({
    subjectId: '',
    teacherId: '',
    componentType: 'THEORY' as SubjectComponentType,
  });
  const [isSubmittingTeacherAssign, setIsSubmittingTeacherAssign] = useState(false);

  // Load Auth State
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setIsLoadingAuth(false);
      return;
    }
    setToken(savedToken);
    bootstrapTeacherData(savedToken);
  }, []);

  const bootstrapTeacherData = async (authToken: string) => {
    setIsLoadingAuth(true);
    try {
      const [me, myAssign] = await Promise.all([
        api.getMe(authToken),
        api.getMyAcademicAssignments(authToken).catch(() => null),
      ]);

      setUser(me);
      setAssignments(myAssign);

      const initialClass =
        myAssign?.classTeacherOf[0] ||
        myAssign?.subjectTeacherOf[0]?.class ||
        null;

      if (initialClass) {
        setSelectedClassId(initialClass.id);
        const initialSub =
          myAssign?.subjectTeacherOf?.find((s) => s.class.id === initialClass.id)?.subject ||
          initialClass.subjects?.[0] ||
          null;

        if (initialSub) {
          setSelectedSubjectId(initialSub.id);
        }

        await loadClassData(authToken, initialClass.id, initialSub?.id);
      }
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load teacher data:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleRefresh = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      await loadClassData(token, selectedClassId, selectedSubjectId);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadClassData = async (authToken: string, classId: string, subjectId?: string) => {
    if (!classId) return;
    try {
      const [students, perf, cards, calRes, details, teachers] = await Promise.all([
        api.getClassStudents(authToken, classId).catch(() => []),
        api.getClassPerformance(authToken, classId).catch(() => null),
        api.getClassReportCards(authToken, classId).catch(() => []),
        api.getCalendarEvents(authToken, { classId }).catch(() => ({ success: true, events: [] })),
        api.getClassDetails(authToken, classId).catch(() => null),
        api.getTeachers(authToken).catch(() => []),
      ]);

      setClassStudents(students);
      setClassPerformance(perf);
      setReportCards(cards);
      setTimetableEvents(calRes?.events || []);
      if (details) setClassDetails(details);
      if (teachers) setFacultyList(teachers);

      // Initialize attendance
      const attMap: Record<string, AttendanceStatus> = {};
      students.forEach((s) => (attMap[s.id] = 'PRESENT'));
      setAttendanceSheet(attMap);

      if (subjectId) {
        await loadSubjectData(authToken, classId, subjectId);
      }
    } catch (err) {
      console.error('Failed to load class data:', err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId) return;
    setIsSubmittingSubject(true);
    try {
      await api.createClassSubject(token, selectedClassId, subjectForm);
      alert(`Subject "${subjectForm.name}" (${subjectForm.code}) added successfully to class!`);
      setShowAddSubjectModal(false);
      setSubjectForm({
        name: '',
        code: '',
        type: 'THEORY' as SubjectComponentType,
        maxTheoryMarks: 100,
        maxPracticalMarks: 50,
        maxVivaMarks: 20,
        maxInternalMarks: 20,
      });
      await loadClassData(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to add subject');
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const handleAssignSubjectTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId || !assignTeacherForm.subjectId || !assignTeacherForm.teacherId) {
      alert('Please select both a Subject and a Teacher.');
      return;
    }
    setIsSubmittingTeacherAssign(true);
    try {
      const res = await api.assignSubjectTeacher(token, selectedClassId, assignTeacherForm);
      alert(res.message || 'Subject Teacher assigned successfully!');
      setShowAssignTeacherModal(false);
      setAssignTeacherForm({
        subjectId: '',
        teacherId: '',
        componentType: 'THEORY' as SubjectComponentType,
      });
      await loadClassData(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to assign subject teacher');
    } finally {
      setIsSubmittingTeacherAssign(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId) return;
    setIsSubmittingEvent(true);
    try {
      const res = await api.createCalendarEvent(token, {
        ...eventForm,
        classId: selectedClassId,
        subjectId: selectedSubjectId || undefined,
      });
      alert(`Event "${eventForm.title}" scheduled successfully! All enrolled students in this class have been notified on their dashboard.`);
      setShowAddEventModal(false);
      setEventForm({
        title: '',
        eventType: 'LECTURE',
        startAt: '',
        endAt: '',
        location: '',
        description: '',
      });
      const updatedCal = await api.getCalendarEvents(token, { classId: selectedClassId });
      setTimetableEvents(updatedCal?.events || []);
    } catch (err: any) {
      alert(err.message || 'Failed to schedule calendar event');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const loadSubjectData = async (authToken: string, classId: string, subjectId: string) => {
    if (!classId || !subjectId) return;
    try {
      const [tests, vivas, prac, theo] = await Promise.all([
        api.getAcademicTests(authToken, classId, subjectId).catch(() => []),
        api.getVivas(authToken, classId, subjectId).catch(() => []),
        api.getPracticalMarks(authToken, classId, subjectId).catch(() => null),
        api.getTheoryMarks(authToken, classId, subjectId).catch(() => null),
      ]);

      setTestsList(tests);
      setVivasList(vivas);
      if (prac) setPracticalRoster(prac.roster || []);
      if (theo) setTheoryRoster(theo.roster || []);
    } catch (err) {
      console.error('Failed to load subject data:', err);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);

    try {
      const res = await api.login({ email: loginEmail.trim(), password: loginPassword });
      if (!res.token || !res.user) throw new Error(res.message || 'Login failed');

      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);

      await bootstrapTeacherData(res.token);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Selected Class details
  const activeClass = useMemo(() => {
    if (!assignments) return null;
    return (
      assignments.classTeacherOf.find((c) => c.id === selectedClassId) ||
      assignments.subjectTeacherOf.find((s) => s.class.id === selectedClassId)?.class ||
      null
    );
  }, [assignments, selectedClassId]);

  // Selected Subject details
  const activeSubject = useMemo(() => {
    if (!assignments) return null;
    return (
      assignments.subjectTeacherOf.find((s) => s.subject.id === selectedSubjectId)?.subject ||
      activeClass?.subjects?.find((s) => s.id === selectedSubjectId) ||
      null
    );
  }, [assignments, activeClass, selectedSubjectId]);

  // Check if current user is Class Teacher for active class
  const isClassTeacherForSelectedClass = useMemo(() => {
    if (!user) return false;
    if (user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN') return true;
    return assignments?.classTeacherOf?.some((c) => c.id === selectedClassId) ?? false;
  }, [user, assignments, selectedClassId]);

  // Filtered Students Roster
  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const matchesSearch =
        s.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.prnNumber && s.prnNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.student.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (studentFilter === 'AT_RISK') {
        const rc = reportCards.find((r) => r.enrollmentId === s.id);
        return rc ? rc.attendancePercentage < 75 || rc.percentage < 40 : false;
      }
      if (studentFilter === 'DEFAULTERS') {
        const rc = reportCards.find((r) => r.enrollmentId === s.id);
        return rc ? rc.attendancePercentage < 65 : false;
      }
      if (studentFilter === 'TOP_PERFORMERS') {
        const rc = reportCards.find((r) => r.enrollmentId === s.id);
        return rc ? rc.percentage >= 75 : false;
      }
      return true;
    });
  }, [classStudents, searchQuery, studentFilter, reportCards]);

  // Informatics Metric Calculations
  const metrics = useMemo(() => {
    const totalStudents = classStudents.length;
    let avgAttendance = 85;
    let avgPercentage = 72;
    let distinctionCount = 0;
    let firstClassCount = 0;
    let secondClassCount = 0;
    let passCount = 0;
    let failCount = 0;
    let atRiskCount = 0;
    let gradedPracticalCount = 0;

    if (reportCards.length > 0) {
      const totalAtt = reportCards.reduce((acc, r) => acc + (r.attendancePercentage || 0), 0);
      const totalScore = reportCards.reduce((acc, r) => acc + (r.percentage || 0), 0);
      avgAttendance = Math.round(totalAtt / reportCards.length);
      avgPercentage = Math.round((totalScore / reportCards.length) * 10) / 10;

      reportCards.forEach((r) => {
        const p = r.percentage || 0;
        if (p >= 75) distinctionCount++;
        else if (p >= 60) firstClassCount++;
        else if (p >= 50) secondClassCount++;
        else if (p >= 40) passCount++;
        else failCount++;

        if (r.attendancePercentage < 75 || p < 40) atRiskCount++;
      });
    }

    if (practicalRoster.length > 0) {
      gradedPracticalCount = practicalRoster.filter((p) => p.assessment?.totalMarks != null).length;
    }

    return {
      totalStudents,
      avgAttendance,
      avgPercentage,
      distinctionCount,
      firstClassCount,
      secondClassCount,
      passCount,
      failCount,
      atRiskCount: atRiskCount || (classPerformance?.studentsAtRiskCount || 0),
      gradedPracticalCount,
      totalPracticalStudents: practicalRoster.length,
      practicalGradingPercentage:
        practicalRoster.length > 0
          ? Math.round((gradedPracticalCount / practicalRoster.length) * 100)
          : 0,
    };
  }, [classStudents, reportCards, classPerformance, practicalRoster]);

  // Export Roster to CSV
  const handleExportRosterCsv = () => {
    if (classStudents.length === 0) return;
    const headers = 'Roll Number,Student Name,Email,PRN Number,Class Division,Result Status,Percentage,Attendance%\n';
    const rows = classStudents
      .map((s) => {
        const rc = reportCards.find((r) => r.enrollmentId === s.id);
        return `"${s.rollNumber}","${s.student.fullName}","${s.student.email}","${s.prnNumber || 'N/A'}","${activeClass?.classCode || ''}","${rc?.resultStatus || 'ENROLLED'}","${rc?.percentage || 'N/A'}","${rc?.attendancePercentage || '100'}%"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `class-roster-${activeClass?.classCode || 'academic'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Create Test Handler
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId || !selectedSubjectId) return;

    try {
      const created = await api.createAcademicTest(token, selectedClassId, selectedSubjectId, testForm);
      setShowCreateTestModal(false);
      setTargetTestId(created.id);
      setShowCsvQuestionModal(true);
      loadSubjectData(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to create assessment');
    }
  };

  // Import CSV Questions Handler
  const handleImportQuestionsCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !targetTestId) return;
    setCsvFeedback(null);
    setIsImportingQuestions(true);

    try {
      const lines = csvQuestionsText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain header and question rows');

      const questionsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const p = lines[i].split(',').map((x) => x.trim());
        if (p.length >= 4) {
          questionsToImport.push({
            question: p[0],
            type: p[1] || 'MCQ',
            option_a: p[2] || '',
            option_b: p[3] || '',
            option_c: p[4] || '',
            option_d: p[5] || '',
            correct_answer: p[6] || 'A',
            marks: p[7] || 1,
            negative_marks: p[8] || 0,
            explanation: p[9] || '',
          });
        }
      }

      const res = await api.importQuestionsCsv(token, targetTestId, questionsToImport);
      setCsvFeedback(`Success: Imported ${res.importedCount} questions! (Failed: ${res.failedCount})`);
      setTimeout(() => setShowCsvQuestionModal(false), 2000);
      loadSubjectData(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      setCsvFeedback(`Error: ${err.message}`);
    } finally {
      setIsImportingQuestions(false);
    }
  };

  // Create Viva Handler
  const handleCreateViva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId || !selectedSubjectId) return;

    try {
      await api.createViva(token, selectedClassId, selectedSubjectId, vivaForm);
      setShowCreateVivaModal(false);
      loadSubjectData(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to create viva');
    }
  };

  // Modern In-App Practical Grade Save Handler
  const handleSavePracticalGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId || !selectedSubjectId || !gradingModalStudent) return;
    setIsSubmittingGrade(true);

    try {
      await api.submitPracticalMarks(token, selectedClassId, selectedSubjectId, {
        enrollmentId: gradingModalStudent.enrollmentId,
        experimentMarks: gradingModalStudent.experimentMarks,
        labRecordMarks: gradingModalStudent.labRecordMarks,
        implementationMarks: gradingModalStudent.implementationMarks,
        vivaMarks: gradingModalStudent.vivaMarks,
      });
      await loadSubjectData(token, selectedClassId, selectedSubjectId);
      setGradingModalStudent(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit marks');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Submit Attendance Handler
  const handleSubmitAttendance = async () => {
    if (!token || !selectedClassId) return;
    setIsSubmittingAttendance(true);
    const records = Object.entries(attendanceSheet).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
    }));

    try {
      await api.submitClassAttendance(token, selectedClassId, {
        date: attendanceDate,
        records,
      });
      alert(`Attendance recorded successfully for ${records.length} students on ${attendanceDate}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Generate Report Cards
  const handleGenerateReportCards = async () => {
    if (!token || !selectedClassId) return;
    try {
      const res = await api.generateClassReportCards(token, selectedClassId);
      alert(res.message);
      await loadClassData(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to generate report cards');
    }
  };

  // Quick Attendance Actions
  const handleSetAllAttendance = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => (updated[s.id] = status));
    setAttendanceSheet(updated);
  };

  // -------------------------------------------------------------
  // 1. LOADING SCREEN
  // -------------------------------------------------------------
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative">
          <GraduationCap className="h-14 w-14 text-teal-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-xl animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-white tracking-wide">
            Exam<span className="text-teal-400">Forge</span> Academic Portal
          </p>
          <p className="text-xs text-neutral-400 animate-pulse">
            Synchronizing class divisions, grading rosters & academic rubrics...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. UNAUTHENTICATED FACULTY SIGN IN
  // -------------------------------------------------------------
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
        <header className="border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-600/30">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Exam<span className="text-teal-400">Forge</span>
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                TEACHER PORTAL
              </span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition"
          >
            ← Back to Platform
          </Link>
        </header>

        <div className="max-w-md mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Academic Faculty & Assessment Workbench</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Faculty Staff Sign In
            </h1>
            <p className="text-xs text-neutral-400">
              Manage assigned class divisions, author course assessments, conduct vivas, and record student marks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl space-y-5">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold">Faculty Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition disabled:opacity-50"
              >
                {isSubmittingLogin ? 'Verifying Faculty Credentials...' : 'Sign In as Faculty'}
              </button>
            </form>

            <div className="pt-2 border-t border-neutral-800/80 space-y-2">
              <div className="text-[11px] text-neutral-400 font-medium">Quick Demo Faculty Credentials:</div>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('teacher@example.com');
                  setLoginPassword('Password@123');
                }}
                className="w-full p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 text-left transition flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-teal-300 transition">Prof. David Reynolds (Class Teacher)</div>
                  <div className="text-[11px] text-teal-400 font-mono">teacher@example.com • Password@123</div>
                </div>
                <span className="text-[10px] font-bold text-teal-400 px-2.5 py-1 rounded-lg bg-teal-950 border border-teal-800 group-hover:bg-teal-900 transition">
                  Auto Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginEmail('rahul.teacher@stanford.edu');
                  setLoginPassword('Password@123');
                }}
                className="w-full p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 text-left transition flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-indigo-300 transition">Prof. Rahul Sharma (Subject Teacher)</div>
                  <div className="text-[11px] text-indigo-400 font-mono">rahul.teacher@stanford.edu • Password@123</div>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 group-hover:bg-indigo-900 transition">
                  Auto Fill
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. INFORMATIC TEACHER WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PaperboatLogo size="sm" variant="badge" href="/" />

            <span className="text-neutral-600">/</span>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Faculty Academic Workspace</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                AY 2025-26
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 flex items-center gap-1.5 transition"
              title="Sync Latest Academic Records"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Sync Data</span>
            </button>

            <Link
              href="/academic"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-teal-600/20"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Full Academic ERP</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-white">{user.fullName}</div>
                <div className="text-[10px] text-neutral-400">{user.email}</div>
              </div>
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Faculty Identity & Academic Affiliation Bar */}
      <div className="border-b border-neutral-800/60 bg-neutral-900/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-teal-600/20 border border-teal-500/40 text-teal-300 font-bold flex items-center justify-center text-lg shadow-inner">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-base text-white">{user.fullName}</h1>
                {user.designation && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800">
                    {user.designation}
                  </span>
                )}
                {assignments?.isClassTeacher && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800 font-mono">
                    CLASS TEACHER
                  </span>
                )}
                {assignments?.isSubjectTeacher && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                    SUBJECT TEACHER
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {user.department || 'Academic Faculty'} • {user.degree || 'Faculty Member'} •{' '}
                <strong className="text-neutral-200">{user.organization?.name || 'College'}</strong>
              </p>
            </div>
          </div>

          {/* Context Switcher & Slot Status */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Live slot reminder */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-950/40 border border-teal-800/60 text-teal-300 text-xs font-mono">
              <Clock className="h-3.5 w-3.5 text-teal-400" />
              <span>Next Slot: 01:30 PM (Theory - Rm 405)</span>
            </div>

            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] font-mono text-neutral-500 uppercase font-bold block">
                Active Class Division:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  if (token) loadClassData(token, e.target.value, selectedSubjectId);
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-teal-300 font-mono focus:outline-none focus:border-teal-500"
              >
                {assignments?.classTeacherOf.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.classCode} • Div {c.division} (Class Teacher)
                  </option>
                ))}
                {assignments?.subjectTeacherOf.map((s) => (
                  <option key={s.class.id} value={s.class.id}>
                    {s.class.classCode} • {s.subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-6">
        {/* ============================================================= */}
        {/* EXECUTIVE INFORMATIC METRICS GRID (6 TILES) */}
        {/* ============================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Enrolled Roster */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
              <span>Total Roster</span>
              <Users className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.totalStudents}</div>
            <div className="text-[11px] text-teal-400 font-medium">100% active seats</div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-teal-500/5 rounded-full blur-sm" />
          </div>

          {/* Card 2: Average Class Attendance */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
              <span>Class Attendance</span>
              <Clock className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{metrics.avgAttendance}%</div>
            <div className="text-[11px] text-neutral-500 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">&gt; 75%</span> threshold met
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500/5 rounded-full blur-sm" />
          </div>

          {/* Card 3: Class Score Benchmark */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
              <span>Class Average</span>
              <Award className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.avgPercentage}%</div>
            <div className="text-[11px] text-neutral-500">
              {metrics.distinctionCount} Dist. / {metrics.firstClassCount} 1st Class
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-cyan-500/5 rounded-full blur-sm" />
          </div>

          {/* Card 4: Students At Risk */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
              <span>Students At Risk</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{metrics.atRiskCount}</div>
            <div className="text-[11px] text-amber-400/80 font-medium">Defaulters / Low Score</div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-500/5 rounded-full blur-sm" />
          </div>

          {/* Card 5: Practical Marksheet Progress */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
              <span>Lab Evaluation</span>
              <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-400">
              {metrics.practicalGradingPercentage}%
            </div>
            <div className="text-[11px] text-neutral-500">
              {metrics.gradedPracticalCount}/{metrics.totalPracticalStudents} evaluated
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-500/5 rounded-full blur-sm" />
          </div>

          {/* Card 6: Tests Authored */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
              <span>Active Tests</span>
              <ClipboardList className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">{testsList.length}</div>
            <div className="text-[11px] text-neutral-500">{vivasList.length} oral vivas scheduled</div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-purple-500/5 rounded-full blur-sm" />
          </div>
        </div>

        {/* ============================================================= */}
        {/* INFORMATIC TABS NAVIGATION */}
        {/* ============================================================= */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Academic Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-class')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my-class'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Class Teacher Hub ({classStudents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assessments'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Course Assessments ({testsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'evaluations'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Practical & Viva Grading</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Attendance Register</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Performance & Report Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'timetable'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Teaching Timetable</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: ACADEMIC OVERVIEW & TEACHER ASSIGNMENTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Responsibilities Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 via-neutral-900 to-neutral-900 border border-teal-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Dual Faculty Responsibilities Active</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  Class Teacher & Subject Teacher Command Center
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  As an accredited faculty member, your account is strictly class-restricted. You hold authority to manage your designated primary class roster, roll-call attendance, and official report cards, as well as author coding/MCQ tests, conduct vivas, and record 50M practical marks for subjects assigned to you.
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('my-class')}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 flex items-center gap-2 transition"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>View Class Roster</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTestModal(true)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Plus className="h-3.5 w-3.5 text-teal-400" />
                  <span>Author Assessment</span>
                </button>
              </div>
            </div>

            {/* VISUAL ANALYTICS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Widget 1: Grade Distribution Breakdown */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-teal-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                      Class Grade Distribution
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{reportCards.length} Graded</span>
                </div>

                {/* Segmented bar */}
                <div className="w-full h-3 rounded-full bg-neutral-950 flex overflow-hidden border border-neutral-800">
                  <div
                    style={{ width: `${(metrics.distinctionCount / (reportCards.length || 1)) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Distinction: ${metrics.distinctionCount}`}
                  />
                  <div
                    style={{ width: `${(metrics.firstClassCount / (reportCards.length || 1)) * 100}%` }}
                    className="bg-teal-500 h-full"
                    title={`First Class: ${metrics.firstClassCount}`}
                  />
                  <div
                    style={{ width: `${(metrics.secondClassCount / (reportCards.length || 1)) * 100}%` }}
                    className="bg-cyan-500 h-full"
                    title={`Second Class: ${metrics.secondClassCount}`}
                  />
                  <div
                    style={{ width: `${(metrics.passCount / (reportCards.length || 1)) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Pass Class: ${metrics.passCount}`}
                  />
                  <div
                    style={{ width: `${(metrics.failCount / (reportCards.length || 1)) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Remedial / Fail: ${metrics.failCount}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <span className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Distinction (&ge;75%)
                    </span>
                    <strong className="text-white font-mono">{metrics.distinctionCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <span className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      First Class (60-74%)
                    </span>
                    <strong className="text-white font-mono">{metrics.firstClassCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <span className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Second Class (50-59%)
                    </span>
                    <strong className="text-white font-mono">{metrics.secondClassCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <span className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Remedial (&lt;40%)
                    </span>
                    <strong className="text-rose-400 font-mono">{metrics.failCount}</strong>
                  </div>
                </div>
              </div>

              {/* Widget 2: Attendance Health & Compliance */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                      Attendance Compliance
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Target &ge;75%</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-400">Class Average</span>
                      <strong className="text-emerald-400 font-mono">{metrics.avgAttendance}%</strong>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-2.5 overflow-hidden border border-neutral-800">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2.5 rounded-full"
                        style={{ width: `${metrics.avgAttendance}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Regular (&gt;85% attendance):</span>
                      <strong className="text-emerald-400 font-mono">
                        {reportCards.filter((r) => r.attendancePercentage >= 85).length || classStudents.length} Students
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Notice Warning (65% - 74%):</span>
                      <strong className="text-amber-400 font-mono">
                        {reportCards.filter((r) => r.attendancePercentage >= 65 && r.attendancePercentage < 75).length} Students
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Critical Defaulters (&lt;65%):</span>
                      <strong className="text-rose-400 font-mono">
                        {reportCards.filter((r) => r.attendancePercentage < 65).length} Students
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 3: Curriculum Progress & Deadlines */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                      Curriculum & Lab Milestones
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">TERM ODD</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-300">Unit 1 & 2: Architecture & Protocols</span>
                      <span className="text-emerald-400 font-mono">100% Completed</span>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-300">Unit 3: Routing & Transport Sockets</span>
                      <span className="text-teal-400 font-mono">75% In Progress</span>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-500 h-1.5 rounded-full w-3/4" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-300">Lab Experiments (10 Assignments)</span>
                      <span className="text-indigo-400 font-mono">8/10 Complete</span>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-1.5 rounded-full w-4/5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Final Lab Submission Deadline:</span>
                    <strong className="text-white font-mono">15 Oct 2026</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Assignments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Class Teacher Assignment */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-teal-400" />
                    <span>My Designated Class Division</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                    PRIMARY ASSIGNMENT
                  </span>
                </div>

                {assignments?.classTeacherOf && assignments.classTeacherOf.length > 0 ? (
                  assignments.classTeacherOf.map((cls) => (
                    <div key={cls.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-lg text-white">{cls.classCode}</span>
                          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-400 border border-teal-800">
                            Division {cls.division}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400 font-mono">ID: {cls.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        {cls.program?.name} • Year {cls.yearLevel} • {cls.semester}
                      </div>
                      <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                        <span>
                          Enrolled: <strong className="text-white">{classStudents.length} Students</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('my-class')}
                          className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition"
                        >
                          <span>Manage Class Hub</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-xl bg-neutral-950 text-center text-xs text-neutral-500">
                    No primary class division currently assigned to your account.
                  </div>
                )}
              </div>

              {/* Card 2: Subject Teacher Assignments */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    <span>My Assigned Course Subjects</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    SUBJECTS
                  </span>
                </div>

                <div className="space-y-2.5">
                  {assignments?.subjectTeacherOf && assignments.subjectTeacherOf.length > 0 ? (
                    assignments.subjectTeacherOf.map((st, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between hover:border-neutral-700 transition">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{st.subject.name}</span>
                            <span className="text-[10px] font-mono text-teal-400 font-semibold">({st.subject.code})</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            Class Division: <strong className="text-neutral-300">{st.class.classCode}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 text-teal-300 border border-neutral-800 font-bold">
                            {st.componentType}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassId(st.class.id);
                              setSelectedSubjectId(st.subject.id);
                              setActiveTab('assessments');
                              if (token) loadClassData(token, st.class.id, st.subject.id);
                            }}
                            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                            title="Open Subject Tests"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 rounded-xl bg-neutral-950 text-center text-xs text-neutral-500">
                      No subjects currently assigned to your account.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CLASS TEACHER HUB (STUDENT ROSTER & MANAGEMENT) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'my-class' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">
                    Class Division Roster — {activeClass?.classCode}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                    Div {activeClass?.division}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Manage student profiles, monitor academic standing, and export official roll registers
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {isClassTeacherForSelectedClass && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAddSubjectModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 flex items-center gap-1.5 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Subject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAssignTeacherModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Assign Faculty</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEventModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Schedule Event</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleExportRosterCsv}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="h-3.5 w-3.5 text-teal-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReportCards}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Re-Compute Cards</span>
                </button>
              </div>
            </div>

            {/* CLASS SUBJECTS & FACULTY GOVERNANCE */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-teal-400" />
                    <span>Class Subjects & Faculty Assignments</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Subjects offered to {activeClass?.classCode} and faculty assigned for Theory, Practical, and Viva
                  </p>
                </div>
                {isClassTeacherForSelectedClass && (
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(true)}
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add New Subject</span>
                  </button>
                )}
              </div>

              {(!classDetails?.subjects || classDetails.subjects.length === 0) ? (
                <div className="p-6 text-center rounded-xl bg-neutral-950 border border-dashed border-neutral-800 text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-300">No subjects currently configured for this class division.</p>
                  <p className="text-neutral-500 mt-1">As Class Teacher, click "+ Add Subject" above to create curriculum subjects and assign subject teachers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {classDetails.subjects.map((sub: any) => {
                    const assignedFaculty = (classDetails.subjectTeacherAssignments || []).filter(
                      (sta: any) => sta.subjectId === sub.id
                    );

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 hover:border-neutral-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-white">{sub.name}</span>
                            <span className="ml-2 font-mono text-[10px] text-teal-400 font-bold px-1.5 py-0.5 rounded bg-teal-950/60 border border-teal-800">
                              {sub.code}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                            {sub.type}
                          </span>
                        </div>

                        <div className="text-[11px] text-neutral-400 grid grid-cols-2 gap-1.5 py-1 border-y border-neutral-900">
                          <div>Theory Max: <strong className="text-white font-mono">{sub.maxTheoryMarks}M</strong></div>
                          <div>Practical Max: <strong className="text-white font-mono">{sub.maxPracticalMarks}M</strong></div>
                          <div>Viva Max: <strong className="text-white font-mono">{sub.maxVivaMarks}M</strong></div>
                          <div>Internal Max: <strong className="text-white font-mono">{sub.maxInternalMarks}M</strong></div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                            Assigned Faculty:
                          </span>
                          {assignedFaculty.length === 0 ? (
                            <div className="text-[11px] text-amber-400/80 italic">
                              No teacher assigned yet
                            </div>
                          ) : (
                            assignedFaculty.map((af: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-300 font-semibold">{af.teacher?.fullName || 'Faculty'}</span>
                                <span className="text-[10px] font-mono text-teal-400 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-900">
                                  {af.componentType}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        {isClassTeacherForSelectedClass && (
                          <div className="pt-2 border-t border-neutral-900 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setAssignTeacherForm((prev) => ({ ...prev, subjectId: sub.id }));
                                setShowAssignTeacherModal(true);
                              }}
                              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                            >
                              <UserCheck className="h-3 w-3" />
                              <span>Assign / Change Teacher</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEARCH & FILTER CONTROLS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, roll # or PRN..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStudentFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    studentFilter === 'ALL'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({classStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilter('TOP_PERFORMERS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    studentFilter === 'TOP_PERFORMERS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Top Performers
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilter('AT_RISK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    studentFilter === 'AT_RISK'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  At Risk (&lt;75% Att)
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilter('DEFAULTERS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    studentFilter === 'DEFAULTERS'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Defaulters
                </button>
              </div>
            </div>

            {/* STUDENTS TABLE */}
            <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">PRN / ID</th>
                    <th className="px-4 py-3 text-center">Attendance</th>
                    <th className="px-4 py-3 text-center">Score %</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-neutral-500">
                        No students found matching your search or active filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const rc = reportCards.find((r) => r.enrollmentId === s.id);
                      const att = rc?.attendancePercentage ?? 100;
                      const score = rc?.percentage ?? '—';
                      const isAtRisk = att < 75 || (rc && rc.percentage < 40);

                      return (
                        <tr key={s.id} className="hover:bg-neutral-800/30 transition">
                          <td className="px-4 py-3 font-mono font-bold text-teal-400">{s.rollNumber}</td>
                          <td className="px-4 py-3 font-bold text-white">{s.student.fullName}</td>
                          <td className="px-4 py-3 text-neutral-400 font-mono">{s.student.email}</td>
                          <td className="px-4 py-3 text-neutral-400 font-mono">{s.prnNumber || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-mono font-bold text-xs ${
                                att >= 75 ? 'text-emerald-400' : att >= 65 ? 'text-amber-400' : 'text-rose-400'
                              }`}
                            >
                              {att}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-white">
                            {score !== '—' ? `${score}%` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isAtRisk ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                At Risk
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                In Good Standing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentDossier(s)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-teal-400 font-semibold flex items-center gap-1 ml-auto transition"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: COURSE ASSESSMENTS & TESTS (SUBJECT TEACHER) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'assessments' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">
                    Course Assessments — {activeSubject?.name || 'Subject'}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                    {activeSubject?.code}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Tests are strictly class-restricted to <strong className="text-teal-400">{activeClass?.classCode}</strong>. Students outside this class division receive 403 Forbidden.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTestModal(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 flex items-center gap-1.5 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Assessment</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testsList.length === 0 ? (
                <div className="col-span-2 p-12 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center space-y-3">
                  <ClipboardList className="h-10 w-10 text-neutral-600 mx-auto" />
                  <div className="text-sm font-bold text-neutral-300">No assessments created yet</div>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Create your first unit test or semester mock exam bound to {activeClass?.classCode}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateTestModal(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Test Now</span>
                  </button>
                </div>
              ) : (
                testsList.map((test) => (
                  <div key={test.id} className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4 hover:border-teal-500/40 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{test.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                        {test.academicTestType || 'TEST'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 block">Duration</span>
                        <strong className="text-white font-mono">{test.durationMins} Mins</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 block">Pass Marks</span>
                        <strong className="text-white font-mono">{test.passMarks} Marks</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 block">Questions Bank</span>
                        <strong className="text-teal-400 font-mono">{test._count?.questions || 0} Questions</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 block">Submissions</span>
                        <strong className="text-white font-mono">{test._count?.sessions || 0} Attempts</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        <span>Class Restricted: {activeClass?.classCode}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetTestId(test.id);
                          setShowCsvQuestionModal(true);
                        }}
                        className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition"
                      >
                        <Upload className="h-3 w-3" />
                        <span>Upload Questions CSV</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: PRACTICAL & VIVA GRADING (SUBJECT TEACHER) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'evaluations' && (
          <div className="space-y-6">
            {/* Practical Marksheet Section */}
            <div className="space-y-3">
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-white">
                    Practical Marksheet Studio (Max: 50 Marks)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Official Rubric: Experiment Execution (20M) + Lab Journal (10M) + Code Implementation (10M) + Oral Viva (10M)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-neutral-400">
                    Graded: <strong className="text-teal-400">{metrics.gradedPracticalCount}</strong>/{metrics.totalPracticalStudents}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-3 py-3 text-center">Exp (20)</th>
                      <th className="px-3 py-3 text-center">Journal (10)</th>
                      <th className="px-3 py-3 text-center">Code (10)</th>
                      <th className="px-3 py-3 text-center">Viva (10)</th>
                      <th className="px-4 py-3 text-center">Total (50)</th>
                      <th className="px-3 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {practicalRoster.map((item) => {
                      const a = item.assessment || {};
                      const total = a.totalMarks || 0;
                      let gradeLabel = '—';
                      if (a.totalMarks != null) {
                        if (total >= 45) gradeLabel = 'O (Outstanding)';
                        else if (total >= 40) gradeLabel = 'A+ (Excellent)';
                        else if (total >= 35) gradeLabel = 'A (Very Good)';
                        else if (total >= 30) gradeLabel = 'B+ (Good)';
                        else if (total >= 20) gradeLabel = 'P (Pass)';
                        else gradeLabel = 'F (Fail)';
                      }

                      return (
                        <tr key={item.enrollmentId} className="hover:bg-neutral-800/30 transition">
                          <td className="px-4 py-3 font-mono font-bold text-teal-400">{item.rollNumber}</td>
                          <td className="px-4 py-3 font-bold text-white">{item.fullName}</td>
                          <td className="px-3 py-3 font-mono text-center">{a.experimentMarks ?? '—'}</td>
                          <td className="px-3 py-3 font-mono text-center">{a.labRecordMarks ?? '—'}</td>
                          <td className="px-3 py-3 font-mono text-center">{a.implementationMarks ?? '—'}</td>
                          <td className="px-3 py-3 font-mono text-center">{a.vivaMarks ?? '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-center text-emerald-400">
                            {a.totalMarks != null ? `${a.totalMarks} / 50` : 'Not Graded'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                              {gradeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setGradingModalStudent({
                                  enrollmentId: item.enrollmentId,
                                  fullName: item.fullName,
                                  rollNumber: item.rollNumber,
                                  experimentMarks: a.experimentMarks ?? 18,
                                  labRecordMarks: a.labRecordMarks ?? 9,
                                  implementationMarks: a.implementationMarks ?? 9,
                                  vivaMarks: a.vivaMarks ?? 9,
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-800 text-[11px] text-teal-300 font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>{a.totalMarks != null ? 'Edit Marks' : 'Grade'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Viva Sessions Section */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Oral Viva Sessions</h3>
                  <p className="text-xs text-neutral-400">Individual & batch verbal technical defense sessions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateVivaModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Viva Session</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vivasList.length === 0 ? (
                  <div className="col-span-3 p-6 rounded-xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500">
                    No viva sessions scheduled yet for this subject.
                  </div>
                ) : (
                  vivasList.map((v) => (
                    <div key={v.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2 hover:border-neutral-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{v.title}</span>
                        <span className="text-[10px] font-mono text-teal-400 px-1.5 py-0.5 rounded bg-teal-950 border border-teal-800">
                          {v.vivaType}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Topic: <strong className="text-neutral-300">{v.topic || 'General Syllabus'}</strong>
                      </div>
                      <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-500 flex justify-between">
                        <span>Max Marks: {v.maxMarks}</span>
                        <span>Evaluations: {v._count?.evaluations || 0} students</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: CLASS ATTENDANCE REGISTER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-white">
                  Roll-Call Attendance Register — {activeClass?.classCode}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Record daily lecture and lab attendance. Records directly feed into Student Report Cards and Defaulter Lists.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />

                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={isSubmittingAttendance}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSubmittingAttendance ? 'Saving...' : 'Save Roll-Call'}</span>
                </button>
              </div>
            </div>

            {/* Quick Bulk Attendance Toolbar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-xs">
              <span className="text-neutral-400">Quick Bulk Actions:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllAttendance('PRESENT')}
                  className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold hover:bg-emerald-900 transition"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAttendance('ABSENT')}
                  className="px-3 py-1 rounded-lg bg-red-950 text-red-300 border border-red-800 text-xs font-semibold hover:bg-red-900 transition"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Roll</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">PRN</th>
                    <th className="px-4 py-3 text-center">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {classStudents.map((s) => {
                    const curStatus = attendanceSheet[s.id] || 'PRESENT';

                    return (
                      <tr key={s.id} className="hover:bg-neutral-800/30 transition">
                        <td className="px-4 py-3 font-mono font-bold text-teal-400">{s.rollNumber}</td>
                        <td className="px-4 py-3 font-bold text-white">{s.student.fullName}</td>
                        <td className="px-4 py-3 text-neutral-400 font-mono">{s.prnNumber || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center p-1 bg-neutral-950 rounded-xl border border-neutral-800 gap-1">
                            {(['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as AttendanceStatus[]).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setAttendanceSheet({ ...attendanceSheet, [s.id]: status })}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                                  curStatus === status
                                    ? status === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow'
                                      : status === 'ABSENT'
                                      ? 'bg-red-600 text-white shadow'
                                      : 'bg-amber-600 text-white shadow'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: PERFORMANCE & OFFICIAL REPORT CARDS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-white">
                  Official Grade Cards & Cumulative Performance
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Inspect student semester marks, grade distribution, and generate printable institutional grade sheets
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateReportCards}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 flex items-center gap-1.5 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Re-Compute All Report Cards</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportCards.length === 0 ? (
                <div className="col-span-3 p-12 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center space-y-3">
                  <Award className="h-10 w-10 text-neutral-600 mx-auto" />
                  <div className="text-sm font-bold text-neutral-300">No report cards generated yet</div>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Click &quot;Re-Compute All Report Cards&quot; to aggregate theory, practical, and viva scores into final grades.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateReportCards}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Generate Report Cards Now</span>
                  </button>
                </div>
              ) : (
                reportCards.map((rc) => (
                  <div
                    key={rc.id}
                    onClick={() => {
                      setSelectedReportCard(rc);
                      setShowReportCardModal(true);
                    }}
                    className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-teal-500/50 cursor-pointer transition space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-400">Roll: {rc.enrollment?.rollNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rc.resultStatus === 'PASS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {rc.resultStatus}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-teal-300 transition">
                        {rc.enrollment?.student.fullName}
                      </div>
                      <div className="text-xs text-neutral-400 font-mono mt-0.5">
                        {rc.semester} • {rc.academicYear}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 block">Attendance</span>
                        <strong
                          className={`font-mono ${
                            rc.attendancePercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {rc.attendancePercentage}%
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 block">Percentage</span>
                        <strong className="text-white font-mono text-sm">{rc.percentage}%</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 text-[11px] text-teal-400 flex items-center justify-between">
                      <span>Click to view printable card</span>
                      <Eye className="h-3 w-3" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: TEACHING TIMETABLE & SCHEDULE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'timetable' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-white">Faculty Teaching Schedule & Calendar</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Live institutional schedule, laboratory allocations, and class events
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 font-mono text-xs font-bold">
                  {timetableEvents.length} Scheduled Events
                </span>
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 font-semibold text-white text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Schedule Event</span>
                </button>
              </div>
            </div>

            {timetableEvents.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800">
                <Calendar className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <h4 className="font-bold text-white text-sm">No scheduled events for this class yet</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Click "Schedule Event" to add live lectures, practical lab sessions, or oral vivas to the class calendar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetableEvents.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl border space-y-3 bg-neutral-900/60 border-neutral-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-teal-400 uppercase tracking-wider">
                        {new Date(slot.startAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-950 border border-neutral-800 text-neutral-300">
                        {slot.eventType}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white">{slot.title}</div>
                      <div className="text-xs text-teal-400 font-mono flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(slot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(slot.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
                      <span>{slot.location || 'Lecture Hall'}</span>
                      <span className="text-neutral-500 font-mono text-[10px]">{slot.class?.classCode || 'Class'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: MODERN IN-APP PRACTICAL GRADING STUDIO */}
      {/* ============================================================== */}
      {gradingModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Practical Evaluation Workbench</h3>
                <p className="text-xs text-neutral-400">
                  Student: <strong className="text-white">{gradingModalStudent.fullName}</strong> • Roll:{' '}
                  <strong className="text-teal-400 font-mono">{gradingModalStudent.rollNumber}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGradingModalStudent(null)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePracticalGrade} className="space-y-4 text-xs">
              {/* Experiment Marks (0 - 20) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-300">1. Experiment Performance & Setup</span>
                  <span className="font-mono text-teal-400">{gradingModalStudent.experimentMarks} / 20</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={gradingModalStudent.experimentMarks}
                  onChange={(e) =>
                    setGradingModalStudent({
                      ...gradingModalStudent,
                      experimentMarks: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Lab Record / Journal (0 - 10) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-300">2. Lab Record & Journal Documentation</span>
                  <span className="font-mono text-teal-400">{gradingModalStudent.labRecordMarks} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={gradingModalStudent.labRecordMarks}
                  onChange={(e) =>
                    setGradingModalStudent({
                      ...gradingModalStudent,
                      labRecordMarks: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Code Implementation (0 - 10) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-300">3. Algorithm Implementation & Execution</span>
                  <span className="font-mono text-teal-400">{gradingModalStudent.implementationMarks} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={gradingModalStudent.implementationMarks}
                  onChange={(e) =>
                    setGradingModalStudent({
                      ...gradingModalStudent,
                      implementationMarks: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Viva Oral (0 - 10) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-300">4. Viva-Voce & Concept Defense</span>
                  <span className="font-mono text-teal-400">{gradingModalStudent.vivaMarks} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={gradingModalStudent.vivaMarks}
                  onChange={(e) =>
                    setGradingModalStudent({
                      ...gradingModalStudent,
                      vivaMarks: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Live Aggregate Score Summary */}
              {(() => {
                const total =
                  gradingModalStudent.experimentMarks +
                  gradingModalStudent.labRecordMarks +
                  gradingModalStudent.implementationMarks +
                  gradingModalStudent.vivaMarks;
                const percentage = Math.round((total / 50) * 100);

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/60 to-emerald-950/60 border border-teal-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Total Marks Aggregated:</span>
                      <div className="text-2xl font-black text-white font-mono">
                        {total} <span className="text-sm font-normal text-teal-400">/ 50 M</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-neutral-400 block">Grade Assigned:</span>
                      <span className="px-3 py-1 rounded-xl bg-teal-900/80 border border-teal-700 text-teal-300 font-bold text-xs font-mono">
                        {total >= 45
                          ? 'O - 10 GP'
                          : total >= 40
                          ? 'A+ - 9 GP'
                          : total >= 35
                          ? 'A - 8 GP'
                          : total >= 30
                          ? 'B+ - 7 GP'
                          : total >= 20
                          ? 'P - Pass'
                          : 'F - Remedial'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/30 transition disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSubmittingGrade ? 'Submitting...' : 'Save & Commit Grade'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: STUDENT DOSSIER INSPECTOR DRAWER */}
      {/* ============================================================== */}
      {selectedStudentDossier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase font-bold tracking-wider">
                  STUDENT ACADEMIC DOSSIER
                </span>
                <h3 className="font-extrabold text-lg text-white">{selectedStudentDossier.student.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDossier(null)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-500 text-[10px]">Roll Number</span>
                <div className="font-mono font-bold text-teal-400 text-sm">
                  {selectedStudentDossier.rollNumber}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-500 text-[10px]">PRN Registration</span>
                <div className="font-mono text-neutral-200">
                  {selectedStudentDossier.prnNumber || 'Not assigned'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-500 text-[10px]">Email Address</span>
                <div className="font-mono text-neutral-200 truncate">
                  {selectedStudentDossier.student.email}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-500 text-[10px]">Class Division</span>
                <div className="font-mono text-neutral-200">
                  {activeClass?.classCode} (Div {activeClass?.division})
                </div>
              </div>
            </div>

            {/* Academic Standing */}
            {(() => {
              const rc = reportCards.find((r) => r.enrollmentId === selectedStudentDossier.id);
              const att = rc?.attendancePercentage ?? 100;
              const score = rc?.percentage ?? '—';

              return (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">Cumulative Academic Standing</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rc?.resultStatus === 'PASS'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {rc?.resultStatus || 'ENROLLED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500 text-[11px] block">Attendance Compliance:</span>
                      <strong className={`font-mono ${att >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {att}% {att < 75 && '(Defaulter Warning)'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[11px] block">Final Percentage:</span>
                      <strong className="text-white font-mono">{score !== '—' ? `${score}%` : 'Pending'}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentDossier(null)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CREATE TEST */}
      {/* ============================================================== */}
      {showCreateTestModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Create Course Assessment</h3>
                <p className="text-xs text-neutral-400">Class restricted to {activeClass?.classCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTestModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Test Title</label>
                <input
                  type="text"
                  required
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="e.g. Unit Test 1 - Computer Networks"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={testForm.durationMins}
                    onChange={(e) => setTestForm({ ...testForm, durationMins: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Pass Marks</label>
                  <input
                    type="number"
                    required
                    value={testForm.passMarks}
                    onChange={(e) => setTestForm({ ...testForm, passMarks: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Assessment Type</label>
                <select
                  value={testForm.academicTestType}
                  onChange={(e) => setTestForm({ ...testForm, academicTestType: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="UNIT_TEST">Unit Test (Theory / MCQ)</option>
                  <option value="SEMESTER_EXAM">Semester Exam</option>
                  <option value="REMEDIAL_EXAM">Remedial Exam</option>
                  <option value="PRACTICAL_EXAM">Practical Coding Assessment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTestModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  Create & Import Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CSV QUESTION BANK IMPORT */}
      {/* ============================================================== */}
      {showCsvQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Import Questions via CSV Bank</h3>
                <p className="text-xs text-neutral-400">Bulk author questions for target assessment</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCsvQuestionModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Format: <code className="text-teal-400 font-mono text-[11px]">question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation</code>
            </p>

            {csvFeedback && (
              <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-800 text-xs text-teal-300">
                {csvFeedback}
              </div>
            )}

            <form onSubmit={handleImportQuestionsCsv} className="space-y-3 text-xs">
              <textarea
                rows={7}
                value={csvQuestionsText}
                onChange={(e) => setCsvQuestionsText(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCsvQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingQuestions}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isImportingQuestions ? 'Parsing...' : 'Parse & Commit Questions'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CREATE VIVA SESSION */}
      {/* ============================================================== */}
      {showCreateVivaModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Create Subject Viva Session</h3>
            <form onSubmit={handleCreateViva} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Viva Title</label>
                <input
                  type="text"
                  required
                  value={vivaForm.title}
                  onChange={(e) => setVivaForm({ ...vivaForm, title: e.target.value })}
                  placeholder="e.g. Computer Networks Lab Viva"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Viva Topic</label>
                <input
                  type="text"
                  value={vivaForm.topic}
                  onChange={(e) => setVivaForm({ ...vivaForm, topic: e.target.value })}
                  placeholder="e.g. Subnetting & Socket Programming"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Max Marks</label>
                  <input
                    type="number"
                    value={vivaForm.maxMarks}
                    onChange={(e) => setVivaForm({ ...vivaForm, maxMarks: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Viva Type</label>
                  <select
                    value={vivaForm.vivaType}
                    onChange={(e) => setVivaForm({ ...vivaForm, vivaType: e.target.value as VivaType })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="INDIVIDUAL">Individual Viva</option>
                    <option value="BATCH">Batch Viva</option>
                    <option value="PRACTICAL_VIVA">Practical Viva</option>
                    <option value="PROJECT_VIVA">Project Viva</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateVivaModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  Schedule Viva Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: REPORT CARD VIEWER & PRINT STUDIO */}
      {/* ============================================================== */}
      {showReportCardModal && selectedReportCard && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-3xl w-full max-w-2xl p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b-2 border-neutral-900 pb-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
                  OFFICIAL INSTITUTIONAL MARKSHEET
                </span>
                <h2 className="text-xl font-black uppercase text-neutral-950">STUDENT GRADE CARD</h2>
                <div className="text-xs text-neutral-600 font-medium">
                  {selectedReportCard.academicYear} • {selectedReportCard.semester}
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-700 font-mono block">
                  {selectedReportCard.percentage}%
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {selectedReportCard.resultStatus}
                </span>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-100 rounded-2xl text-xs font-semibold">
              <div>
                Student Name:{' '}
                <strong className="text-sm text-neutral-900 block">{selectedReportCard.enrollment?.student.fullName}</strong>
              </div>
              <div>
                Roll Number:{' '}
                <strong className="font-mono text-sm text-neutral-900 block">{selectedReportCard.enrollment?.rollNumber}</strong>
              </div>
              <div>
                Attendance Rate:{' '}
                <strong className="text-neutral-900 block">{selectedReportCard.attendancePercentage}%</strong>
              </div>
              <div>
                Institutional Result:{' '}
                <strong className="text-emerald-700 block">{selectedReportCard.resultStatus}</strong>
              </div>
            </div>

            {/* Performance Rubric Summary */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                Component Breakdown
              </div>
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 font-semibold text-neutral-600">
                    <tr>
                      <th className="p-2.5">Component</th>
                      <th className="p-2.5 text-center">Max Marks</th>
                      <th className="p-2.5 text-center">Weightage</th>
                      <th className="p-2.5 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-2.5 font-medium">Internal Theory & Unit Tests</td>
                      <td className="p-2.5 text-center font-mono">50</td>
                      <td className="p-2.5 text-center">50%</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">Satisfactory</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">Continuous Practical & Lab Journal</td>
                      <td className="p-2.5 text-center font-mono">50</td>
                      <td className="p-2.5 text-center">30%</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">Competent</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">Oral Viva-Voce Assessment</td>
                      <td className="p-2.5 text-center font-mono">20</td>
                      <td className="p-2.5 text-center">20%</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">Defended</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-neutral-500">
              <div className="border-t border-neutral-300 pt-2 font-medium">Class Teacher Signature</div>
              <div className="border-t border-neutral-300 pt-2 font-medium">Head of Department / Dean</div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Card</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportCardModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE CLASS EVENT */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Schedule Class Event / Lecture</h3>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Distributed Systems Lecture 4"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Event Type</label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="LECTURE">Lecture</option>
                    <option value="PRACTICAL">Lab Practical</option>
                    <option value="VIVA">Oral Viva</option>
                    <option value="TEST">Unit Test</option>
                    <option value="CLASS_EVENT">Class Event</option>
                    <option value="DEADLINE">Submission Deadline</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Location / Room</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="Lab 302 / Room 405"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.startAt}
                    onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.endAt}
                    onChange={(e) => setEventForm({ ...eventForm, endAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmittingEvent ? 'Saving...' : 'Add to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUBJECT TO CLASS (Class Teacher Authority) */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Add Subject to Class Curriculum</h3>
                <p className="text-xs text-neutral-400">Class: {activeClass?.classCode} • Div {activeClass?.division}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g. Cloud Computing & DevOps"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CS501"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white uppercase font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Curriculum Component Type</label>
                <select
                  value={subjectForm.type}
                  onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value as SubjectComponentType })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="THEORY">Theory Only (Lectures & Unit Tests)</option>
                  <option value="PRACTICAL">Practical Only (Lab Work & Experiments)</option>
                  <option value="VIVA">Viva Only (Oral Concept Examination)</option>
                  <option value="BOTH">Integrated (Theory + Practical + Viva)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1 text-[11px]">Theory Max</label>
                  <input
                    type="number"
                    value={subjectForm.maxTheoryMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxTheoryMarks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1 text-[11px]">Practical Max</label>
                  <input
                    type="number"
                    value={subjectForm.maxPracticalMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxPracticalMarks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1 text-[11px]">Viva Max</label>
                  <input
                    type="number"
                    value={subjectForm.maxVivaMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxVivaMarks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1 text-[11px]">Internal Max</label>
                  <input
                    type="number"
                    value={subjectForm.maxInternalMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxInternalMarks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSubject}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/30 disabled:opacity-50"
                >
                  {isSubmittingSubject ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN SUBJECT TEACHER (Class Teacher Authority) */}
      {showAssignTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Assign Faculty to Subject</h3>
                <p className="text-xs text-neutral-400">Class: {activeClass?.classCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignTeacherModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubjectTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Target Subject</label>
                <select
                  required
                  value={assignTeacherForm.subjectId}
                  onChange={(e) => setAssignTeacherForm({ ...assignTeacherForm, subjectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Subject --</option>
                  {(classDetails?.subjects || activeClass?.subjects || []).map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Select Faculty Teacher</label>
                <select
                  required
                  value={assignTeacherForm.teacherId}
                  onChange={(e) => setAssignTeacherForm({ ...assignTeacherForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {facultyList.map((tea: any) => (
                    <option key={tea.id} value={tea.id}>
                      {tea.fullName} ({tea.email}) {tea.department ? `• ${tea.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Teaching Component Role</label>
                <select
                  value={assignTeacherForm.componentType}
                  onChange={(e) =>
                    setAssignTeacherForm({
                      ...assignTeacherForm,
                      componentType: e.target.value as SubjectComponentType,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="THEORY">Theory Teacher (Lectures & Unit Tests)</option>
                  <option value="PRACTICAL">Practical Teacher (Lab Sessions & Practical Marks)</option>
                  <option value="VIVA">Viva Examiner (Oral Viva & Concept Defense)</option>
                  <option value="BOTH">Primary Instructor (Theory & Practicals)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAssignTeacherModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTeacherAssign}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmittingTeacherAssign ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 py-4 px-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <PaperboatLogo size="sm" variant="icon" showSubtitle={false} />
          <span>&copy; {new Date().getFullYear()} Paperboat Education Systems Inc. Powered by ExamForge Assessment Engine.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/academic" className="hover:text-teal-400 transition">Academic ERP</Link>
          <Link href="/college" className="hover:text-emerald-400 transition">College Admin</Link>
          <Link href="/student" className="hover:text-blue-400 transition">Student Portal</Link>
        </div>
      </footer>
    </div>
  );
}
