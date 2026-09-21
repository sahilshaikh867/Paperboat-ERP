import { Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';

const prisma = new PrismaClient();

/**
 * Middleware: Verifies that the authenticated user has access to the specified academic class.
 * Access is granted if:
 * 1. Super Admin or Organization Admin of the class's college.
 * 2. Designated primary Class Teacher for this class.
 * 3. Assigned Subject Teacher for any subject in this class.
 * 4. Enrolled Student in this class.
 */
export async function requireClassAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const classId = req.params.classId || req.body.classId || (req.query.classId as string);
  if (!classId) {
    return res.status(400).json({ error: 'Class ID is required' });
  }

  try {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
      include: {
        classTeacherAssignment: true,
        subjectTeacherAssignments: { where: { teacherId: req.user.id } },
        enrollments: { where: { studentId: req.user.id } },
      },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Super Admin or College Admin of this institution
    if (
      req.user.role === Role.SUPER_ADMIN ||
      (req.user.role === Role.ORG_ADMIN && req.user.organizationId === academicClass.organizationId)
    ) {
      return next();
    }

    // Designated primary Class Teacher
    if (academicClass.classTeacherAssignment?.teacherId === req.user.id) {
      return next();
    }

    // Assigned Subject Teacher
    if (academicClass.subjectTeacherAssignments.length > 0) {
      return next();
    }

    // Enrolled Student
    if (academicClass.enrollments.length > 0) {
      return next();
    }

    return res.status(403).json({
      error: 'Access denied: You do not have authorization for this class or division.',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify class access permissions' });
  }
}

/**
 * Middleware: Verifies that the authenticated user is the Class Teacher or College Admin of the class.
 * Used for managing class-level settings, general attendance, and generating class report cards.
 */
export async function requireClassTeacher(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const classId = req.params.classId || req.body.classId || (req.query.classId as string);
  if (!classId) {
    return res.status(400).json({ error: 'Class ID is required' });
  }

  try {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
      include: { classTeacherAssignment: true },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (
      req.user.role === Role.SUPER_ADMIN ||
      (req.user.role === Role.ORG_ADMIN && req.user.organizationId === academicClass.organizationId)
    ) {
      return next();
    }

    if (academicClass.classTeacherAssignment?.teacherId === req.user.id) {
      return next();
    }

    return res.status(403).json({
      error: 'Access denied: Only the designated Class Teacher or College Admin can perform this action.',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify class teacher authorization' });
  }
}

/**
 * Middleware: Verifies that the authenticated user is the assigned Subject Teacher for this specific subject + class.
 */
export async function requireSubjectTeacher(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const classId = req.params.classId || req.body.classId || (req.query.classId as string);
  const subjectId = req.params.subjectId || req.body.subjectId || (req.query.subjectId as string);

  if (!classId || !subjectId) {
    return res.status(400).json({ error: 'Class ID and Subject ID are required' });
  }

  try {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: classId },
    });

    if (!academicClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // College Admin has full supervisory access
    if (
      req.user.role === Role.SUPER_ADMIN ||
      (req.user.role === Role.ORG_ADMIN && req.user.organizationId === academicClass.organizationId)
    ) {
      return next();
    }

    // Check specific subject teacher assignment
    const assignment = await prisma.subjectTeacherAssignment.findFirst({
      where: {
        classId,
        subjectId,
        teacherId: req.user.id,
      },
    });

    if (assignment) {
      return next();
    }

    return res.status(403).json({
      error: 'Access denied: You are not the assigned Subject Teacher for this class and subject.',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify subject teacher authorization' });
  }
}

/**
 * Middleware: Verifies test eligibility for candidates/students.
 * Enforces: "A test created for a class/division can only be attempted by students enrolled in that class/division."
 */
export async function requireTestAttemptAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const testId = req.params.testId || req.params.id || req.body.testId;
  if (!testId) {
    return next();
  }

  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { classId: true, organizationId: true },
    });

    if (!test || !test.classId) {
      // General or company recruitment test, standard access rules apply
      return next();
    }

    // If College Admin or Teacher, allow review
    if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ORG_ADMIN || req.user.role === Role.TEACHER) {
      return next();
    }

    // If candidate/student, verify active enrollment in the test's exact class
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: req.user.id,
        classId: test.classId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        error: 'Class-Restricted Test: You are not enrolled in the class/division assigned to this assessment.',
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify assessment access permissions' });
  }
}
