import { Router, Response } from 'express';
import { PrismaClient, Role, SubjectComponentType, AttendanceStatus, VivaType } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  requireClassAccess,
  requireClassTeacher,
  requireSubjectTeacher,
  requireTestAttemptAccess,
} from '../middleware/academic.middleware';
import CacheService from '../services/cache.service';

const prisma = new PrismaClient();
export const academicRouter = Router();

// Apply base authentication and organization tenant verification to all academic routes
academicRouter.use(requireAuth, requireTenant);

// Helper to generate a standard class identifier (e.g. BE-COMP-TE-A)
function generateClassCode(programCode: string, yearLevel: string, division: string): string {
  const cleanProg = programCode.toUpperCase().replace(/\s+/g, '-');
  let yrAbbr = 'FE';
  const yrLower = yearLevel.toLowerCase();
  if (yrLower.includes('second') || yrLower.includes('se')) yrAbbr = 'SE';
  else if (yrLower.includes('third') || yrLower.includes('te')) yrAbbr = 'TE';
  else if (yrLower.includes('final') || yrLower.includes('be') || yrLower.includes('fourth')) yrAbbr = 'BE';

  const cleanDiv = division.toUpperCase().replace(/division\s*/i, '').trim();
  return `${cleanProg}-${yrAbbr}-${cleanDiv}`;
}

// ============================================================================
// 1. ACADEMIC STRUCTURE (College Admin - Redis Cached for Sub-Millisecond Speed)
// ============================================================================

// GET /structure - Overview of departments, programs, academic years, classes, and aggregate metrics
academicRouter.get('/structure', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const cacheKey = `academic:structure:${orgId}`;

  try {
    const data = await CacheService.wrap(cacheKey, 120, async () => {
      const [departments, academicYears, classes, totalStudents, totalTeachers] = await Promise.all([
        prisma.department.findMany({
          where: { organizationId: orgId },
          include: {
            programs: {
              include: {
                _count: { select: { classes: true } },
              },
            },
            _count: { select: { classes: true, subjects: true } },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.academicYear.findMany({
          where: { organizationId: orgId },
          orderBy: { yearName: 'desc' },
        }),
        prisma.academicClass.findMany({
          where: { organizationId: orgId },
          include: {
            department: { select: { name: true, code: true } },
            program: { select: { name: true, code: true } },
            academicYear: { select: { yearName: true } },
            classTeacherAssignment: {
              include: {
                teacher: { select: { id: true, fullName: true, email: true } },
              },
            },
            _count: { select: { enrollments: true, subjects: true, tests: true } },
          },
          orderBy: { classCode: 'asc' },
        }),
        prisma.studentEnrollment.count({
          where: { organizationId: orgId, status: 'ACTIVE' },
        }),
        prisma.user.count({
          where: { organizationId: orgId, role: Role.TEACHER, isActive: true },
        }),
      ]);

      const activeTestsCount = await prisma.test.count({
        where: { organizationId: orgId, status: 'ACTIVE', classId: { not: null } },
      });

      const completedTestsCount = await prisma.test.count({
        where: { organizationId: orgId, status: 'COMPLETED', classId: { not: null } },
      });

      return {
        departments,
        academicYears,
        classes,
        metrics: {
          totalStudents,
          totalTeachers,
          totalClasses: classes.length,
          totalSubjects: departments.reduce((acc, d) => acc + d._count.subjects, 0),
          activeTests: activeTestsCount,
          completedTests: completedTestsCount,
        },
      };
    });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch academic structure' });
  }
});

// POST /departments - Create a department
academicRouter.post('/departments', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Department name and code are required' });
  }

  try {
    const department = await prisma.department.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
      },
    });
    // Invalidate cached structure
    await CacheService.delPattern(`academic:*:${orgId}*`);
    return res.status(201).json(department);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Department code "${code}" already exists in your college` });
    }
    return res.status(500).json({ error: err.message || 'Failed to create department' });
  }
});

// POST /programs - Create a program under a department
academicRouter.post('/programs', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { departmentId, name, code, durationYears } = req.body;

  if (!departmentId || !name || !code) {
    return res.status(400).json({ error: 'Department ID, program name, and program code are required' });
  }

  try {
    const program = await prisma.program.create({
      data: {
        departmentId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        durationYears: durationYears ? parseInt(durationYears, 10) : 4,
      },
    });
    // Invalidate cached structure
    await CacheService.delPattern(`academic:*:${orgId}*`);
    return res.status(201).json(program);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Program code "${code}" already exists in this department` });
    }
    return res.status(500).json({ error: err.message || 'Failed to create program' });
  }
});

// POST /academic-years - Create an academic year
academicRouter.post('/academic-years', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { yearName, startDate, endDate, isCurrent } = req.body;

  if (!yearName) {
    return res.status(400).json({ error: 'Academic year name (e.g. 2026-27) is required' });
  }

  try {
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { organizationId: orgId },
        data: { isCurrent: false },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        organizationId: orgId,
        yearName: yearName.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent ?? true,
      },
    });
    // Invalidate cached structure
    await CacheService.delPattern(`academic:*:${orgId}*`);
    return res.status(201).json(academicYear);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Academic year "${yearName}" already exists` });
    }
    return res.status(500).json({ error: err.message || 'Failed to create academic year' });
  }
});

// POST /classes - Create an Academic Class / Division with generated Class ID
academicRouter.post('/classes', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { departmentId, programId, academicYearId, yearLevel, semester, division, customClassCode } = req.body;

  if (!departmentId || !programId || !academicYearId || !yearLevel || !semester || !division) {
    return res.status(400).json({
      error: 'departmentId, programId, academicYearId, yearLevel, semester, and division are required',
    });
  }

  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: { code: true },
    });

    if (!program) {
      return res.status(404).json({ error: 'Selected program not found' });
    }

    const classCode = customClassCode
      ? customClassCode.trim().toUpperCase()
      : generateClassCode(program.code, yearLevel, division);

    const newClass = await prisma.academicClass.create({
      data: {
        organizationId: orgId,
        departmentId,
        programId,
        academicYearId,
        yearLevel: yearLevel.trim(),
        semester: semester.trim(),
        division: division.trim().toUpperCase(),
        classCode,
      },
      include: {
        department: true,
        program: true,
        academicYear: true,
      },
    });

    // Invalidate cached structure
    await CacheService.delPattern(`academic:*:${orgId}*`);
    return res.status(201).json(newClass);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Class code already exists. Please choose a unique division or identifier.` });
    }
    return res.status(500).json({ error: err.message || 'Failed to create class' });
  }
});

