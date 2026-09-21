'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  School,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Layers,
  Plus,
  Search,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Check,
  Edit2,
  Trash2,
  ChevronRight,
  ClipboardList,
  Sparkles,
  BarChart3,
  FileText,
  Printer,
  KeyRound,
  ArrowRight,
  Filter,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserX,
  X,
  Lock,
} from 'lucide-react';
import {
  api,
  AcademicDepartment,
  AcademicYearItem,
  AcademicClassItem,
  AcademicSubject,
  StudentEnrollmentItem,
  UserProfile,
  SubjectComponentType,
  AttendanceStatus,
  VivaType,
} from '@/lib/api';
import CsvImportWizard, { CSVImportType } from '@/components/CsvImportWizard';
import PaperboatLogo from '@/components/PaperboatLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AcademicManagementPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Active View Navigation
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'structure'
    | 'classes'
    | 'students'
    | 'class-teachers'
    | 'subject-teachers'
    | 'attendance'
    | 'tests'
    | 'viva'
    | 'practical'
    | 'theory'
    | 'performance'
    | 'report-cards'
    | 'calendar'
  >('dashboard');

  // Academic Structure State
  const [structure, setStructure] = useState<{
    departments: AcademicDepartment[];
    academicYears: AcademicYearItem[];
    classes: AcademicClassItem[];
    metrics: {
      totalStudents: number;
      totalTeachers: number;
      totalClasses: number;
      totalSubjects: number;
      activeTests: number;
      completedTests: number;
    };
  } | null>(null);

  // Selected Class & Subject context for drill-down
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Assignments Context (for Teachers)
  const [assignments, setAssignments] = useState<{
    isClassTeacher: boolean;
    classTeacherOf: AcademicClassItem[];
    isSubjectTeacher: boolean;
    subjectTeacherOf: Array<{ class: AcademicClassItem; subject: AcademicSubject; componentType: SubjectComponentType }>;
  } | null>(null);

  // Students in selected class
  const [classStudents, setClassStudents] = useState<StudentEnrollmentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Modals
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showAssignClassTeacherModal, setShowAssignClassTeacherModal] = useState(false);
  const [showAssignSubjectTeacherModal, setShowAssignSubjectTeacherModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showBulkStudentCsvModal, setShowBulkStudentCsvModal] = useState(false);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [showCsvQuestionModal, setShowCsvQuestionModal] = useState(false);
  const [showCreateVivaModal, setShowCreateVivaModal] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState<any>(null);

  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [classForm, setClassForm] = useState({
    departmentId: '',
    programId: '',
    academicYearId: '',
    yearLevel: 'Third Year',
    semester: 'Semester V',
    division: 'A',
    customClassCode: '',
  });
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    type: 'THEORY' as SubjectComponentType,
    maxTheoryMarks: 100,
    maxPracticalMarks: 50,
    maxVivaMarks: 20,
    maxInternalMarks: 20,
  });
  const [testForm, setTestForm] = useState({
    title: '',
    academicTestType: 'UNIT_TEST',
    durationMins: 60,
    passMarks: 40,
    defaultMarks: 1,
    defaultNegativeMarks: 0,
    description: '',
  });
  const [vivaForm, setVivaForm] = useState({
    title: '',
    topic: '',
    vivaType: 'INDIVIDUAL' as VivaType,
    maxMarks: 20,
    durationMins: 15,
  });

  // Bulk Student CSV
  const [csvText, setCsvText] = useState(
    'roll_no,full_name,email,prn\n1,Alice Walker,alice@college.edu,PRN2026001\n2,Bob Martin,bob@college.edu,PRN2026002'
  );
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  // CSV Question Bank
  const [questionCsvText, setQuestionCsvText] = useState(
    'question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation\nWhat layer does IP operate at in OSI model?,MCQ,Physical,Data Link,Network,Transport,C,2,0,Network layer is responsible for logical addressing\nWhich of the following are connectionless protocols?,MSQ,TCP,UDP,IP,HTTP,B|C,2,0,UDP and IP are connectionless'
  );
  const [questionCsvFeedback, setQuestionCsvFeedback] = useState<string | null>(null);
  const [targetTestId, setTargetTestId] = useState<string>('');

  // Practical Marks Sheet state
  const [practicalRoster, setPracticalRoster] = useState<any[]>([]);
  // Theory Marks Sheet state
  const [theoryRoster, setTheoryRoster] = useState<any[]>([]);
  // Viva Roster state
  const [selectedVivaId, setSelectedVivaId] = useState<string>('');
  const [vivaRoster, setVivaRoster] = useState<any[]>([]);
  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, AttendanceStatus>>({});
  // Report Cards State
  const [reportCards, setReportCards] = useState<any[]>([]);
  // Performance State
  const [classPerformance, setClassPerformance] = useState<any>(null);

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('agenda');
  const [showCreateCalendarModal, setShowCreateCalendarModal] = useState<boolean>(false);
  const [calendarForm, setCalendarForm] = useState({
    title: '',
    description: '',
    eventType: 'LECTURE',
    subjectId: '',
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    location: '',
  });

  // CSV Import Wizard State
  const [showCsvWizard, setShowCsvWizard] = useState<boolean>(false);
  const [csvWizardType, setCsvWizardType] = useState<CSVImportType>('student');

  // Available Teachers List
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [assignComponentType, setAssignComponentType] = useState<SubjectComponentType>('THEORY');

  // Load Auth and Data
  useEffect(() => {
    const savedToken =
      localStorage.getItem('token') ||
      sessionStorage.getItem('exam_forge_token') ||
      sessionStorage.getItem('teacher_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    localStorage.setItem('token', savedToken);
    sessionStorage.setItem('exam_forge_token', savedToken);
    setToken(savedToken);
    bootstrapData(savedToken);
  }, []);

  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, 'Password@123');
      if (res.token) {
        localStorage.setItem('token', res.token);
        sessionStorage.setItem('exam_forge_token', res.token);
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          sessionStorage.setItem('exam_forge_user', JSON.stringify(res.user));
        }
        setToken(res.token);
        await bootstrapData(res.token);
      }
    } catch (err: any) {
      alert(`Login failed: ${err.message || 'Please check credentials'}`);
      setLoading(false);
    }
  };

  const bootstrapData = async (authToken: string) => {
    setLoading(true);
    try {
      const [me, struct, myAssign, teachers] = await Promise.all([
        api.getMe(authToken),
        api.getAcademicStructure(authToken).catch(() => null),
        api.getMyAcademicAssignments(authToken).catch(() => null),
        api.getTeachers(authToken).catch(() => []),
      ]);

      setUser(me);
      setStructure(struct);
      setAssignments(myAssign);
      setTeachersList(teachers);

      if (struct && struct.classes.length > 0) {
        // Auto-select first assigned class or first available class
        const initialClassId =
          myAssign?.classTeacherOf[0]?.id ||
          myAssign?.subjectTeacherOf[0]?.class?.id ||
          struct.classes[0].id;

        setSelectedClassId(initialClassId);
        loadClassSubData(authToken, initialClassId);
      }
    } catch (err) {
      console.error('Failed to bootstrap academic data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassSubData = async (authToken: string, classId: string) => {
    if (!classId) return;
    setIsLoadingStudents(true);
    try {
      const [students, classDet, perf, cards] = await Promise.all([
        api.getClassStudents(authToken, classId).catch(() => []),
        api.getClassDetails(authToken, classId).catch(() => null),
        api.getClassPerformance(authToken, classId).catch(() => null),
        api.getClassReportCards(authToken, classId).catch(() => []),
      ]);

      setClassStudents(students);
      setClassPerformance(perf);
      setReportCards(cards);

      // Initialize attendance sheet
      const attMap: Record<string, AttendanceStatus> = {};
      students.forEach((s) => {
        attMap[s.id] = 'PRESENT';
      });
      setAttendanceSheet(attMap);

      if (classDet && classDet.subjects && classDet.subjects.length > 0) {
        const initialSubId = classDet.subjects[0].id;
        setSelectedSubjectId(initialSubId);
        loadSubjectMarks(authToken, classId, initialSubId);
      }

      loadCalendar(authToken, classId);
    } catch (err) {
      console.error('Failed to load class sub data:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadCalendar = async (authToken: string, classId?: string) => {
    try {
      const res = await api.getCalendarEvents(authToken, classId ? { classId } : undefined);
      setCalendarEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
  };

  const handleCreateCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await api.createCalendarEvent(token, {
        title: calendarForm.title,
        description: calendarForm.description,
        eventType: calendarForm.eventType,
        classId: selectedClassId || undefined,
        subjectId: calendarForm.subjectId || undefined,
        startAt: calendarForm.startAt,
        endAt: calendarForm.endAt,
        location: calendarForm.location,
      });
      setShowCreateCalendarModal(false);
      setCalendarForm({
        title: '',
        description: '',
        eventType: 'LECTURE',
        subjectId: '',
        startAt: new Date().toISOString().slice(0, 16),
        endAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        location: '',
      });
      loadCalendar(token, selectedClassId);
    } catch (err: any) {
      alert(err.message || 'Failed to create calendar event');
    }
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    if (!token || !confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteCalendarEvent(token, eventId);
      loadCalendar(token, selectedClassId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const loadSubjectMarks = async (authToken: string, classId: string, subjectId: string) => {
    if (!classId || !subjectId) return;
    try {
      const [prac, theo, vivs] = await Promise.all([
        api.getPracticalMarks(authToken, classId, subjectId).catch(() => null),
        api.getTheoryMarks(authToken, classId, subjectId).catch(() => null),
        api.getVivas(authToken, classId, subjectId).catch(() => []),
      ]);

      if (prac) setPracticalRoster(prac.roster);
      if (theo) setTheoryRoster(theo.roster);
      if (vivs && vivs.length > 0) {
        setSelectedVivaId(vivs[0].id);
        const vivRoster = await api.getVivaRoster(authToken, vivs[0].id).catch(() => null);
        if (vivRoster) setVivaRoster(vivRoster.students);
      }
    } catch (err) {
      console.error('Failed to load subject marks:', err);
    }
  };

  // Switch class
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    if (token) loadClassSubData(token, classId);
  };

  // Switch subject
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (token && selectedClassId) loadSubjectMarks(token, selectedClassId, subjectId);
  };

  // Selected Class details
  const activeClass = useMemo(() => {
    return structure?.classes.find((c) => c.id === selectedClassId) || null;
  }, [structure, selectedClassId]);

  // Selected Subject details
  const activeSubject = useMemo(() => {
    return activeClass?.subjects?.find((s) => s.id === selectedSubjectId) || null;
  }, [activeClass, selectedSubjectId]);

  // Create Department Handler
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    try {
      await api.createDepartment(token, deptForm);
      setShowCreateDeptModal(false);
      setDeptForm({ name: '', code: '' });
      bootstrapData(token);
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  };

  // Create Class Handler
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    try {
      const newCls = await api.createClass(token, classForm);
      setShowCreateClassModal(false);
      bootstrapData(token);
      setSelectedClassId(newCls.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create class');
    }
  };

  // Assign Class Teacher Handler
  const handleAssignClassTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    if (!selectedClassId) {
      alert('Please select or create an academic class first.');
      return;
    }
    if (!selectedTeacherId) {
      alert('Please choose a faculty member from the list.');
      return;
    }
    try {
      await api.assignClassTeacher(token, selectedClassId, selectedTeacherId);
      setShowAssignClassTeacherModal(false);
      bootstrapData(token);
    } catch (err: any) {
      alert(err.message || 'Failed to assign class teacher');
    }
  };

  // Create Subject Handler
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    if (!selectedClassId) {
      alert('Please select or create an academic class first.');
      return;
    }
    try {
      await api.createClassSubject(token, selectedClassId, subjectForm);
      setShowAddSubjectModal(false);
      setSubjectForm({
        name: '',
        code: '',
        type: 'THEORY',
        maxTheoryMarks: 100,
        maxPracticalMarks: 50,
        maxVivaMarks: 20,
        maxInternalMarks: 20,
      });
      loadClassSubData(token, selectedClassId);
    } catch (err: any) {
      alert(err.message || 'Failed to create subject');
    }
  };

  // Assign Subject Teacher Handler
  const handleAssignSubjectTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    if (!selectedClassId) {
      alert('Please select an academic class first.');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject from the list.');
      return;
    }
    if (!selectedTeacherId) {
      alert('Please select a faculty member from the list.');
      return;
    }
    try {
      await api.assignSubjectTeacher(token, selectedClassId, {
        subjectId: selectedSubjectId,
        teacherId: selectedTeacherId,
        componentType: assignComponentType,
      });
      setShowAssignSubjectTeacherModal(false);
      loadClassSubData(token, selectedClassId);
    } catch (err: any) {
      alert(err.message || 'Failed to assign subject teacher');
    }
  };

  // Bulk Student CSV Import Handler
  const handleBulkStudentCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedClassId) return;
    setCsvFeedback(null);

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain header and at least one row');

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const studentsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          const rollIndex = headers.findIndex((h) => h.includes('roll'));
          const nameIndex = headers.findIndex((h) => h.includes('name'));
          const emailIndex = headers.findIndex((h) => h.includes('email'));
          const prnIndex = headers.findIndex((h) => h.includes('prn'));

          studentsToImport.push({
            rollNumber: parts[rollIndex !== -1 ? rollIndex : 0],
            fullName: parts[nameIndex !== -1 ? nameIndex : 1],
            email: parts[emailIndex !== -1 ? emailIndex : 2],
            prnNumber: prnIndex !== -1 ? parts[prnIndex] : undefined,
          });
        }
      }

      const res = await api.bulkEnrollStudentsCsv(token, selectedClassId, studentsToImport);
      setCsvFeedback(`Successfully enrolled ${res.importedCount} students! Failed: ${res.failedCount}`);
      loadClassSubData(token, selectedClassId);
      setTimeout(() => setShowBulkStudentCsvModal(false), 2000);
    } catch (err: any) {
      setCsvFeedback(`Error: ${err.message}`);
    }
  };

  // Create Test Handler
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    if (!selectedClassId) {
      alert('Please select an academic class first.');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject to associate this test with.');
      return;
    }
    try {
      const newTest = await api.createAcademicTest(token, selectedClassId, selectedSubjectId, testForm);
      setShowCreateTestModal(false);
      setTargetTestId(newTest.id);
      setShowCsvQuestionModal(true); // Offer CSV question upload immediately
    } catch (err: any) {
      alert(err.message || 'Failed to create test');
    }
  };

  // Import Questions CSV Handler
  const handleImportQuestionCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !targetTestId) return;
    setQuestionCsvFeedback(null);

    try {
      const lines = questionCsvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain a header and at least one question');

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const questionsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          questionsToImport.push({
            question: parts[0],
            type: parts[1] || 'MCQ',
            option_a: parts[2] || '',
            option_b: parts[3] || '',
            option_c: parts[4] || '',
            option_d: parts[5] || '',
            correct_answer: parts[6] || 'A',
            marks: parts[7] || 1,
            negative_marks: parts[8] || 0,
            explanation: parts[9] || '',
          });
        }
      }

      const res = await api.importQuestionsCsv(token, targetTestId, questionsToImport);
      setQuestionCsvFeedback(`Imported ${res.importedCount} questions successfully! Errors: ${res.failedCount}`);
      setTimeout(() => setShowCsvQuestionModal(false), 2000);
    } catch (err: any) {
      setQuestionCsvFeedback(`Error: ${err.message}`);
    }
  };

  // Create Viva Handler
  const handleCreateViva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Authentication required. Please log in with faculty or admin credentials.');
      return;
    }
    if (!selectedClassId) {
      alert('Please select an academic class first.');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject to associate this viva with.');
      return;
    }
    try {
      await api.createViva(token, selectedClassId, selectedSubjectId, vivaForm);
      setShowCreateVivaModal(false);
      loadSubjectMarks(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to create viva');
    }
  };

  // Practical Marks Entry Handler
  const handleSavePracticalMarks = async (enrollmentId: string, values: any) => {
    if (!token || !selectedClassId || !selectedSubjectId) return;
    try {
      await api.submitPracticalMarks(token, selectedClassId, selectedSubjectId, {
        enrollmentId,
        ...values,
      });
      loadSubjectMarks(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to save practical marks');
    }
  };

  // Theory Marks Entry Handler
  const handleSaveTheoryMarks = async (enrollmentId: string, values: any) => {
    if (!token || !selectedClassId || !selectedSubjectId) return;
    try {
      await api.submitTheoryMarks(token, selectedClassId, selectedSubjectId, {
        enrollmentId,
        ...values,
      });
      loadSubjectMarks(token, selectedClassId, selectedSubjectId);
    } catch (err: any) {
      alert(err.message || 'Failed to save theory marks');
    }
  };

  // Attendance Submit Handler
  const handleSubmitAttendance = async () => {
    if (!token || !selectedClassId) return;
    const records = Object.entries(attendanceSheet).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
    }));

    try {
      await api.submitClassAttendance(token, selectedClassId, {
        date: attendanceDate,
        records,
      });
      alert(`Attendance recorded for ${records.length} students!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance');
    }
  };

  // Generate Report Cards Handler
  const handleGenerateReportCards = async () => {
    if (!token || !selectedClassId) return;
    try {
      const res = await api.generateClassReportCards(token, selectedClassId);
      alert(res.message);
      loadClassSubData(token, selectedClassId);
    } catch (err: any) {
      alert(err.message || 'Failed to generate report cards');
    }
  };

  // View Report Card Detail
  const handleViewReportCard = async (reportCardId: string) => {
    if (!token) return;
    try {
      const card = await api.getReportCard(token, reportCardId);
      setSelectedReportCard(card);
      setShowReportCardModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load report card');
    }
  };

  // -------------------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white space-y-4">
        <School className="h-12 w-12 text-emerald-400 animate-pulse" />
        <p className="text-sm font-semibold text-neutral-400 animate-pulse">
          Loading Academic & Assessment Management ERP...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER MAIN ERP SUITE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/70 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PaperboatLogo size="sm" variant="badge" href="/" />

            <span className="text-neutral-600">/</span>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Academic Governance ERP</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                {user?.role === 'ORG_ADMIN' ? 'COLLEGE ADMIN' : 'FACULTY'}
              </span>
            </div>
          </div>

          {/* User Status / Role Pill */}
          <div className="flex items-center gap-3">
            {assignments?.isClassTeacher && (
              <span className="px-2.5 py-1 rounded-full bg-teal-950/80 border border-teal-700 text-teal-300 text-[11px] font-bold flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-teal-400" />
                <span>Class Teacher: {assignments.classTeacherOf[0]?.classCode}</span>
              </span>
            )}
            {/* Quick Role Switcher */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('college.admin@stanford.edu')}
                title="Switch to College Admin"
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  user?.email === 'college.admin@stanford.edu'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Principal
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher@example.com')}
                title="Switch to Class Teacher (Prof. Reynolds)"
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  user?.email === 'teacher@example.com'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Class Teacher
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('rahul.teacher@stanford.edu')}
                title="Switch to Subject Teacher (Prof. Sharma)"
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  user?.email === 'rahul.teacher@stanford.edu'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Subject Teacher
              </button>
            </div>

            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-white">{user?.fullName || 'Not Signed In'}</div>
              <div className="text-[10px] text-neutral-400">{user?.email || 'Guest Access'}</div>
            </div>
            <ThemeToggle />
            <Link
              href="/college"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition"
            >
              Exit ERP
            </Link>
          </div>
        </div>
      </header>

      {/* Session Alert / Fast Login Prompt if Unauthenticated */}
      {!token && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-indigo-950/80 border-b border-emerald-500/30 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Active ERP Session Required</h4>
                <p className="text-xs text-neutral-400">
                  Select a pre-configured role below to test the full College ERP flow with one click:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickLogin('college.admin@stanford.edu')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <School className="h-3.5 w-3.5" />
                <span>Login: College Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher@example.com')}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Login: Class Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('rahul.teacher@stanford.edu')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Login: Subject Teacher</span>
              </button>
              <Link
                href="/login"
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
              >
                Standard Login Page
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Horizontal Navigation Strip (< lg screens) */}
      <div className="lg:hidden border-b border-neutral-800/80 bg-neutral-900/90 backdrop-blur px-4 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 text-xs font-semibold">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'structure', label: 'Structure', icon: Building2 },
          { id: 'classes', label: 'Classes', icon: School },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'class-teachers', label: 'Class Teachers', icon: UserCheck },
          { id: 'subject-teachers', label: 'Subject Teachers', icon: BookOpen },
          { id: 'attendance', label: 'Attendance', icon: ClipboardList },
          { id: 'tests', label: 'Tests', icon: Award },
          { id: 'viva', label: 'Viva', icon: Sparkles },
          { id: 'practical', label: 'Practical', icon: Layers },
          { id: 'theory', label: 'Theory', icon: FileText },
          { id: 'performance', label: 'Performance', icon: TrendingUp },
          { id: 'report-cards', label: 'Report Cards', icon: Printer },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1.5 transition ${
                isActive ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white bg-neutral-950/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Breadcrumb Strip */}
      <div className="border-b border-neutral-800/60 bg-neutral-900/30 px-6 py-2.5 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap font-mono">
          <span className="text-neutral-500">Hierarchy:</span>
          <span className="text-emerald-400 font-bold">
            {user?.organization?.name || 'College'}
          </span>
          <ChevronRight className="h-3 w-3 text-neutral-600" />
          <span className="text-neutral-300">{activeClass?.department?.name || 'Department'}</span>
          <ChevronRight className="h-3 w-3 text-neutral-600" />
          <span className="text-neutral-300">{activeClass?.program?.name || 'Program'}</span>
          <ChevronRight className="h-3 w-3 text-neutral-600" />
          <span className="text-neutral-300">{activeClass?.yearLevel || 'Year'}</span>
          <ChevronRight className="h-3 w-3 text-neutral-600" />
          <span className="text-white font-bold bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
            {activeClass?.classCode || 'Class ID'}
          </span>
          {activeSubject && (
            <>
              <ChevronRight className="h-3 w-3 text-neutral-600" />
              <span className="text-teal-400 font-bold">{activeSubject.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Main ERP Layout: Sidebar + Workspace */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-6 py-6 gap-6">
        {/* ============================================================== */}
        {/* SIDEBAR NAVIGATION */}
        {/* ============================================================== */}
        <aside className="w-64 shrink-0 space-y-4 hidden lg:block">
          {/* Active Context Card */}
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3">
            <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
              Selected Class
            </div>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none font-mono"
            >
              {structure?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.classCode} ({c.yearLevel})
                </option>
              ))}
            </select>

            {activeClass?.subjects && activeClass.subjects.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-mono text-teal-400 uppercase font-bold tracking-wider">
                  Selected Subject
                </div>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                >
                  {activeClass.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-2 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Academic Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('structure')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'structure' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Academic Structure</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'classes' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Classes & Divisions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'students' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Students Roster ({classStudents.length})</span>
            </button>

            <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Teacher Assignments
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('class-teachers')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'class-teachers' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Class Teachers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subject-teachers')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'subject-teachers' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Subject Teachers</span>
            </button>

            <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Evaluations & Marks
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'attendance' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Attendance Register</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'tests' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Class-Restricted Tests</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('viva')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'viva' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Viva Module</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('practical')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'practical' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Practical Marks (50M)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theory')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'theory' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Theory Marks</span>
            </button>

            <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Performance & Reports
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('performance')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'performance' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Class Analytics & Risk</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report-cards')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'report-cards' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Official Report Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                activeTab === 'calendar' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Institutional Calendar</span>
            </button>
          </nav>
        </aside>

        {/* ============================================================== */}
        {/* MAIN WORKSPACE AREA */}
        {/* ============================================================== */}
        <main className="flex-1 space-y-6 overflow-hidden">
          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Metrics Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
                    <span>Total Students</span>
                    <Users className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{structure?.metrics.totalStudents || 0}</div>
                  <div className="text-[11px] text-neutral-500">Across enrolled divisions</div>
                </div>

                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
                    <span>Total Faculty</span>
                    <GraduationCap className="h-4 w-4 text-teal-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{structure?.metrics.totalTeachers || 0}</div>
                  <div className="text-[11px] text-neutral-500">Class & Subject Teachers</div>
                </div>

                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
                    <span>Active Classes</span>
                    <Layers className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{structure?.metrics.totalClasses || 0}</div>
                  <div className="text-[11px] text-neutral-500">Divisions configured</div>
                </div>

                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
                    <span>Active Tests</span>
                    <ClipboardList className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {structure?.metrics.activeTests || 0}
                  </div>
                  <div className="text-[11px] text-neutral-500">Class-restricted assessments</div>
                </div>
              </div>

              {/* Class Summary Banner */}
              {activeClass && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-900/50 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono font-bold text-emerald-400 uppercase">
                        ACTIVE CLASS CONTEXT
                      </div>
                      <h2 className="text-xl font-black text-white">{activeClass.classCode}</h2>
                      <p className="text-xs text-neutral-400">
                        {activeClass.program?.name} • {activeClass.yearLevel} • {activeClass.semester} • {activeClass.division}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCsvWizardType('student');
                          setShowCsvWizard(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-semibold flex items-center gap-2 transition"
                      >
                        <Upload className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Upload CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateTestModal(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Assessment</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-800/80 text-xs">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                      <span>Class Teacher:</span>
                      <strong className="text-white">
                        {activeClass.classTeacherAssignment?.teacher.fullName || 'Not Assigned'}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <BookOpen className="h-4 w-4 text-teal-400" />
                      <span>Subjects Registered:</span>
                      <strong className="text-white">{activeClass.subjects?.length || 0}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Users className="h-4 w-4 text-indigo-400" />
                      <span>Enrolled Students:</span>
                      <strong className="text-white">{classStudents.length}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. ACADEMIC STRUCTURE (Departments, Programs, Academic Years) */}
          {activeTab === 'structure' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Academic Departments & Programs</h3>
                  <p className="text-xs text-neutral-400">Manage institutional hierarchy and academic years</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateDeptModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Department</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {structure?.departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/40 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-base text-white">{dept.name}</div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        {dept.code}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-400 space-y-1">
                      <div>Programs Registered: {dept.programs?.length || 0}</div>
                      <div>Total Classes Configured: {dept._count?.classes || 0}</div>
                    </div>

                    {dept.programs && dept.programs.length > 0 && (
                      <div className="pt-2 border-t border-neutral-800/80 space-y-1">
                        <div className="text-[11px] font-mono text-neutral-500 font-bold">PROGRAMS:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {dept.programs.map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 font-medium"
                            >
                              {p.name} ({p.code})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. CLASSES & DIVISIONS */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Academic Classes & Divisions</h3>
                  <p className="text-xs text-neutral-400">Configure program cohorts with generated Class IDs</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Class</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {structure?.classes.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleClassChange(c.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition space-y-3 ${
                      c.id === selectedClassId
                        ? 'bg-neutral-900 border-emerald-500/70 shadow-lg shadow-emerald-950/40'
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-white font-mono">{c.classCode}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-950 text-emerald-400 border border-neutral-800">
                        Div {c.division}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-300">
                      <div>{c.program?.name}</div>
                      <div className="text-neutral-500 mt-0.5">{c.yearLevel} • {c.semester}</div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
                      <span>Class Teacher:</span>
                      <strong className="text-emerald-400">
                        {c.classTeacherAssignment?.teacher.fullName || 'Unassigned'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. STUDENTS ROSTER */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Enrolled Students — {activeClass?.classCode}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Total: {classStudents.length} students enrolled in this division
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvWizardType('student');
                      setShowCsvWizard(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload CSV</span>
                  </button>
                </div>
              </div>

              {/* Student Table */}
              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">PRN / Enrollment</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                          No students enrolled in this division. Click &quot;Import CSV&quot; to add students.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-neutral-800/30 transition">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">{s.rollNumber}</td>
                          <td className="px-4 py-3 font-bold text-white">{s.student.fullName}</td>
                          <td className="px-4 py-3 text-neutral-400 font-mono">{s.student.email}</td>
                          <td className="px-4 py-3 text-neutral-400 font-mono">{s.prnNumber || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. CLASS TEACHERS ASSIGNMENT */}
          {activeTab === 'class-teachers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Class Teacher Assignments</h3>
                  <p className="text-xs text-neutral-400">
                    Each division is assigned exactly one primary Class Teacher
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssignClassTeacherModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Assign Class Teacher</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {structure?.classes.map((c) => (
                  <div key={c.id} className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{c.classCode}</span>
                      <span className="text-xs text-neutral-400">{c.yearLevel}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {c.classTeacherAssignment?.teacher.fullName || 'No Class Teacher Assigned'}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {c.classTeacherAssignment?.teacher.email || 'Click assign to set primary teacher'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. SUBJECT TEACHERS ASSIGNMENT */}
          {activeTab === 'subject-teachers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Subject Teachers — {activeClass?.classCode}</h3>
                  <p className="text-xs text-neutral-400">
                    Assign faculty to Theory, Practical, and Viva components
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Subject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignSubjectTeacherModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Assign Teacher</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeClass?.subjects?.map((sub) => {
                  const assignment = activeClass.subjectTeacherAssignments?.find((a) => a.subject.id === sub.id);

                  return (
                    <div key={sub.id} className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{sub.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                          {sub.code} • {sub.type}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {assignment?.teacher.fullName || 'Unassigned Subject Teacher'}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono">
                            {assignment?.teacher.email || 'Click Assign Teacher to link faculty'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. ATTENDANCE REGISTER */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
                <div>
                  <h3 className="font-bold text-sm text-white">Daily Attendance Register</h3>
                  <p className="text-xs text-neutral-400">Mark Present, Absent, Late, or Leave for {activeClass?.classCode}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitAttendance}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Attendance</span>
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-center">Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {classStudents.map((s) => {
                      const curStatus = attendanceSheet[s.id] || 'PRESENT';

                      return (
                        <tr key={s.id} className="hover:bg-neutral-800/30 transition">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">{s.rollNumber}</td>
                          <td className="px-4 py-3 font-bold text-white">{s.student.fullName}</td>
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
                                        ? 'bg-emerald-600 text-white'
                                        : status === 'ABSENT'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-amber-600 text-white'
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

          {/* 8. CLASS-RESTRICTED TESTS */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Class-Restricted Tests</h3>
                  <p className="text-xs text-neutral-400">
                    Assessments strictly isolated to students of {activeClass?.classCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateTestModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Test</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Lock className="h-4 w-4" />
                  <span>Class-Lock Security Active</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Every test created here carries an irrevocable backend authorization binding. Students in other divisions cannot attempt the test even if they possess the URL.
                </p>
              </div>
            </div>
          )}

          {/* 9. PRACTICAL MARKS (50 Marks Engine) */}
          {activeTab === 'practical' && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Practical Evaluation Sheet (Total: 50 Marks)</h3>
                  <p className="text-xs text-neutral-400">
                    Experiment (20M) + Lab Record (10M) + Implementation (10M) + Viva (10M)
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 text-xs font-bold">
                  {activeSubject?.name || 'Select Subject'}
                </span>
              </div>

              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-3 py-3">Exp (20)</th>
                      <th className="px-3 py-3">Record (10)</th>
                      <th className="px-3 py-3">Imp (10)</th>
                      <th className="px-3 py-3">Viva (10)</th>
                      <th className="px-4 py-3">Total (50)</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {practicalRoster.map((item) => {
                      const assess = item.assessment || {};

                      return (
                        <tr key={item.enrollmentId} className="hover:bg-neutral-800/30">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">{item.rollNumber}</td>
                          <td className="px-4 py-3 font-bold text-white">{item.fullName}</td>
                          <td className="px-3 py-3 font-mono">{assess.experimentMarks || 0}</td>
                          <td className="px-3 py-3 font-mono">{assess.labRecordMarks || 0}</td>
                          <td className="px-3 py-3 font-mono">{assess.implementationMarks || 0}</td>
                          <td className="px-3 py-3 font-mono">{assess.vivaMarks || 0}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                            {assess.totalMarks || 0} / 50
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const exp = prompt('Experiment Marks (0-20):', assess.experimentMarks || '18');
                                const lab = prompt('Lab Record Marks (0-10):', assess.labRecordMarks || '9');
                                const imp = prompt('Implementation Marks (0-10):', assess.implementationMarks || '9');
                                const viv = prompt('Viva Marks (0-10):', assess.vivaMarks || '8');
                                if (exp !== null && lab !== null && imp !== null && viv !== null) {
                                  handleSavePracticalMarks(item.enrollmentId, {
                                    experimentMarks: parseFloat(exp),
                                    labRecordMarks: parseFloat(lab),
                                    implementationMarks: parseFloat(imp),
                                    vivaMarks: parseFloat(viv),
                                  });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 font-semibold"
                            >
                              Enter Marks
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. THEORY MARKS */}
          {activeTab === 'theory' && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Theory Assessment Marksheet</h3>
                  <p className="text-xs text-neutral-400">Unit Test 1 (20) + Unit Test 2 (20) + Assignment (10) + Sem Exam (100)</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 text-xs font-bold">
                  {activeSubject?.name || 'Select Subject'}
                </span>
              </div>

              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-3 py-3">UT1 (20)</th>
                      <th className="px-3 py-3">UT2 (20)</th>
                      <th className="px-3 py-3">Assign (10)</th>
                      <th className="px-3 py-3">Sem Exam (100)</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {theoryRoster.map((item) => {
                      const assess = item.assessment || {};

                      return (
                        <tr key={item.enrollmentId} className="hover:bg-neutral-800/30">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">{item.rollNumber}</td>
                          <td className="px-4 py-3 font-bold text-white">{item.fullName}</td>
                          <td className="px-3 py-3 font-mono">{assess.unitTest1Marks ?? '—'}</td>
                          <td className="px-3 py-3 font-mono">{assess.unitTest2Marks ?? '—'}</td>
                          <td className="px-3 py-3 font-mono">{assess.assignmentMarks ?? '—'}</td>
                          <td className="px-3 py-3 font-mono">{assess.semesterExamMarks ?? '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                            {assess.semesterTotal ?? '0'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const ut1 = prompt('Unit Test 1 (0-20):', assess.unitTest1Marks || '18');
                                const ut2 = prompt('Unit Test 2 (0-20):', assess.unitTest2Marks || '17');
                                const ass = prompt('Assignment (0-10):', assess.assignmentMarks || '9');
                                const sem = prompt('Semester Exam (0-100):', assess.semesterExamMarks || '82');
                                if (ut1 !== null && ut2 !== null && ass !== null && sem !== null) {
                                  handleSaveTheoryMarks(item.enrollmentId, {
                                    unitTest1Marks: parseFloat(ut1),
                                    unitTest2Marks: parseFloat(ut2),
                                    assignmentMarks: parseFloat(ass),
                                    semesterExamMarks: parseFloat(sem),
                                  });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 font-semibold"
                            >
                              Enter Marks
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 11. VIVA MODULE */}
          {activeTab === 'viva' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Subject Viva Evaluation</h3>
                  <p className="text-xs text-neutral-400">Oral examination scoring and performance notes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateVivaModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Viva</span>
                </button>
              </div>

              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Marks Obtained</th>
                      <th className="px-4 py-3">Questions Asked</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {vivaRoster.map((item) => (
                      <tr key={item.enrollmentId} className="hover:bg-neutral-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">{item.rollNumber}</td>
                        <td className="px-4 py-3 font-bold text-white">{item.fullName}</td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {item.evaluation?.marksObtained !== undefined ? `${item.evaluation.marksObtained} / 20` : '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">{item.evaluation?.questionsAsked || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const marks = prompt('Viva Marks (0-20):', item.evaluation?.marksObtained || '18');
                              const q = prompt('Questions asked:', item.evaluation?.questionsAsked || 'OSI vs TCP/IP');
                              if (marks !== null && token && selectedVivaId) {
                                api.evaluateViva(token, selectedVivaId, {
                                  enrollmentId: item.enrollmentId,
                                  marksObtained: parseFloat(marks),
                                  questionsAsked: q || '',
                                }).then(() => loadSubjectMarks(token, selectedClassId, selectedSubjectId));
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 font-semibold"
                          >
                            Score Viva
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 12. PERFORMANCE & RISK ANALYTICS */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Class Academic Performance & Risk Monitor</h3>
                  <p className="text-xs text-neutral-400">Real-time attendance percentages and failure hazard warnings</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-red-950 text-red-300 border border-red-800 text-xs font-bold">
                  {classPerformance?.studentsAtRiskCount || 0} Students At Risk
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classPerformance?.studentsAtRisk?.map((s: any) => (
                  <div key={s.enrollmentId} className="p-4 rounded-2xl bg-red-950/20 border border-red-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{s.fullName}</span>
                      <span className="font-mono text-red-400 font-bold">Roll: {s.rollNumber}</span>
                    </div>
                    <div className="text-xs text-neutral-400 space-y-1">
                      <div>Attendance: <strong className="text-red-400">{s.attendancePercentage}%</strong> (Threshold: 75%)</div>
                      <div>Theory Accumulation: {s.totalTheory} Marks</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. REPORT CARDS */}
          {activeTab === 'report-cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Official Student Report Cards</h3>
                  <p className="text-xs text-neutral-400">Institutional grade cards with signature authorization</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateReportCards}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/30"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Generate All Report Cards</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportCards.map((rc) => (
                  <div
                    key={rc.id}
                    onClick={() => handleViewReportCard(rc.id)}
                    className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/50 cursor-pointer transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400">Roll: {rc.enrollment?.rollNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {rc.resultStatus}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white">{rc.enrollment?.student.fullName}</div>
                      <div className="text-xs text-neutral-400">{rc.semester} • {rc.academicYear}</div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                      <span>Percentage:</span>
                      <strong className="text-white text-sm font-mono">{rc.percentage}%</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14. INSTITUTIONAL CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900/60 p-5 rounded-2xl border border-neutral-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <h3 className="font-bold text-base text-white">Institutional Academic Calendar</h3>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Scheduled events, lectures, assessments, vivas, and holidays for {activeClass?.classCode || 'all classes'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* View selector */}
                  <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                    {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setCalendarView(view)}
                        className={`px-3 py-1 rounded-lg capitalize transition ${
                          calendarView === view
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateCalendarModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/30"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Schedule Event</span>
                  </button>
                </div>
              </div>

              {/* Event Cards Grid */}
              {calendarEvents.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-neutral-800 rounded-3xl space-y-3 bg-neutral-950/40">
                  <Calendar className="h-10 w-10 text-neutral-600 mx-auto" />
                  <div className="text-sm font-bold text-neutral-300">No Calendar Events Scheduled</div>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    There are currently no lectures, tests, or academic events scheduled for this class.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateCalendarModal(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                  >
                    + Schedule First Event
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {calendarEvents.map((ev) => {
                    const eventBadgeColor: Record<string, string> = {
                      TEST: 'bg-purple-950/60 border-purple-800 text-purple-300',
                      EXAM: 'bg-red-950/60 border-red-800 text-red-300',
                      LECTURE: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
                      PRACTICAL: 'bg-cyan-950/60 border-cyan-800 text-cyan-300',
                      VIVA: 'bg-amber-950/60 border-amber-800 text-amber-300',
                      ASSIGNMENT: 'bg-blue-950/60 border-blue-800 text-blue-300',
                      HOLIDAY: 'bg-green-950/60 border-green-800 text-green-300',
                      DEADLINE: 'bg-orange-950/60 border-orange-800 text-orange-300',
                      MEETING: 'bg-indigo-950/60 border-indigo-800 text-indigo-300',
                    };
                    const badgeClass =
                      eventBadgeColor[ev.eventType] || 'bg-neutral-900 border-neutral-800 text-neutral-300';

                    return (
                      <div
                        key={ev.id}
                        className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/40 transition space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                              {ev.eventType}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCalendarEvent(ev.id)}
                              className="text-neutral-500 hover:text-red-400 p-1 rounded transition"
                              title="Delete Event"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <h4 className="font-bold text-sm text-white">{ev.title}</h4>
                          {ev.description && (
                            <p className="text-xs text-neutral-400 line-clamp-2">{ev.description}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-neutral-800/80 space-y-1.5 text-xs text-neutral-400">
                          <div className="flex items-center gap-1.5 text-neutral-300">
                            <Clock className="h-3.5 w-3.5 text-emerald-400" />
                            <span>
                              {new Date(ev.startAt).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          {ev.subject && (
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-neutral-500" />
                              <span>{ev.subject.name}</span>
                            </div>
                          )}
                          {ev.location && (
                            <div className="text-[11px] text-neutral-500">📍 {ev.location}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL: REPORT CARD VIEWER & PRINT */}
      {/* ============================================================== */}
      {showReportCardModal && selectedReportCard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl w-full max-w-3xl p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Header / College Crest */}
            <div className="border-b-2 border-neutral-900 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">
                  {selectedReportCard.class?.organization?.name || 'INSTITUTION OF TECHNOLOGY'}
                </h2>
                <div className="text-xs font-semibold text-neutral-600">
                  {selectedReportCard.class?.department?.name} • {selectedReportCard.class?.program?.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold">OFFICIAL GRADE REPORT</div>
                <div className="text-xs text-neutral-600">Academic Year: {selectedReportCard.academicYear}</div>
              </div>
            </div>

            {/* Student Coordinates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-100 text-xs font-semibold">
              <div>
                <span className="text-neutral-500 block">STUDENT NAME</span>
                <span className="font-bold text-sm">{selectedReportCard.enrollment?.student.fullName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">ROLL NUMBER</span>
                <span className="font-mono text-sm">{selectedReportCard.enrollment?.rollNumber}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">SEMESTER</span>
                <span className="text-sm">{selectedReportCard.semester}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">RESULT STATUS</span>
                <span className="font-bold text-emerald-700 text-sm">{selectedReportCard.resultStatus}</span>
              </div>
            </div>

            {/* Marks Table */}
            <table className="w-full text-left text-xs border border-neutral-300">
              <thead className="bg-neutral-200 border-b border-neutral-300 font-bold">
                <tr>
                  <th className="p-2.5">Subject</th>
                  <th className="p-2.5">Theory</th>
                  <th className="p-2.5">Practical</th>
                  <th className="p-2.5">Total</th>
                  <th className="p-2.5">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {selectedReportCard.subjectBreakdownJson?.map((sub: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold">{sub.subjectName} ({sub.subjectCode})</td>
                    <td className="p-2.5 font-mono">{sub.theoryMarks}</td>
                    <td className="p-2.5 font-mono">{sub.practicalMarks}</td>
                    <td className="p-2.5 font-mono font-bold">{sub.totalMarks} / {sub.maxMarks}</td>
                    <td className="p-2.5 font-bold">{sub.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-between items-center p-4 rounded-xl bg-neutral-100 text-xs font-bold">
              <span>Attendance: {selectedReportCard.attendancePercentage}%</span>
              <span>Overall Score: {selectedReportCard.totalObtainedMarks} / {selectedReportCard.totalMaxMarks}</span>
              <span className="text-base text-emerald-700">{selectedReportCard.percentage}%</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs font-bold border-t border-neutral-300">
              <div>
                <div className="border-t border-neutral-400 pt-1">Class Teacher</div>
                <div className="text-[10px] text-neutral-500 font-normal">
                  {selectedReportCard.class?.classTeacherAssignment?.teacher.fullName || 'Authorized Faculty'}
                </div>
              </div>
              <div>
                <div className="border-t border-neutral-400 pt-1">Subject Teacher</div>
                <div className="text-[10px] text-neutral-500 font-normal">Department Chair</div>
              </div>
              <div>
                <div className="border-t border-neutral-400 pt-1">Principal / Dean</div>
                <div className="text-[10px] text-neutral-500 font-normal">Academic Registrar</div>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Print Report Card</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportCardModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE DEPARTMENT */}
      {/* ============================================================== */}
      {showCreateDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Create Academic Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Computer Engineering"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-300">Department Code</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  placeholder="e.g. COMP"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500 font-mono uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDeptModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE CLASS */}
      {/* ============================================================== */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Create Academic Class & Division</h3>
            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300">Department</label>
                <select
                  required
                  value={classForm.departmentId}
                  onChange={(e) => {
                    const dId = e.target.value;
                    const dept = structure?.departments.find((d) => d.id === dId);
                    const pId = dept?.programs?.[0]?.id || '';
                    setClassForm({ ...classForm, departmentId: dId, programId: pId });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="">Select Department</option>
                  {structure?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300">Academic Year</label>
                  <select
                    required
                    value={classForm.academicYearId}
                    onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="">Select Year</option>
                    {structure?.academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.yearName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300">Year Level</label>
                  <select
                    value={classForm.yearLevel}
                    onChange={(e) => setClassForm({ ...classForm, yearLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="First Year">First Year (FE)</option>
                    <option value="Second Year">Second Year (SE)</option>
                    <option value="Third Year">Third Year (TE)</option>
                    <option value="Final Year">Final Year (BE)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300">Semester</label>
                  <input
                    type="text"
                    required
                    value={classForm.semester}
                    onChange={(e) => setClassForm({ ...classForm, semester: e.target.value })}
                    placeholder="Semester V"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300">Division</label>
                  <input
                    type="text"
                    required
                    value={classForm.division}
                    onChange={(e) => setClassForm({ ...classForm, division: e.target.value })}
                    placeholder="A"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Generate Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ASSIGN CLASS TEACHER */}
      {/* ============================================================== */}
      {showAssignClassTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Assign Primary Class Teacher</h3>
            <p className="text-xs text-neutral-400">Select faculty member for {activeClass?.classCode}</p>
            <form onSubmit={handleAssignClassTeacher} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300">Teacher</label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="">Select Teacher</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignClassTeacherModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD SUBJECT */}
      {/* ============================================================== */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Add Curriculum Subject</h3>
                <p className="text-xs text-neutral-400">Add subject to {activeClass?.classCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Subject Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS504"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white uppercase font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Component Structure</label>
                <select
                  value={subjectForm.type}
                  onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value as SubjectComponentType })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="THEORY">Theory Only</option>
                  <option value="PRACTICAL">Practical Only</option>
                  <option value="VIVA">Viva Only</option>
                  <option value="COMPREHENSIVE">Comprehensive (Theory + Practical + Viva)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Theory Max Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={subjectForm.maxTheoryMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxTheoryMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Practical Max Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={subjectForm.maxPracticalMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxPracticalMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Viva Max Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={subjectForm.maxVivaMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxVivaMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ASSIGN SUBJECT TEACHER */}
      {/* ============================================================== */}
      {showAssignSubjectTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Assign Subject Teacher</h3>
                <p className="text-xs text-neutral-400">Link faculty to subject for {activeClass?.classCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignSubjectTeacherModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubjectTeacher} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Select Subject *</label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="">Choose a Subject</option>
                  {activeClass?.subjects?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Faculty Member *</label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="">Select Faculty</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department || 'Faculty'}) - {t.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Component Role</label>
                <select
                  value={assignComponentType}
                  onChange={(e) => setAssignComponentType(e.target.value as SubjectComponentType)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                >
                  <option value="THEORY">Theory Lecturer</option>
                  <option value="PRACTICAL">Practical / Lab In-Charge</option>
                  <option value="VIVA">Viva Examiner</option>
                  <option value="COMPREHENSIVE">Overall Course In-Charge (Comprehensive)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignSubjectTeacherModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE ASSESSMENT TEST */}
      {/* ============================================================== */}
      {showCreateTestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Create Academic Test</h3>
                <p className="text-xs text-neutral-400">
                  {activeClass?.classCode} • {activeSubject?.name || 'Selected Subject'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTestModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Test Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit Test 1: Network Layer Protocols"
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Test Type</label>
                  <select
                    value={testForm.academicTestType}
                    onChange={(e) => setTestForm({ ...testForm, academicTestType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="UNIT_TEST">Unit Test</option>
                    <option value="MID_TERM">Mid-Semester Exam</option>
                    <option value="END_SEM">End-Semester Exam</option>
                    <option value="SURPRISE_QUIZ">Surprise Quiz</option>
                    <option value="PRACTICAL_EXAM">Practical Exam</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    value={testForm.durationMins}
                    onChange={(e) => setTestForm({ ...testForm, durationMins: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={testForm.passMarks}
                    onChange={(e) => setTestForm({ ...testForm, passMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Marks / Question</label>
                  <input
                    type="number"
                    min={1}
                    value={testForm.defaultMarks}
                    onChange={(e) => setTestForm({ ...testForm, defaultMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Negative Marks</label>
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={testForm.defaultNegativeMarks}
                    onChange={(e) => setTestForm({ ...testForm, defaultNegativeMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Description / Syllabus Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Covers Module 1 & 2. Multiple choice and analytical questions."
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                />
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Create Test & Add Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CSV QUESTIONS IMPORT */}
      {/* ============================================================== */}
      {showCsvQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Import Questions via CSV</h3>
                <p className="text-xs text-neutral-400">Bulk upload multiple choice questions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCsvQuestionModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportQuestionCsv} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400 space-y-1">
                <div className="font-bold text-emerald-400">Header format:</div>
                <div>question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation</div>
              </div>

              <textarea
                rows={6}
                required
                placeholder="What is IPv6 address size?,MCQ,32 bits,64 bits,128 bits,256 bits,C,1,0,IPv6 uses 128-bit addresses"
                value={questionCsvText}
                onChange={(e) => setQuestionCsvText(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none"
              />

              {questionCsvFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                  {questionCsvFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCsvQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Upload Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE VIVA VOCE */}
      {/* ============================================================== */}
      {showCreateVivaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Schedule Viva Voce</h3>
                <p className="text-xs text-neutral-400">
                  {activeClass?.classCode} • {activeSubject?.name || 'Selected Subject'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateVivaModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateViva} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Viva Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End-Semester Lab Practical Oral Examination"
                  value={vivaForm.title}
                  onChange={(e) => setVivaForm({ ...vivaForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Topic / Focus Syllabus</label>
                <input
                  type="text"
                  placeholder="e.g. Socket Programming, Routing Algorithms"
                  value={vivaForm.topic}
                  onChange={(e) => setVivaForm({ ...vivaForm, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Viva Format</label>
                  <select
                    value={vivaForm.vivaType}
                    onChange={(e) => setVivaForm({ ...vivaForm, vivaType: e.target.value as VivaType })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="INDIVIDUAL">Individual Student Viva</option>
                    <option value="BATCH">Batch / Group Viva</option>
                    <option value="PRACTICAL_VIVA">Practical / Lab Oral Assessment</option>
                    <option value="PROJECT_VIVA">Capstone Project Defense</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={vivaForm.maxMarks}
                    onChange={(e) => setVivaForm({ ...vivaForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Duration per Student (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={vivaForm.durationMins}
                  onChange={(e) => setVivaForm({ ...vivaForm, durationMins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                />
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Schedule Viva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE CALENDAR EVENT */}
      {/* ============================================================== */}
      {showCreateCalendarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Schedule Calendar Event</h3>
              <button
                type="button"
                onClick={() => setShowCreateCalendarModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCalendarEvent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Networks Practical Lab"
                  value={calendarForm.title}
                  onChange={(e) => setCalendarForm({ ...calendarForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Event Type</label>
                  <select
                    value={calendarForm.eventType}
                    onChange={(e) => setCalendarForm({ ...calendarForm, eventType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="LECTURE">Lecture</option>
                    <option value="TEST">Unit Test</option>
                    <option value="EXAM">Semester Exam</option>
                    <option value="PRACTICAL">Practical Lab</option>
                    <option value="VIVA">Viva Voce</option>
                    <option value="ASSIGNMENT">Assignment Deadline</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="MEETING">Faculty Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Associated Subject</label>
                  <select
                    value={calendarForm.subjectId}
                    onChange={(e) => setCalendarForm({ ...calendarForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="">None / General</option>
                    {activeClass?.subjects?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={calendarForm.startAt}
                    onChange={(e) => setCalendarForm({ ...calendarForm, startAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={calendarForm.endAt}
                    onChange={(e) => setCalendarForm({ ...calendarForm, endAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Location / Room / Link</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 302 / Seminar Hall A"
                  value={calendarForm.location}
                  onChange={(e) => setCalendarForm({ ...calendarForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details or syllabus covered..."
                  value={calendarForm.description}
                  onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCalendarModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8-STEP CSV IMPORT WIZARD */}
      {/* ============================================================== */}
      <CsvImportWizard
        isOpen={showCsvWizard}
        onClose={() => setShowCsvWizard(false)}
        type={csvWizardType}
        title={csvWizardType === 'student' ? `Import Students for ${activeClass?.classCode || 'Class'}` : undefined}
        context={{ classId: selectedClassId, subjectId: selectedSubjectId }}
        onSuccess={() => {
          if (token && selectedClassId) loadClassSubData(token, selectedClassId);
        }}
      />

      {/* Academic Footer */}
      <footer className="border-t border-neutral-800/80 py-6 px-6 max-w-7xl mx-auto w-full text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3 mt-8">
        <div className="flex items-center gap-2">
          <PaperboatLogo size="sm" variant="icon" showSubtitle={false} />
          <span>&copy; {new Date().getFullYear()} Paperboat Education Systems Inc. Powered by ExamForge Engine.</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-400">
          <Link href="/college" className="hover:text-emerald-400 transition">College Portal</Link>
          <Link href="/teacher" className="hover:text-teal-400 transition">Teacher Hub</Link>
          <Link href="/student" className="hover:text-blue-400 transition">Student Portal</Link>
        </div>
      </footer>
    </div>
  );
}
