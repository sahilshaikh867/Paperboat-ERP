import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get Outgoing Email Delivery Audit Logs (Diagnostic purposes)
router.get('/logs', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const recipient = req.query.recipient as string | undefined;

    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = orgId;
    }
    if (recipient) {
      where.recipient = { contains: recipient.trim().toLowerCase() };
    }

    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