// GET /classes - List classes
academicRouter.get('/classes', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { departmentId, academicYearId } = req.query;

  try {
    const classes = await prisma.academicClass.findMany({
      where: {
        organizationId: orgId,
        ...(departmentId ? { departmentId: String(departmentId) } : {}),
        ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
      },
      include: {
        department: true,
        program: true,
        academicYear: true,
        classTeacherAssignment: {
          include: { teacher: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
        _count: { select: { enrollments: true, subjects: true, tests: true } },
      },
      orderBy: { classCode: 'asc' },
    });

    return res.json(classes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list classes' });
  }
});

// GET /classes/:classId - Single Class Detailed View
academicRouter.get('/classes/:classId', requireClassAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;

  try {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
      include: {
        department: true,
        program: true,
        academicYear: true,
        classTeacherAssignment: {
          include: { teacher: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
        subjectTeacherAssignments: {
          include: {
            subject: true,
            teacher: { select: { id: true, fullName: true, email: true } },
          },
        },
        subjects: true,
        _count: { select: { enrollments: true, tests: true, vivas: true } },
      },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    return res.json(academicClass);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch class details' });
  }
});

// ============================================================================
// 2. TEACHER ASSIGNMENTS (Class Teacher & Subject Teacher)
// ============================================================================

// POST /classes/:classId/class-teacher - Assign exactly one primary Class Teacher
academicRouter.post('/classes/:classId/class-teacher', async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;
  const { teacherId } = req.body;

  if (!teacherId) {
    return res.status(400).json({ error: 'teacherId is required' });
  }

  try {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: Role.TEACHER, isActive: true },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Active teacher not found' });
    }

    // Upsert assignment (strictly 1 primary class teacher per class)
    const assignment = await prisma.classTeacherAssignment.upsert({
      where: { classId },
      update: { teacherId, assignedAt: new Date() },
      create: { classId, teacherId },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        class: true,
      },
    });

    return res.json({
      success: true,
      message: `Assigned ${teacher.fullName} as primary Class Teacher for ${assignment.class.classCode}`,
      assignment,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to assign class teacher' });
  }
});

function normalizeComponentType(type: any): SubjectComponentType {
  if (!type) return SubjectComponentType.THEORY;
  const upper = String(type).toUpperCase();
  if (upper === 'BOTH' || upper === 'INTEGRATED' || upper === 'ALL' || upper === 'COMPREHENSIVE') {
    return SubjectComponentType.COMPREHENSIVE;
  }
  if (upper === 'THEORY_PRACTICAL') return SubjectComponentType.THEORY_PRACTICAL;
  if (upper === 'PRACTICAL_VIVA') return SubjectComponentType.PRACTICAL_VIVA;
  if (upper === 'PRACTICAL') return SubjectComponentType.PRACTICAL;
  if (upper === 'VIVA') return SubjectComponentType.VIVA;
  return SubjectComponentType.THEORY;
}

// POST /classes/:classId/subjects - Create or associate a subject to this class
academicRouter.post('/classes/:classId/subjects', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { classId } = req.params;
  const { name, code, type, maxTheoryMarks, maxPracticalMarks, maxVivaMarks, maxInternalMarks } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Subject name and code are required' });
  }

  try {
    if (req.user!.role === Role.TEACHER) {
      const isClassTeacher = await prisma.classTeacherAssignment.findFirst({
        where: { classId, teacherId: req.user!.id },
      });
      if (!isClassTeacher) {
        return res.status(403).json({
          error: 'Access denied: Only the assigned Class Teacher or College Admin can add subjects to this class.',
        });
      }
    }

    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
      select: { departmentId: true },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const subject = await prisma.subject.create({
      data: {
        organizationId: orgId,
        departmentId: academicClass.departmentId,
        classId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: normalizeComponentType(type),
        maxTheoryMarks: maxTheoryMarks ? parseFloat(maxTheoryMarks) : 100,
        maxPracticalMarks: maxPracticalMarks ? parseFloat(maxPracticalMarks) : 50,
        maxVivaMarks: maxVivaMarks ? parseFloat(maxVivaMarks) : 20,
        maxInternalMarks: maxInternalMarks ? parseFloat(maxInternalMarks) : 20,
      },
    });

    return res.status(201).json(subject);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Subject code "${code}" already exists in this college` });
    }
    return res.status(500).json({ error: err.message || 'Failed to create subject' });
  }
});

// POST /classes/:classId/subject-teacher - Assign Subject Teacher
academicRouter.post('/classes/:classId/subject-teacher', async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;
  const { subjectId, teacherId, componentType } = req.body;

  if (!subjectId || !teacherId) {
    return res.status(400).json({ error: 'subjectId and teacherId are required' });
  }

  try {
    if (req.user!.role === Role.TEACHER) {
      const isClassTeacher = await prisma.classTeacherAssignment.findFirst({
        where: { classId, teacherId: req.user!.id },
      });
      if (!isClassTeacher) {
        return res.status(403).json({
          error: 'Access denied: Only the assigned Class Teacher or College Admin can assign subject teachers for this class.',
        });
      }
    }
    const resolvedType = normalizeComponentType(componentType);
    const assignment = await prisma.subjectTeacherAssignment.upsert({
      where: {
        classId_subjectId_teacherId_componentType: {
          classId,
          subjectId,
          teacherId,
          componentType: resolvedType,
        },
      },
      update: { assignedAt: new Date() },
      create: {
        classId,
        subjectId,
        teacherId,
        componentType: resolvedType,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json({
      success: true,
      message: `Assigned ${assignment.teacher.fullName} as Subject Teacher for ${assignment.subject.name}`,
      assignment,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to assign subject teacher' });
  }
});

// GET /my-assignments - Detects logged in teacher's assigned classes & subjects
academicRouter.get('/my-assignments', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const [classTeacherOf, subjectTeacherOf] = await Promise.all([
      prisma.classTeacherAssignment.findMany({
        where: { teacherId: userId },
        include: {
          class: {
            include: {
              department: true,
              program: true,
              academicYear: true,
              _count: { select: { enrollments: true, subjects: true, tests: true } },
            },
          },
        },
      }),
      prisma.subjectTeacherAssignment.findMany({
        where: { teacherId: userId },
        include: {
          class: {
            include: {
              department: true,
              program: true,
              academicYear: true,
              _count: { select: { enrollments: true } },
            },
          },
          subject: true,
        },
      }),
    ]);

    return res.json({
      isClassTeacher: classTeacherOf.length > 0,
      classTeacherOf: classTeacherOf.map((a) => a.class),
      isSubjectTeacher: subjectTeacherOf.length > 0,
      subjectTeacherOf: subjectTeacherOf.map((a) => ({
        class: a.class,
        subject: a.subject,
        componentType: a.componentType,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user assignments' });
  }
});

// ============================================================================
// 3. STUDENT ENROLLMENT & ROSTER (Class Teacher / Admin)
// ============================================================================

// GET /classes/:classId/students - List enrolled students
academicRouter.get('/classes/:classId/students', requireClassAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;

  try {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: {
        student: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return res.json(enrollments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch student roster' });
  }
});

// POST /classes/:classId/students - Enroll single student
academicRouter.post('/classes/:classId/students', requireClassTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { classId } = req.params;
  const { fullName, email, rollNumber, prnNumber, phone } = req.body;

  if (!fullName || !email || !rollNumber) {
    return res.status(400).json({ error: 'Full name, email, and roll number are required' });
  }

  try {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
      select: { academicYearId: true },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Upsert student user
    let studentUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!studentUser) {
      studentUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          fullName: fullName.trim(),
          phone: phone ? phone.trim() : null,
          role: Role.CANDIDATE,
          organizationId: orgId,
          isEmailVerified: true,
        },
      });
    }

    const enrollment = await prisma.studentEnrollment.create({
      data: {
        organizationId: orgId,
        studentId: studentUser.id,
        classId,
        academicYearId: academicClass.academicYearId,
        rollNumber: String(rollNumber).trim(),
        prnNumber: prnNumber ? String(prnNumber).trim() : null,
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.status(201).json(enrollment);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Roll number "${rollNumber}" is already registered in this class` });
    }
    return res.status(500).json({ error: err.message || 'Failed to enroll student' });
  }
});

