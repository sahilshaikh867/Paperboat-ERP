import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// 1. Get Test Results Summary & Candidate Scores
router.get('/test/:testId', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;
    const testId = req.params.testId;

    const whereTest: any = { id: testId };
    if (!isSuperAdmin && orgId) {
      whereTest.organizationId = orgId;
    }

    const test = await prisma.test.findFirst({
      where: whereTest,
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const results = await prisma.result.findMany({
      where: { testId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        session: { select: { startedAt: true, submittedAt: true, autoSubmitted: true } },
      },
      orderBy: { totalScore: 'desc' },
    });

    const totalSubmissions = results.length;
    const passedCount = results.filter((r) => r.passed).length;
    const averageScore = totalSubmissions > 0 ? Number((results.reduce((acc, r) => acc + r.totalScore, 0) / totalSubmissions).toFixed(1)) : 0;
    const averagePercentage = totalSubmissions > 0 ? Number((results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions).toFixed(1)) : 0;

    return res.json({
      testTitle: test.title,
      summary: {
        totalSubmissions,
        passedCount,
        failedCount: totalSubmissions - passedCount,
        passRate: totalSubmissions > 0 ? Number(((passedCount / totalSubmissions) * 100).toFixed(1)) : 0,
        averageScore,
        averagePercentage,
      },
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get Single Result Details
router.get('/:id', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;

    const whereResult: any = { id: req.params.id };
    if (!isSuperAdmin && orgId) {
      whereResult.test = { organizationId: orgId };
    }

    const result = await prisma.result.findFirst({
      where: whereResult,
      include: {
        candidate: true,
        test: { select: { id: true, title: true, passMarks: true } },
        session: true,
      },
    });

    if (!result) return res.status(404).json({ error: 'Result not found' });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
