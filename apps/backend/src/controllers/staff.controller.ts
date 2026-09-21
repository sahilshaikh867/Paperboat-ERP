import { Router, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient, Role } from '@prisma/client';
import { requireAuth, requireRole, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendEmail } from '../services/email/email.service';

const prisma = new PrismaClient();

export function createStaffRouter(targetRole: 'TEACHER' | 'RECRUITER') {
  const router = Router();
  const isTeacher = targetRole === 'TEACHER';
  const roleEnum = isTeacher ? Role.TEACHER : Role.RECRUITER;

  // 1. List Staff (Teachers or Recruiters)
  router.get('/', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
      const orgId = (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;

      const where: any = { role: roleEnum };
      if (orgId) {
        where.organizationId = orgId;
      } else if (!isSuperAdmin) {
        return res.status(403).json({ error: 'User is not assigned to an active organization' });
      }

      const staff = await prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          department: true,
          designation: true,
          degree: true,
          isEmailVerified: true,
          isActive: true,
          createdAt: true,
          organization: {
            select: { id: true, name: true, type: true },
          },
          _count: {
            select: {
              testsCreated: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(staff);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Add New Staff Member & Dispatch Account Activation Invitation Email
  router.post('/', requireAuth, requireTenant, requireRole(Role.ORG_ADMIN, Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
      let orgId = (req.body.organizationId as string) || (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || req.user!.organizationId;

      if (isSuperAdmin && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) orgId = firstOrg.id;
      }

      if (!orgId) {
        return res.status(400).json({ error: 'An organization is required to add staff' });
      }

      const { name, email, phone, designation, department, degree } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: `${isTeacher ? 'Teacher' : 'Recruiter'} name and email are required` });
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(400).json({ error: 'A user account with this email address already exists' });
      }

      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Generate 32-byte cryptographically secure invitation token (valid for 7 days)
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const createdUser = await prisma.user.create({
        data: {
          organizationId: orgId,
          role: roleEnum,
          fullName: String(name).trim(),
          email: normalizedEmail,
          phone: phone ? String(phone).trim() : null,
          designation: designation ? String(designation).trim() : null,
          department: department ? String(department).trim() : null,
          degree: degree ? String(degree).trim() : null,
          invitationToken,
          invitationExpiresAt,
          isEmailVerified: false,
          isActive: true,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const activationUrl = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

      // Dispatch invitation email via centralized email service
      await sendEmail({
        recipient: normalizedEmail,
        template: isTeacher ? 'teacher_invitation' : 'recruiter_invitation',
        data: {
          fullName: createdUser.fullName,
          orgName: org.name,
          department: createdUser.department,
          designation: createdUser.designation,
          activationUrl,
        },
        organizationId: orgId,
        roleContext: targetRole,
      });

      return res.status(201).json({
        success: true,
        message: `${isTeacher ? 'Teacher' : 'Recruiter'} invitation created and email dispatched to ${normalizedEmail}.`,
        user: {
          id: createdUser.id,
          fullName: createdUser.fullName,
          email: createdUser.email,
          role: createdUser.role,
          department: createdUser.department,
          designation: createdUser.designation,
          degree: createdUser.degree,
        },
        activationUrl,
      });
    } catch (err: any) {
      console.error(`[CREATE ${targetRole} ERROR]`, err);
      return res.status(500).json({ error: err.message || `Failed to add ${targetRole.toLowerCase()}` });
    }
  });

  // 3. Update Staff Member (Designation, Department, Degree, Status)
  router.patch('/:id', requireAuth, requireTenant, requireRole(Role.ORG_ADMIN, Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
      const orgId = req.user!.organizationId;
      const targetId = req.params.id;
      const { fullName, phone, department, designation, degree, isActive } = req.body;

      const where: any = { id: targetId, role: roleEnum };
      if (!isSuperAdmin && orgId) {
        where.organizationId = orgId;
      }

      const target = await prisma.user.findFirst({ where });
      if (!target) {
        return res.status(404).json({ error: `${isTeacher ? 'Teacher' : 'Recruiter'} not found` });
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: {
          fullName: fullName ? String(fullName).trim() : undefined,
          phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
          department: department !== undefined ? (department ? String(department).trim() : null) : undefined,
          designation: designation !== undefined ? (designation ? String(designation).trim() : null) : undefined,
          degree: degree !== undefined ? (degree ? String(degree).trim() : null) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      return res.json({
        success: true,
        message: `${isTeacher ? 'Faculty' : 'Recruiter'} details updated successfully`,
        user: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. Deactivate / Remove Staff Member
  router.delete('/:id', requireAuth, requireTenant, requireRole(Role.ORG_ADMIN, Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
      const orgId = req.user!.organizationId;
      const targetId = req.params.id;

      const where: any = { id: targetId, role: roleEnum };
      if (!isSuperAdmin && orgId) {
        where.organizationId = orgId;
      }

      const target = await prisma.user.findFirst({ where });

      if (!target) {
        return res.status(404).json({ error: `${isTeacher ? 'Teacher' : 'Recruiter'} not found` });
      }

      await prisma.user.update({
        where: { id: targetId },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: `${isTeacher ? 'Teacher' : 'Recruiter'} "${target.fullName}" has been deactivated.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