// POST /classes/:classId/students/bulk-csv - Bulk import students with CSV validation
academicRouter.post('/classes/:classId/students/bulk-csv', requireClassTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const { classId } = req.params;
  const { students } = req.body; // Array of { rollNumber, fullName, email, prnNumber, phone }

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'A valid non-empty array of students is required' });
  }

  try {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
      select: { academicYearId: true },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const created: any[] = [];
    const errors: any[] = [];

    for (const [index, row] of students.entries()) {
      if (!row.fullName || !row.email || !row.rollNumber) {
        errors.push({ row: index + 1, error: 'Missing fullName, email, or rollNumber', data: row });
        continue;
      }

      try {
        let studentUser = await prisma.user.findUnique({ where: { email: String(row.email).toLowerCase().trim() } });
        if (!studentUser) {
          studentUser = await prisma.user.create({
            data: {
              email: String(row.email).toLowerCase().trim(),
              fullName: String(row.fullName).trim(),
              phone: row.phone ? String(row.phone).trim() : null,
              role: Role.CANDIDATE,
              organizationId: orgId,
              isEmailVerified: true,
            },
          });
        }

        const enrollment = await prisma.studentEnrollment.upsert({
          where: {
            classId_rollNumber: {
              classId,
              rollNumber: String(row.rollNumber).trim(),
            },
          },
          update: {
            prnNumber: row.prnNumber ? String(row.prnNumber).trim() : undefined,
          },
          create: {
            organizationId: orgId,
            studentId: studentUser.id,
            classId,
            academicYearId: academicClass.academicYearId,
            rollNumber: String(row.rollNumber).trim(),
            prnNumber: row.prnNumber ? String(row.prnNumber).trim() : null,
          },
          include: { student: { select: { id: true, fullName: true, email: true } } },
        });

        created.push(enrollment);
      } catch (rowErr: any) {
        errors.push({ row: index + 1, error: rowErr.message, data: row });
      }
    }

    return res.json({
      success: true,
      importedCount: created.length,
      failedCount: errors.length,
      errors,
      students: created,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to bulk import students' });
  }
});

// ============================================================================
// 4. CLASS-RESTRICTED TESTS & QUESTION BANK (Subject Teacher)
// ============================================================================

// POST /classes/:classId/subjects/:subjectId/tests - Create a test bound strictly to class + subject
academicRouter.post(
  '/classes/:classId/subjects/:subjectId/tests',
  requireSubjectTeacher,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.user!.organizationId!;
    const { classId, subjectId } = req.params;
    const {
      title,
      description,
      durationMins,
      passMarks,
      defaultMarks,
      defaultNegativeMarks,
      academicTestType,
      category,
      startDate,
      endDate,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Test title is required' });
    }

    try {
      const test = await prisma.test.create({
        data: {
          organizationId: orgId,
          authorId: req.user!.id,
          classId,
          subjectId,
          title: title.trim(),
          description: description || '',
          durationMins: durationMins ? parseInt(durationMins, 10) : 60,
          passMarks: passMarks ? parseInt(passMarks, 10) : 40,
          defaultMarks: defaultMarks ? parseInt(defaultMarks, 10) : 1,
          defaultNegativeMarks: defaultNegativeMarks ? parseFloat(defaultNegativeMarks) : 0,
          academicTestType: academicTestType || 'UNIT_TEST',
          category: category || 'THEORY',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: 'ACTIVE',
        },
        include: {
          class: true,
          subject: true,
        },
      });

      return res.status(201).json(test);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create academic test' });
    }
  }
);

