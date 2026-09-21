import { Router, Response } from 'express';
import { PrismaClient, TestStatus, QuestionType, Role } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// 1. List Tests for the tenant organization or all tests for SUPER_ADMIN
router.get('/', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;
    const statusFilter = req.query.status as TestStatus | undefined;

    const where: any = {};
    if (orgId) {
      where.organizationId = orgId;
    } else if (!isSuperAdmin) {
      return res.status(403).json({ error: 'User is not assigned to an active organization' });
    }

    if (statusFilter && Object.values(TestStatus).includes(statusFilter)) {
      where.status = statusFilter;
    }

    const tests = await prisma.test.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, type: true },
        },
        author: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        _count: {
          select: {
            questions: true,
            invitations: true,
            sessions: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(tests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Create Test (Initial status: DRAFT)
router.post('/', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    let orgId = (req.body.organizationId as string) || (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;
    const authorId = req.user!.id;

    if (isSuperAdmin && !orgId) {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) orgId = firstOrg.id;
    }

    if (!orgId) {
      return res.status(400).json({ error: 'An organization is required to create a test' });
    }

    const {
      title,
      description,
      durationMins,
      startDate,
      endDate,
      accessCode,
      defaultMarks,
      defaultNegativeMarks,
      passMarks,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assessment title is required' });
    }

    const test = await prisma.test.create({
      data: {
        organizationId: orgId,
        authorId,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        durationMins: durationMins ? Number(durationMins) : 60,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        accessCode: accessCode ? String(accessCode).trim().toUpperCase() : null,
        defaultMarks: defaultMarks !== undefined ? Number(defaultMarks) : 1,
        defaultNegativeMarks: defaultNegativeMarks !== undefined ? Number(defaultNegativeMarks) : 0,
        passMarks: passMarks !== undefined ? Number(passMarks) : null,
        status: TestStatus.DRAFT,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Test "${test.title}" created in DRAFT mode.`,
      test,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Get Test Details with Questions
router.get('/:id', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;

    const where: any = { id: req.params.id };
    if (!isSuperAdmin && orgId) {
      where.organizationId = orgId;
    }

    const test = await prisma.test.findFirst({
      where,
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { invitations: true, sessions: true, results: true },
        },
      },
    });

    if (!test) return res.status(404).json({ error: 'Test not found' });
    return res.json(test);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Update Test Configuration
router.put('/:id', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;

    const where: any = { id: req.params.id };
    if (!isSuperAdmin && orgId) {
      where.organizationId = orgId;
    }

    const test = await prisma.test.findFirst({ where });

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const {
      title,
      description,
      durationMins,
      startDate,
      endDate,
      accessCode,
      defaultMarks,
      defaultNegativeMarks,
      passMarks,
      status,
    } = req.body;

    const updated = await prisma.test.update({
      where: { id: test.id },
      data: {
        title: title ? String(title).trim() : undefined,
        description: description !== undefined ? description : undefined,
        durationMins: durationMins !== undefined ? Number(durationMins) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        accessCode: accessCode !== undefined ? (accessCode ? String(accessCode).trim().toUpperCase() : null) : undefined,
        defaultMarks: defaultMarks !== undefined ? Number(defaultMarks) : undefined,
        defaultNegativeMarks: defaultNegativeMarks !== undefined ? Number(defaultNegativeMarks) : undefined,
        passMarks: passMarks !== undefined ? (passMarks ? Number(passMarks) : null) : undefined,
        status: status && Object.values(TestStatus).includes(status) ? status : undefined,
      },
    });

    return res.json({ success: true, test: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Publish Test (DRAFT -> PUBLISHED)
router.post('/:id/publish', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;

    const where: any = { id: req.params.id };
    if (!isSuperAdmin && orgId) {
      where.organizationId = orgId;
    }

    const test = await prisma.test.findFirst({
      where,
      include: { _count: { select: { questions: true } } },
    });

    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (test._count.questions === 0) {
      return res.status(400).json({ error: 'Cannot publish a test with 0 questions. Please add at least one question.' });
    }

    const published = await prisma.test.update({
      where: { id: test.id },
      data: { status: TestStatus.PUBLISHED },
    });

    return res.json({
      success: true,
      message: `Test "${published.title}" is now published and ready for candidate invitations.`,
      test: published,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Delete Test
router.delete('/:id', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;

    const where: any = { id: req.params.id };
    if (!isSuperAdmin && orgId) {
      where.organizationId = orgId;
    }

    const test = await prisma.test.findFirst({ where });

    if (!test) return res.status(404).json({ error: 'Test not found' });

    await prisma.test.delete({ where: { id: test.id } });

    return res.json({ success: true, message: `Test "${test.title}" removed.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Add Question to Test
router.post('/:id/questions', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const authorId = req.user!.id;
    const testId = req.params.id;

    const test = await prisma.test.findFirst({
      where: isSuperAdmin ? { id: testId } : { id: testId, organizationId: req.user!.organizationId! },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const orgId = test.organizationId;
    const { questionText, type, options, correctAnswers, explanation, marks, negativeMarks } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    const qMarks = marks !== undefined ? Number(marks) : test.defaultMarks;
    const qNegMarks = negativeMarks !== undefined ? Number(negativeMarks) : test.defaultNegativeMarks;

    const question = await prisma.question.create({
      data: {
        organizationId: orgId,
        authorId,
        questionText: String(questionText).trim(),
        type: type && Object.values(QuestionType).includes(type) ? type : QuestionType.MULTIPLE_CHOICE,
        options: options || null,
        correctAnswers: correctAnswers || null,
        explanation: explanation ? String(explanation).trim() : null,
        marks: qMarks,
        negativeMarks: qNegMarks,
      },
    });

    // Count existing questions to set order
    const existingCount = await prisma.testQuestion.count({ where: { testId } });

    await prisma.testQuestion.create({
      data: {
        testId,
        questionId: question.id,
        order: existingCount + 1,
        marks: qMarks,
        negativeMarks: qNegMarks,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Question added to assessment.',
      question,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Bulk Import Questions
router.post('/:id/questions/bulk', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const authorId = req.user!.id;
    const testId = req.params.id;

    const test = await prisma.test.findFirst({
      where: isSuperAdmin ? { id: testId } : { id: testId, organizationId: req.user!.organizationId! },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const orgId = test.organizationId;
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array must not be empty' });
    }

    let currentOrder = await prisma.testQuestion.count({ where: { testId } });
    let createdCount = 0;

    for (const item of questions) {
      if (!item.questionText) continue;

      const qMarks = item.marks !== undefined ? Number(item.marks) : test.defaultMarks;
      const qNegMarks = item.negativeMarks !== undefined ? Number(item.negativeMarks) : test.defaultNegativeMarks;

      const created = await prisma.question.create({
        data: {
          organizationId: orgId,
          authorId,
          questionText: String(item.questionText).trim(),
          type: item.type && Object.values(QuestionType).includes(item.type) ? item.type : QuestionType.MULTIPLE_CHOICE,
          options: item.options || null,
          correctAnswers: item.correctAnswers || null,
          explanation: item.explanation || null,
          marks: qMarks,
          negativeMarks: qNegMarks,
        },
      });

      currentOrder += 1;
      await prisma.testQuestion.create({
        data: {
          testId,
          questionId: created.id,
          order: currentOrder,
          marks: qMarks,
          negativeMarks: qNegMarks,
        },
      });

      createdCount += 1;
    }

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${createdCount} questions into assessment.`,
      count: createdCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Remove Question from Test
router.delete('/:id/questions/:qId', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const { id: testId, qId: questionId } = req.params;

    const test = await prisma.test.findFirst({
      where: isSuperAdmin ? { id: testId } : { id: testId, organizationId: req.user!.organizationId! },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    await prisma.testQuestion.deleteMany({
      where: { testId, questionId },
    });

    return res.json({ success: true, message: 'Question removed from test.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
