import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// 1. List Candidates
router.get('/', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;

    const where: any = {};
    if (orgId) {
      where.organizationId = orgId;
    } else if (!isSuperAdmin) {
      return res.status(403).json({ error: 'User is not assigned to an active organization' });
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, type: true },
        },
        invitations: {
          include: { test: { select: { id: true, title: true, status: true } } },
        },
        _count: { select: { invitations: true, sessions: true, results: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(candidates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Add Single Candidate
router.post('/', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    let orgId = (req.body.organizationId as string) || (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;

    if (isSuperAdmin && !orgId) {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) orgId = firstOrg.id;
    }

    if (!orgId) {
      return res.status(400).json({ error: 'An organization is required to add candidate' });
    }

    const { fullName, email, phone } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Candidate name and email are required' });
    }

    const normEmail = String(email).trim().toLowerCase();

    const candidate = await prisma.candidate.upsert({
      where: { organizationId_email: { organizationId: orgId, email: normEmail } },
      update: {
        fullName: String(fullName).trim(),
        phone: phone ? String(phone).trim() : undefined,
      },
      create: {
        organizationId: orgId,
        fullName: String(fullName).trim(),
        email: normEmail,
        phone: phone ? String(phone).trim() : null,
      },
    });

    return res.status(201).json({ success: true, candidate });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Bulk CSV Import Candidates
router.post('/import-csv', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    let orgId = (req.body.organizationId as string) || (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;

    if (isSuperAdmin && !orgId) {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) orgId = firstOrg.id;
    }

    if (!orgId) {
      return res.status(400).json({ error: 'An organization is required to import candidates' });
    }

    const { csvContent, candidates: rawCandidates } = req.body;

    let rows: Array<{ fullName: string; email: string; phone?: string }> = [];

    if (Array.isArray(rawCandidates)) {
      rows = rawCandidates;
    } else if (typeof csvContent === 'string') {
      const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const startIdx = lines[0]?.toLowerCase().includes('email') ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          rows.push({
            fullName: parts[0],
            email: parts[1],
            phone: parts[2] || undefined,
          });
        }
      }
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid candidate records found in CSV' });
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.email || !row.fullName) continue;
      const normEmail = row.email.trim().toLowerCase();
      try {
        await prisma.candidate.upsert({
          where: { organizationId_email: { organizationId: orgId, email: normEmail } },
          update: {
            fullName: row.fullName.trim(),
            phone: row.phone ? row.phone.trim() : undefined,
          },
          create: {
            organizationId: orgId,
            fullName: row.fullName.trim(),
            email: normEmail,
            phone: row.phone ? row.phone.trim() : null,
          },
        });
        importedCount += 1;
      } catch (e: any) {
        errors.push(`Failed for ${normEmail}: ${e.message}`);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully registered ${importedCount} candidates.`,
      importedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