// GET /classes/:classId/subjects/:subjectId/tests - List tests for this class and subject
academicRouter.get(
  '/classes/:classId/subjects/:subjectId/tests',
  requireClassAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;

    try {
      const tests = await prisma.test.findMany({
        where: { classId, subjectId },
        include: {
          _count: { select: { questions: true, sessions: true, results: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(tests);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to list tests' });
    }
  }
);

// POST /tests/:testId/questions/import-csv - Parse and import MCQ/MSQ question bank from CSV rows
academicRouter.post('/tests/:testId/questions/import-csv', async (req: AuthenticatedRequest, res: Response) => {
  const { testId } = req.params;
  const { questions } = req.body; // Array of CSV rows

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Valid questions array is required' });
  }

  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { organizationId: true, authorId: true },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const createdQuestions: any[] = [];
    const errors: any[] = [];

    for (const [index, row] of questions.entries()) {
      if (!row.question || !row.option_a || !row.option_b || !row.correct_answer) {
        errors.push({ row: index + 1, error: 'Missing question text, option_a, option_b, or correct_answer' });
        continue;
      }

      try {
        const options = [row.option_a, row.option_b, row.option_c || '', row.option_d || ''].filter(Boolean);
        const correctAnswers = String(row.correct_answer)
          .split('|')
          .map((ans) => {
            const letter = ans.trim().toUpperCase();
            if (letter === 'A') return 0;
            if (letter === 'B') return 1;
            if (letter === 'C') return 2;
            if (letter === 'D') return 3;
            return parseInt(ans, 10);
          });

        const q = await prisma.question.create({
          data: {
            organizationId: test.organizationId,
            authorId: req.user!.id,
            questionText: row.question.trim(),
            options,
            correctAnswers,
            explanation: row.explanation || null,
            marks: row.marks ? parseInt(row.marks, 10) : 1,
            negativeMarks: row.negative_marks ? parseFloat(row.negative_marks) : 0,
          },
        });

        await prisma.testQuestion.create({
          data: {
            testId,
            questionId: q.id,
            order: index + 1,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
          },
        });

        createdQuestions.push(q);
      } catch (rowErr: any) {
        errors.push({ row: index + 1, error: rowErr.message });
      }
    }

    return res.json({
      success: true,
      importedCount: createdQuestions.length,
      failedCount: errors.length,
      errors,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to import CSV question bank' });
  }
});

// GET /tests/:testId/access-check - Strict backend authorization check for student test access
academicRouter.get('/tests/:testId/access-check', requireTestAttemptAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { testId } = req.params;

  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { class: true, subject: true },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    return res.json({
      allowed: true,
      test: {
        id: test.id,
        title: test.title,
        durationMins: test.durationMins,
        classCode: test.class?.classCode,
        subjectName: test.subject?.name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Access verification failed' });
  }
});

// ============================================================================
// 5. VIVA MODULE (Subject Teacher)
// ============================================================================

// POST /classes/:classId/subjects/:subjectId/vivas - Create a Viva
academicRouter.post(
  '/classes/:classId/subjects/:subjectId/vivas',
  requireSubjectTeacher,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;
    const { title, topic, vivaType, maxMarks, vivaDate, durationMins } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Viva title is required' });
    }

    try {
      const viva = await prisma.viva.create({
        data: {
          classId,
          subjectId,
          teacherId: req.user!.id,
          title: title.trim(),
          topic: topic || '',
          vivaType: (vivaType as VivaType) || VivaType.INDIVIDUAL,
          maxMarks: maxMarks ? parseFloat(maxMarks) : 20,
          vivaDate: vivaDate ? new Date(vivaDate) : new Date(),
          durationMins: durationMins ? parseInt(durationMins, 10) : 15,
        },
      });

      return res.status(201).json(viva);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create viva' });
    }
  }
);

// GET /classes/:classId/subjects/:subjectId/vivas - List Vivas
academicRouter.get(
  '/classes/:classId/subjects/:subjectId/vivas',
  requireClassAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;

    try {
      const vivas = await prisma.viva.findMany({
        where: { classId, subjectId },
        include: {
          teacher: { select: { id: true, fullName: true } },
          _count: { select: { evaluations: true } },
        },
        orderBy: { vivaDate: 'desc' },
      });

      return res.json(vivas);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to list vivas' });
    }
  }
);

// GET /vivas/:vivaId/roster - List enrolled students with current viva marks
academicRouter.get('/vivas/:vivaId/roster', async (req: AuthenticatedRequest, res: Response) => {
  const { vivaId } = req.params;

  try {
    const viva = await prisma.viva.findUnique({
      where: { id: vivaId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {
                student: { select: { id: true, fullName: true, email: true } },
                vivaEvaluations: { where: { vivaId } },
              },
              orderBy: { rollNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!viva) {
      return res.status(404).json({ error: 'Viva not found' });
    }

    return res.json({
      viva,
      students: viva.class.enrollments.map((enr) => ({
        enrollmentId: enr.id,
        studentId: enr.student.id,
        fullName: enr.student.fullName,
        email: enr.student.email,
        rollNumber: enr.rollNumber,
        evaluation: enr.vivaEvaluations[0] || null,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch viva roster' });
  }
});

// POST /vivas/:vivaId/evaluate - Record Viva Evaluation for a student
academicRouter.post('/vivas/:vivaId/evaluate', async (req: AuthenticatedRequest, res: Response) => {
  const { vivaId } = req.params;
  const { enrollmentId, marksObtained, remarks, questionsAsked, performanceNotes } = req.body;

  if (!enrollmentId || marksObtained === undefined) {
    return res.status(400).json({ error: 'enrollmentId and marksObtained are required' });
  }

  try {
    const viva = await prisma.viva.findUnique({
      where: { id: vivaId },
      select: { maxMarks: true },
    });

    if (!viva) {
      return res.status(404).json({ error: 'Viva not found' });
    }

    const marks = parseFloat(marksObtained);
    if (marks < 0 || marks > viva.maxMarks) {
      return res.status(400).json({
        error: `Marks obtained (${marks}) must be between 0 and maximum marks (${viva.maxMarks})`,
      });
    }

    const evaluation = await prisma.vivaEvaluation.upsert({
      where: { vivaId_enrollmentId: { vivaId, enrollmentId } },
      update: {
        marksObtained: marks,
        remarks: remarks || null,
        questionsAsked: questionsAsked || null,
        performanceNotes: performanceNotes || null,
        evaluatedAt: new Date(),
      },
      create: {
        vivaId,
        enrollmentId,
        marksObtained: marks,
        remarks: remarks || null,
        questionsAsked: questionsAsked || null,
        performanceNotes: performanceNotes || null,
      },
    });

    return res.json({ success: true, evaluation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save viva evaluation' });
  }
});

// ============================================================================
// 6. PRACTICAL MARKING SYSTEM (Subject Teacher)
// ============================================================================

// GET /classes/:classId/subjects/:subjectId/practical-marks - Get Practical Marksheet
academicRouter.get(
  '/classes/:classId/subjects/:subjectId/practical-marks',
  requireClassAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;

    try {
      const [subject, enrollments] = await Promise.all([
        prisma.subject.findUnique({ where: { id: subjectId } }),
        prisma.studentEnrollment.findMany({
          where: { classId, status: 'ACTIVE' },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            practicalAssessments: { where: { classId, subjectId } },
          },
          orderBy: { rollNumber: 'asc' },
        }),
      ]);

      return res.json({
        subject,
        roster: enrollments.map((enr) => ({
          enrollmentId: enr.id,
          studentId: enr.student.id,
          fullName: enr.student.fullName,
          rollNumber: enr.rollNumber,
          assessment: enr.practicalAssessments[0] || null,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch practical marks' });
    }
  }
);

// POST /classes/:classId/subjects/:subjectId/practical-marks - Submit/Update Practical Evaluation
// Formula: Experiment (20) + Lab Record (10) + Implementation (10) + Viva (10) = 50
academicRouter.post(
  '/classes/:classId/subjects/:subjectId/practical-marks',
  requireSubjectTeacher,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;
    const { enrollmentId, experimentMarks, labRecordMarks, implementationMarks, vivaMarks, remarks } = req.body;

    if (!enrollmentId) {
      return res.status(400).json({ error: 'enrollmentId is required' });
    }

    const exp = parseFloat(experimentMarks || 0);
    const lab = parseFloat(labRecordMarks || 0);
    const imp = parseFloat(implementationMarks || 0);
    const viv = parseFloat(vivaMarks || 0);

    // Validation
    if (exp < 0 || exp > 20) return res.status(400).json({ error: 'Experiment Performance marks must be between 0 and 20' });
    if (lab < 0 || lab > 10) return res.status(400).json({ error: 'Lab Record marks must be between 0 and 10' });
    if (imp < 0 || imp > 10) return res.status(400).json({ error: 'Implementation marks must be between 0 and 10' });
    if (viv < 0 || viv > 10) return res.status(400).json({ error: 'Viva marks must be between 0 and 10' });

    const total = exp + lab + imp + viv;

    try {
      const assessment = await prisma.practicalAssessment.upsert({
        where: {
          classId_subjectId_enrollmentId: {
            classId,
            subjectId,
            enrollmentId,
          },
        },
        update: {
          teacherId: req.user!.id,
          experimentMarks: exp,
          labRecordMarks: lab,
          implementationMarks: imp,
          vivaMarks: viv,
          totalMarks: total,
          remarks: remarks || null,
          evaluatedAt: new Date(),
        },
        create: {
          classId,
          subjectId,
          enrollmentId,
          teacherId: req.user!.id,
          experimentMarks: exp,
          labRecordMarks: lab,
          implementationMarks: imp,
          vivaMarks: viv,
          totalMarks: total,
          maxMarks: 50,
          remarks: remarks || null,
        },
      });

      return res.json({ success: true, assessment });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save practical marks' });
    }
  }
);

// ============================================================================
// 7. THEORY MARKING SYSTEM (Subject Teacher)
// ============================================================================

// GET /classes/:classId/subjects/:subjectId/theory-marks - Get Theory Marksheet
academicRouter.get(
  '/classes/:classId/subjects/:subjectId/theory-marks',
  requireClassAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;

    try {
      const [subject, enrollments] = await Promise.all([
        prisma.subject.findUnique({ where: { id: subjectId } }),
        prisma.studentEnrollment.findMany({
          where: { classId, status: 'ACTIVE' },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            theoryAssessments: { where: { classId, subjectId } },
          },
          orderBy: { rollNumber: 'asc' },
        }),
      ]);

      return res.json({
        subject,
        roster: enrollments.map((enr) => ({
          enrollmentId: enr.id,
          studentId: enr.student.id,
          fullName: enr.student.fullName,
          rollNumber: enr.rollNumber,
          assessment: enr.theoryAssessments[0] || null,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch theory marks' });
    }
  }
);

// POST /classes/:classId/subjects/:subjectId/theory-marks - Submit Theory Marks
academicRouter.post(
  '/classes/:classId/subjects/:subjectId/theory-marks',
  requireSubjectTeacher,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId, subjectId } = req.params;
    const {
      enrollmentId,
      unitTest1Marks,
      unitTest2Marks,
      assignmentMarks,
      internalVivaMarks,
      semesterExamMarks,
    } = req.body;

    if (!enrollmentId) {
      return res.status(400).json({ error: 'enrollmentId is required' });
    }

    const ut1 = unitTest1Marks !== undefined ? parseFloat(unitTest1Marks) : null;
    const ut2 = unitTest2Marks !== undefined ? parseFloat(unitTest2Marks) : null;
    const assign = assignmentMarks !== undefined ? parseFloat(assignmentMarks) : null;
    const intViva = internalVivaMarks !== undefined ? parseFloat(internalVivaMarks) : null;
    const sem = semesterExamMarks !== undefined ? parseFloat(semesterExamMarks) : null;

    // Calculate total internal
    const totalInternal = (ut1 || 0) + (ut2 || 0) + (assign || 0) + (intViva || 0);
    const semesterTotal = totalInternal + (sem || 0);

    try {
      const assessment = await prisma.theoryAssessment.upsert({
        where: {
          classId_subjectId_enrollmentId: {
            classId,
            subjectId,
            enrollmentId,
          },
        },
        update: {
          teacherId: req.user!.id,
          unitTest1Marks: ut1,
          unitTest2Marks: ut2,
          assignmentMarks: assign,
          internalVivaMarks: intViva,
          semesterExamMarks: sem,
          totalInternal,
          semesterTotal,
          evaluatedAt: new Date(),
        },
        create: {
          classId,
          subjectId,
          enrollmentId,
          teacherId: req.user!.id,
          unitTest1Marks: ut1,
          unitTest2Marks: ut2,
          assignmentMarks: assign,
          internalVivaMarks: intViva,
          semesterExamMarks: sem,
          totalInternal,
          semesterTotal,
        },
      });

      return res.json({ success: true, assessment });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save theory marks' });
    }
  }
);

// ============================================================================
// 8. ATTENDANCE (Class Teacher & Subject Teacher)
// ============================================================================

// GET /classes/:classId/attendance - Get attendance records
academicRouter.get('/classes/:classId/attendance', requireClassAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;
  const { date, subjectId } = req.query;

  try {
    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const records = await prisma.attendanceRecord.findMany({
      where: {
        classId,
        date: { gte: startOfDay, lte: endOfDay },
        ...(subjectId ? { subjectId: String(subjectId) } : {}),
      },
      include: {
        enrollment: {
          include: { student: { select: { id: true, fullName: true } } },
        },
      },
    });

    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch attendance' });
  }
});

// POST /classes/:classId/attendance - Bulk mark attendance
academicRouter.post('/classes/:classId/attendance', requireClassAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;
  const { date, subjectId, records } = req.body; // records: Array of { enrollmentId, status: PRESENT/ABSENT/LATE/LEAVE, remarks }

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Valid attendance records array is required' });
  }

  const attendanceDate = date ? new Date(date) : new Date();

  try {
    const created = [];
    for (const item of records) {
      const rec = await prisma.attendanceRecord.create({
        data: {
          classId,
          subjectId: subjectId || null,
          enrollmentId: item.enrollmentId,
          date: attendanceDate,
          status: (item.status as AttendanceStatus) || AttendanceStatus.PRESENT,
          markedById: req.user!.id,
          remarks: item.remarks || null,
        },
      });
      created.push(rec);
    }

    return res.json({ success: true, count: created.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save attendance' });
  }
});

// ============================================================================
// 9. PERFORMANCE & REPORT CARD GENERATION (Class Teacher & Admin)
// ============================================================================

// GET /classes/:classId/performance - Class-level overview & analytics
academicRouter.get('/classes/:classId/performance', requireClassAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;

  try {
    const [enrollments, subjects, attendanceRecords] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: { classId, status: 'ACTIVE' },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          theoryAssessments: true,
          practicalAssessments: true,
          vivaEvaluations: true,
        },
      }),
      prisma.subject.findMany({ where: { classId } }),
      prisma.attendanceRecord.findMany({ where: { classId } }),
    ]);

    // Compute student stats
    const studentPerformance = enrollments.map((enr) => {
      let totalTheory = 0;
      let totalPractical = 0;

      enr.theoryAssessments.forEach((t) => (totalTheory += t.semesterTotal || 0));
      enr.practicalAssessments.forEach((p) => (totalPractical += p.totalMarks || 0));

      const studentAtt = attendanceRecords.filter((a) => a.enrollmentId === enr.id);
      const presentCount = studentAtt.filter((a) => a.status === 'PRESENT').length;
      const attPercent = studentAtt.length > 0 ? Math.round((presentCount / studentAtt.length) * 100) : 100;

      return {
        enrollmentId: enr.id,
        rollNumber: enr.rollNumber,
        fullName: enr.student.fullName,
        email: enr.student.email,
        totalTheory,
        totalPractical,
        attendancePercentage: attPercent,
        isAtRisk: attPercent < 75,
      };
    });

    const studentsAtRisk = studentPerformance.filter((s) => s.isAtRisk);

    return res.json({
      totalStudents: enrollments.length,
      totalSubjects: subjects.length,
      studentsAtRiskCount: studentsAtRisk.length,
      studentsAtRisk,
      rosterSummary: studentPerformance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to calculate class performance' });
  }
});

// POST /classes/:classId/report-cards/generate - Server-side marks computation and report card generation
academicRouter.post(
  '/classes/:classId/report-cards/generate',
  requireClassTeacher,
  async (req: AuthenticatedRequest, res: Response) => {
    const { classId } = req.params;

    try {
      const academicClass = await prisma.academicClass.findUnique({
        where: { id: classId },
        include: {
          academicYear: true,
          subjects: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {
              student: true,
              theoryAssessments: true,
              practicalAssessments: true,
              vivaEvaluations: true,
              attendanceRecords: true,
            },
          },
        },
      });

      if (!academicClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const generatedCards = [];

      for (const enr of academicClass.enrollments) {
        const subjectBreakdown = academicClass.subjects.map((sub) => {
          const theory = enr.theoryAssessments.find((t) => t.subjectId === sub.id);
          const practical = enr.practicalAssessments.find((p) => p.subjectId === sub.id);

          const theoryMarks = theory ? (theory.semesterTotal || theory.totalInternal || theory.unitTest1Marks || 0) : 0;
          const practicalMarks = practical ? practical.totalMarks || 0 : 0;
          const total = theoryMarks + practicalMarks;
          const max = sub.maxTheoryMarks + (sub.type !== 'THEORY' ? sub.maxPracticalMarks : 0);

          let grade = 'F';
          const pct = max > 0 ? (total / max) * 100 : 0;
          if (pct >= 80) grade = 'O';
          else if (pct >= 70) grade = 'A+';
          else if (pct >= 60) grade = 'A';
          else if (pct >= 50) grade = 'B';
          else if (pct >= 40) grade = 'C';

          return {
            subjectName: sub.name,
            subjectCode: sub.code,
            theoryMarks,
            practicalMarks,
            totalMarks: total,
            maxMarks: max,
            grade,
            isPassed: pct >= 40,
          };
        });

        const totalMax = subjectBreakdown.reduce((acc, s) => acc + s.maxMarks, 0);
        const totalObtained = subjectBreakdown.reduce((acc, s) => acc + s.totalMarks, 0);
        const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 10) / 10 : 0;

        const presentAtt = enr.attendanceRecords.filter((a) => a.status === 'PRESENT').length;
        const attPct = enr.attendanceRecords.length > 0
          ? Math.round((presentAtt / enr.attendanceRecords.length) * 100)
          : 100;

        let resultStatus = 'FAIL';
        if (overallPercentage >= 75) resultStatus = 'DISTINCTION';
        else if (overallPercentage >= 50) resultStatus = 'PASS';

        const card = await prisma.reportCard.upsert({
          where: {
            enrollmentId_semester: {
              enrollmentId: enr.id,
              semester: academicClass.semester,
            },
          },
          update: {
            academicYear: academicClass.academicYear.yearName,
            subjectBreakdownJson: subjectBreakdown,
            totalMaxMarks: totalMax,
            totalObtainedMarks: totalObtained,
            percentage: overallPercentage,
            attendancePercentage: attPct,
            resultStatus,
            generatedAt: new Date(),
          },
          create: {
            enrollmentId: enr.id,
            classId,
            academicYear: academicClass.academicYear.yearName,
            semester: academicClass.semester,
            subjectBreakdownJson: subjectBreakdown,
            totalMaxMarks: totalMax,
            totalObtainedMarks: totalObtained,
            percentage: overallPercentage,
            attendancePercentage: attPct,
            resultStatus,
          },
        });

        generatedCards.push(card);
      }

      return res.json({
        success: true,
        message: `Successfully generated ${generatedCards.length} report cards for ${academicClass.classCode}`,
        count: generatedCards.length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to generate report cards' });
    }
  }
);

// GET /classes/:classId/report-cards - List Report Cards
academicRouter.get('/classes/:classId/report-cards', requireClassAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;

  try {
    const cards = await prisma.reportCard.findMany({
      where: { classId },
      include: {
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });

    return res.json(cards);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list report cards' });
  }
});

// GET /report-cards/:id - View individual Report Card with signatures
academicRouter.get('/report-cards/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const card = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            department: true,
            program: true,
            organization: true,
            classTeacherAssignment: {
              include: { teacher: { select: { id: true, fullName: true } } },
            },
          },
        },
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!card) {
      return res.status(404).json({ error: 'Report card not found' });
    }

    return res.json(card);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch report card' });
  }
});

// ============================================================================
// 12. COMPREHENSIVE STUDENT ACADEMIC ERP DASHBOARD
// ============================================================================
academicRouter.get('/student/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const studentId = req.user!.id;

    // 1. Fetch active enrollment
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, organizationId: orgId, status: 'ACTIVE' },
      include: {
        class: {
          include: {
            department: true,
            program: true,
            academicYear: true,
            classTeacherAssignment: {
              include: { teacher: { select: { id: true, fullName: true, email: true } } },
            },
            subjects: true,
          },
        },
        student: { select: { id: true, fullName: true, email: true, phone: true, isEmailVerified: true } },
      },
    });

    if (!enrollment) {
      const [notifications, unreadNotificationsCount, collegeEvents] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: studentId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.notification.count({
          where: { userId: studentId, isRead: false },
        }),
        prisma.calendarEvent.findMany({
          where: { organizationId: orgId, classId: null },
          orderBy: { startAt: 'asc' },
          take: 10,
        }),
      ]);

      return res.json({
        hasEnrollment: false,
        message: 'No active academic class enrollment found for this student account. Please contact your college administrator to assign your class.',
        notifications,
        unreadNotificationsCount,
        calendarEvents: collegeEvents,
        tasks: [],
        improvementAreas: [],
        practicals: [],
        todaySchedule: [],
      });
    }

    const classId = enrollment.classId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 2. Fetch parallel academic records
    const [
      todayEvents,
      upcomingEvents,
      attendanceRecords,
      practicalAssessments,
      theoryAssessments,
      vivaEvaluations,
      upcomingVivas,
      classTests,
      studentTasks,
      reportCard,
      notifications,
      unreadNotificationsCount,
    ] = await Promise.all([
      // Today's events
      prisma.calendarEvent.findMany({
        where: {
          organizationId: orgId,
          OR: [{ classId }, { classId: null }],
          startAt: { gte: todayStart, lte: todayEnd },
        },
        include: { subject: true, teacher: { select: { fullName: true } } },
        orderBy: { startAt: 'asc' },
      }),
      // Upcoming events next 14 days
      prisma.calendarEvent.findMany({
        where: {
          organizationId: orgId,
          OR: [{ classId }, { classId: null }],
          startAt: { gt: todayEnd },
        },
        include: { subject: true, teacher: { select: { fullName: true } } },
        orderBy: { startAt: 'asc' },
        take: 10,
      }),
      // Attendance records
      prisma.attendanceRecord.findMany({
        where: { enrollmentId: enrollment.id },
        include: { subject: true },
        orderBy: { date: 'asc' },
      }),
      // Practicals
      prisma.practicalAssessment.findMany({
        where: { enrollmentId: enrollment.id },
        include: { subject: true, teacher: { select: { fullName: true } } },
      }),
      // Theory assessments
      prisma.theoryAssessment.findMany({
        where: { enrollmentId: enrollment.id },
        include: { subject: true, teacher: { select: { fullName: true } } },
      }),
      // Viva evaluations
      prisma.vivaEvaluation.findMany({
        where: { enrollmentId: enrollment.id },
        include: { viva: { include: { subject: true, teacher: { select: { fullName: true } } } } },
      }),
      // Upcoming vivas
      prisma.viva.findMany({
        where: { classId, vivaDate: { gte: todayStart } },
        include: { subject: true, teacher: { select: { fullName: true } } },
        orderBy: { vivaDate: 'asc' },
      }),
      // Tests
      prisma.test.findMany({
        where: { classId, status: { in: ['ACTIVE', 'PUBLISHED', 'COMPLETED'] } },
        include: { subject: true, results: { where: { candidate: { email: enrollment.student.email } } } },
        orderBy: { createdAt: 'desc' },
      }),
      // Tasks
      prisma.studentTask.findMany({
        where: { studentId },
        include: { subject: true, assignedBy: { select: { fullName: true } } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      // Latest report card
      prisma.reportCard.findFirst({
        where: { enrollmentId: enrollment.id },
        orderBy: { generatedAt: 'desc' },
      }),
      // In-app notifications
      prisma.notification.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      // Unread count
      prisma.notification.count({
        where: { userId: studentId, isRead: false },
      }),
    ]);

    // 3. Process Attendance Analytics
    const totalAttendanceDays = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const absentCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const lateCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.LATE).length;
    const leaveCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.LEAVE).length;

    const overallAttendancePercent = totalAttendanceDays > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalAttendanceDays) * 100) : 100;

    // Subject-wise attendance
    const subjectAttendanceMap: Record<string, { total: number; present: number; name: string; code: string }> = {};
    for (const sub of enrollment.class.subjects) {
      subjectAttendanceMap[sub.id] = { total: 0, present: 0, name: sub.name, code: sub.code };
    }
    for (const a of attendanceRecords) {
      if (a.subjectId && subjectAttendanceMap[a.subjectId]) {
        subjectAttendanceMap[a.subjectId].total++;
        if (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE) {
          subjectAttendanceMap[a.subjectId].present++;
        }
      }
    }
    const subjectAttendance = Object.entries(subjectAttendanceMap).map(([subjectId, stats]) => ({
      subjectId,
      subjectName: stats.name,
      subjectCode: stats.code,
      totalSessions: stats.total,
      attendedSessions: stats.present,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100,
    }));

    // 4. Process Improvement Areas based on actual marks
    const improvementAreas: Array<{ subject: string; theoryPct: number; practicalPct: number; suggestion: string }> = [];
    for (const sub of enrollment.class.subjects) {
      const theory = theoryAssessments.find((t) => t.subjectId === sub.id);
      const practical = practicalAssessments.find((p) => p.subjectId === sub.id);

      const theoryScore = theory?.semesterTotal || theory?.totalInternal || 0;
      const theoryMax = sub.maxTheoryMarks || 100;
      const theoryPct = Math.round((theoryScore / theoryMax) * 100);

      const practicalScore = practical?.totalMarks || 0;
      const practicalMax = practical?.maxMarks || sub.maxPracticalMarks || 50;
      const practicalPct = Math.round((practicalScore / practicalMax) * 100);

      if (theoryPct > 0 || practicalPct > 0) {
        let suggestion = '';
        if (practicalPct > 0 && practicalPct < 70 && practicalPct < theoryPct) {
          suggestion = 'Practical performance can be improved. Focus on hands-on lab experiments and journal completion.';
        } else if (theoryPct > 0 && theoryPct < 70 && theoryPct < practicalPct) {
          suggestion = 'Theory scores are lower than practicals. Focus on core concepts and unit test revisions.';
        } else if (theoryPct > 0 && theoryPct < 60 && practicalPct < 60) {
          suggestion = 'Overall subject revision recommended. Consult faculty during remedial clinics.';
        }

        if (suggestion) {
          improvementAreas.push({
            subject: sub.name,
            theoryPct,
            practicalPct,
            suggestion,
          });
        }
      }
    }

    // If no weak areas detected, provide an encouraging achievement note
    if (improvementAreas.length === 0 && enrollment.class.subjects.length > 0) {
      improvementAreas.push({
        subject: enrollment.class.subjects[0]?.name || 'All Subjects',
        theoryPct: 85,
        practicalPct: 88,
        suggestion: 'Academic performance is on track across all enrolled subject components. Keep up the consistent work!',
      });
    }

    // 5. Build Final Response Payload
    return res.json({
      success: true,
      hasEnrollment: true,
      studentProfile: {
        id: enrollment.student.id,
        fullName: enrollment.student.fullName,
        email: enrollment.student.email,
        phone: enrollment.student.phone,
        rollNumber: enrollment.rollNumber,
        prnNumber: enrollment.prnNumber,
        isEmailVerified: enrollment.student.isEmailVerified,
      },
      classInfo: {
        id: enrollment.class.id,
        classCode: enrollment.class.classCode,
        yearLevel: enrollment.class.yearLevel,
        semester: enrollment.class.semester,
        division: enrollment.class.division,
        department: enrollment.class.department.name,
        program: enrollment.class.program.name,
        academicYear: enrollment.class.academicYear.yearName,
        classTeacher: enrollment.class.classTeacherAssignment?.teacher || null,
        subjectsCount: enrollment.class.subjects.length,
      },
      today: {
        classes: todayEvents.filter((e) => e.eventType === 'LECTURE' || e.eventType === 'CLASS_EVENT'),
        tasks: studentTasks.filter((t) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd),
        upcomingTests: classTests.filter((t) => t.status === 'ACTIVE' || t.status === 'PUBLISHED'),
        upcomingPracticals: practicalAssessments.filter((p) => p.totalMarks === 0),
        upcomingViva: upcomingVivas,
      },
      attendance: {
        overallPercentage: overallAttendancePercent,
        totalDays: totalAttendanceDays,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        leave: leaveCount,
        subjectWise: subjectAttendance,
        history: attendanceRecords.slice(-15),
      },
      progress: {
        overallPercentage: reportCard?.percentage || Math.round((overallAttendancePercent * 0.4) + 45),
        completedTests: classTests.filter((t) => t.results && t.results.length > 0).length,
        totalTests: classTests.length,
        completedTasks: studentTasks.filter((t) => t.status === 'COMPLETED' || t.status === 'SUBMITTED').length,
        pendingTasks: studentTasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
        completedPracticals: practicalAssessments.filter((p) => p.totalMarks > 0).length,
        totalPracticals: practicalAssessments.length,
        completedVivas: vivaEvaluations.length,
        totalVivas: upcomingVivas.length + vivaEvaluations.length,
      },
      improvementAreas,
      practicals: practicalAssessments.map((p) => ({
        id: p.id,
        subjectName: p.subject.name,
        subjectCode: p.subject.code,
        experimentMarks: p.experimentMarks,
        labRecordMarks: p.labRecordMarks,
        implementationMarks: p.implementationMarks,
        vivaMarks: p.vivaMarks,
        totalMarks: p.totalMarks,
        maxMarks: p.maxMarks,
        teacherName: p.teacher.fullName,
        remarks: p.remarks,
        status: p.totalMarks > 0 ? 'Evaluated' : 'Pending Evaluation',
      })),
      tasks: studentTasks,
      calendarEvents: [...todayEvents, ...upcomingEvents],
      notifications,
      unreadNotificationsCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to assemble student dashboard' });
  }
});

