import { Router, Response } from 'express';
import { PrismaClient, TaskCategory, TaskStatus, Role } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth, requireTenant);

// 1. GET /my-tasks - Retrieve tasks for the authenticated student
router.get('/my-tasks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { status, category } = req.query;

    const where: any = { studentId };

    if (status && status !== 'ALL') {
      where.status = status as TaskStatus;
    }

    if (category && category !== 'ALL') {
      where.category = category as TaskCategory;
    }

    const tasks = await prisma.studentTask.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, classCode: true } },
        assignedBy: { select: { id: true, fullName: true, designation: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json({ success: true, tasks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch student tasks' });
  }
});

// 2. GET /class/:classId - Retrieve all tasks for a class (Teacher / Admin)
router.get('/class/:classId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const { classId } = req.params;

    const tasks = await prisma.studentTask.findMany({
      where: { organizationId: orgId, classId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        subject: { select: { id: true, name: true, code: true } },
        assignedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, tasks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch class tasks' });
  }
});

// 3. POST / - Create task for a student or batch for all students in class
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const teacherId = req.user!.id;

    const {
      classId,
      subjectId,
      studentId, // Optional: if omitted, assigns to all active students in the class
      title,
      description,
      category = 'ASSIGNMENT',
      dueDate,
      maxMarks,
    } = req.body;

    if (!classId || !title) {
      return res.status(400).json({ error: 'classId and title are required' });
    }

    let createdCount = 0;

    if (studentId) {
      // Single student assignment
      await prisma.studentTask.create({
        data: {
          organizationId: orgId,
          classId,
          subjectId: subjectId || null,
          studentId,
          title: title.trim(),
          description: description?.trim() || null,
          category: category as TaskCategory,
          status: TaskStatus.PENDING,
          dueDate: dueDate ? new Date(dueDate) : null,
          maxMarks: maxMarks ? Number(maxMarks) : null,
          assignedById: teacherId,
        },
      });
      createdCount = 1;
    } else {
      // Batch assignment to all active students enrolled in class
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { classId, organizationId: orgId, status: 'ACTIVE' },
        select: { studentId: true },
      });

      if (enrollments.length === 0) {
        return res.status(400).json({ error: 'No active students enrolled in this class' });
      }

      await prisma.$transaction(
        enrollments.map((e) =>
          prisma.studentTask.create({
            data: {
              organizationId: orgId,
              classId,
              subjectId: subjectId || null,
              studentId: e.studentId,
              title: title.trim(),
              description: description?.trim() || null,
              category: category as TaskCategory,
              status: TaskStatus.PENDING,
              dueDate: dueDate ? new Date(dueDate) : null,
              maxMarks: maxMarks ? Number(maxMarks) : null,
              assignedById: teacherId,
            },
          })
        )
      );
      createdCount = enrollments.length;
    }

    await AuditService.log({
      userId: teacherId,
      organizationId: orgId,
      action: 'TASKS_CREATED',
      resourceType: 'StudentTask',
      metadata: { classId, createdCount, title },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Successfully assigned task to ${createdCount} student(s).`,
      count: createdCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

// 4. PUT /:id - Update task status, submit work, or record marks and feedback
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const task = await prisma.studentTask.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { status, obtainedMarks, feedback, description } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status as TaskStatus;
    if (obtainedMarks !== undefined) {
      const marksNum = Number(obtainedMarks);
      if (task.maxMarks && marksNum > task.maxMarks) {
        return res.status(400).json({ error: `Obtained marks cannot exceed maximum marks (${task.maxMarks})` });
      }
      updateData.obtainedMarks = marksNum;
    }
    if (feedback !== undefined) updateData.feedback = feedback?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;

    const updated = await prisma.studentTask.update({
      where: { id },
      data: updateData,
    });

    return res.json({ success: true, task: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

export default router;
