import { Router, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient, InvitationStatus, TestStatus, Role } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendEmail } from '../services/email/email.service';

const router = Router();
const prisma = new PrismaClient();

// 1. Issue Test Invitations (Single or Bulk)
router.post('/', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = req.user!.organizationId;
    const { testId, candidateIds, candidateEmails } = req.body;

    if (!testId) {
      return res.status(400).json({ error: 'Test ID is required' });
    }

    const whereTest: any = { id: testId };
    if (!isSuperAdmin && orgId) {
      whereTest.organizationId = orgId;
    }

    const test = await prisma.test.findFirst({
      where: whereTest,
      include: { organization: true },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.status === TestStatus.DRAFT) {
      return res.status(400).json({ error: 'Please publish this test before issuing candidate invitations.' });
    }

    const effectiveOrgId = test.organizationId;

    // Resolve candidates by IDs or emails
    let targetCandidates: Array<{ id: string; fullName: string; email: string }> = [];

    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      targetCandidates = await prisma.candidate.findMany({
        where: isSuperAdmin ? { id: { in: candidateIds } } : { id: { in: candidateIds }, organizationId: effectiveOrgId },
        select: { id: true, fullName: true, email: true },
      });
    } else if (Array.isArray(candidateEmails) && candidateEmails.length > 0) {
      const normEmails = candidateEmails.map((e: string) => String(e).trim().toLowerCase());
      targetCandidates = await prisma.candidate.findMany({
        where: isSuperAdmin ? { email: { in: normEmails } } : { email: { in: normEmails }, organizationId: effectiveOrgId },
        select: { id: true, fullName: true, email: true },
      });
    }

    if (targetCandidates.length === 0) {
      return res.status(400).json({ error: 'No matching candidates found to invite' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const expiresAt = test.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitationsCreated: any[] = [];

    for (const cand of targetCandidates) {
      // Find or create invitation
      const invitationToken = crypto.randomBytes(24).toString('hex');
      const examUrl = `${frontendUrl}/exam/take?token=${invitationToken}`;

      const invitation = await prisma.testInvitation.create({
        data: {
          testId: test.id,
          candidateId: cand.id,
          candidateEmail: cand.email,
          invitationToken,
          status: InvitationStatus.EMAIL_SENT,
          sentAt: new Date(),
          expiresAt,
        },
      });

      // Dispatch Candidate Exam Invitation Email
      await sendEmail({
        recipient: cand.email,
        template: 'candidate_invitation',
        data: {
          candidateName: cand.fullName,
          testTitle: test.title,
          orgName: test.organization.name,
          durationMins: test.durationMins,
          startDate: test.startDate,
          endDate: test.endDate,
          accessCode: test.accessCode,
          examUrl,
        },
        organizationId: effectiveOrgId,
        roleContext: 'CANDIDATE',
      });

      invitationsCreated.push({
        invitationId: invitation.id,
        candidateName: cand.fullName,
        candidateEmail: cand.email,
        examUrl,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Issued ${invitationsCreated.length} candidate invitations for "${test.title}".`,
      invitations: invitationsCreated,
    });
  } catch (err: any) {
    console.error('[INVITATION ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Audit Invitations for a Test
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

    const invitations = await prisma.testInvitation.findMany({
      where: { testId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        session: { select: { id: true, startedAt: true, submittedAt: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(invitations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
