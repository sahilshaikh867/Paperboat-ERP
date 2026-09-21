import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, Role, OrgType, LoginAttemptStatus } from '@prisma/client';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { EmailService, sendEmail } from '../services/email.service';
import { OTPService } from '../services/otp.service';
import { AuditService } from '../services/audit.service';

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_SUPER_ADMIN_EMAILS = [
  'examforge.superadmin@gmail.com',
  'devopsbysahil@gmail.com'
];

function issueJwt(user: { id: string; role: Role }) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '12h' as any }
  );
}

// 1. Unified Login Endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, instituteSecretCode, secretCode } = req.body;
    let normalizedEmail = email ? String(email).trim().toLowerCase() : '';

    const rawSecretCode = (instituteSecretCode || secretCode) ? String(instituteSecretCode || secretCode).trim().toUpperCase() : null;

    let user: any = null;

    if (rawSecretCode) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const collegeOrg = await prisma.organization.findFirst({
        where: { instituteSecretCode: rawSecretCode, type: OrgType.COLLEGE },
      });

      if (!collegeOrg) {
        return res.status(404).json({ error: 'Invalid Institute Secret Code. College not found.' });
      }

      if (email) {
        const normalizedEmail = String(email).trim().toLowerCase();
        user = await prisma.user.findFirst({
          where: { organizationId: collegeOrg.id, email: normalizedEmail },
          include: { organization: true },
        });
      } else {
        // Find College Administrator
        user = await prisma.user.findFirst({
          where: { organizationId: collegeOrg.id, role: Role.ORG_ADMIN },
          include: { organization: true },
        });
      }

      if (!user) {
        return res.status(404).json({ error: 'Administrator account for this Institute not found' });
      }
    } else {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email (or Institute Secret Code) and password are required' });
      }

      let normalizedEmail = String(email).trim().toLowerCase();

      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { organization: true },
      });

      if (!user) {
        user = await prisma.user.findUnique({
          where: { email: String(email).trim().toLowerCase() },
          include: { organization: true },
        });
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or organization not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    // A. Super Admin OTP Verification Flow (Password login strictly prohibited for Super Admin)
    if (user.role === Role.SUPER_ADMIN) {
      const allowedSuperAdminEmails = ALLOWED_SUPER_ADMIN_EMAILS;

      const rawInput = String(email).trim().toLowerCase();
      if (
        !allowedSuperAdminEmails.includes(rawInput) &&
        !allowedSuperAdminEmails.includes(normalizedEmail) &&
        !allowedSuperAdminEmails.includes(user.email.toLowerCase())
      ) {
        return res.status(403).json({
          error: 'Access restricted: examforge.superadmin@gmail.com is the authorized Super Admin.',
        });
      }

      const { otp } = req.body;

      // Super admin password login is strictly disallowed; 6-digit OTP is mandatory
      if (!otp) {
        return res.status(403).json({
          error: 'Super Admin accounts strictly require 6-digit OTP verification. Password login is disabled for Super Admin.',
          requiresOtp: true,
          email: user.email,
        });
      }

      const cleanOtp = String(otp).trim();
        const attempt = await prisma.loginAttempt.findFirst({
          where: {
            userId: user.id,
            approvalToken: cleanOtp,
            status: LoginAttemptStatus.PENDING,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!attempt) {
          const used = await prisma.loginAttempt.findFirst({
            where: { userId: user.id, approvalToken: cleanOtp, status: LoginAttemptStatus.APPROVED },
          });
          if (used) {
            return res.status(410).json({ error: 'This verification code has already been used. Please request a new OTP.' });
          }
          return res.status(401).json({ error: 'Invalid verification code. Please check your inbox or request a new code.' });
        }

        if (new Date() > attempt.expiresAt) {
          await prisma.loginAttempt.update({
            where: { id: attempt.id },
            data: { status: LoginAttemptStatus.EXPIRED },
          });
          return res.status(410).json({ error: 'This verification code has expired. Please request a new code.' });
        }

        // Mark as approved (single-use)
        await prisma.loginAttempt.update({
          where: { id: attempt.id },
          data: { status: LoginAttemptStatus.APPROVED, approvedAt: new Date() },
        });

        // Invalidate any other pending attempts
        await prisma.loginAttempt.updateMany({
          where: { userId: user.id, status: LoginAttemptStatus.PENDING, id: { not: attempt.id } },
          data: { status: LoginAttemptStatus.EXPIRED },
        });

        const token = issueJwt(user);
        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            department: user.department,
            designation: user.designation,
            organization: null,
          },
          message: 'Super Admin authenticated successfully',
        });
    }

    // B. Standard Role Login (ORG_ADMIN, TEACHER, RECRUITER, CANDIDATE)
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password credentials' });
    }

    const token = issueJwt(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        designation: user.designation,
        organization: user.organization
          ? {
            id: user.organization.id,
            name: user.organization.name,
            type: user.organization.type,
            officialEmail: user.organization.officialEmail,
          }
          : null,
      },
    });
  } catch (err: any) {
    console.error('[AUTH LOGIN ERROR]', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// 2. Super Admin Send OTP Endpoint (Email-only login request)
router.post('/super-admin/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Super Admin email is required' });
    }

    let normalizedEmail = String(email).trim().toLowerCase();

    const allowedSuperAdminEmails = ALLOWED_SUPER_ADMIN_EMAILS;

    if (!allowedSuperAdminEmails.includes(normalizedEmail)) {
      return res.status(403).json({
        error: 'Access restricted: examforge.superadmin@gmail.com is the authorized Super Admin.',
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: Role.SUPER_ADMIN,
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: { in: allowedSuperAdminEmails },
          role: Role.SUPER_ADMIN,
        },
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'Super Admin account not found in system' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    // Invalidate previous pending OTPs
    await prisma.loginAttempt.updateMany({
      where: {
        userId: user.id,
        status: LoginAttemptStatus.PENDING,
      },
      data: {
        status: LoginAttemptStatus.EXPIRED,
      },
    });

    // Generate 6-digit numeric OTP
    const rawOtp = String(crypto.randomInt(100000, 999999));
    const ipAddress = (req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1').replace('::ffff:', '');
    const userAgent = (req.headers['user-agent'] || 'Web Browser').toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const attempt = await prisma.loginAttempt.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        status: LoginAttemptStatus.PENDING,
        approvalToken: rawOtp,
        expiresAt,
      },
    });

    console.log(`\n================================================================================`);
    console.log(`🔐 SUPER ADMIN LOGIN OTP DISPATCHED (DIRECT REQUEST)`);
    console.log(`   Recipient : ${user.email}`);
    console.log(`   OTP Code  : ${rawOtp}`);
    console.log(`   Valid For : 10 minutes`);
    console.log(`================================================================================\n`);

    // Dispatch security OTP email
    await sendEmail({
      recipient: user.email,
      template: 'super_admin_otp',
      data: {
        fullName: user.fullName,
        otp: rawOtp,
        ipAddress,
        userAgent,
        validMinutes: 10,
      },
      roleContext: 'SUPER_ADMIN',
    });

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${user.email}.`,
      attemptId: attempt.id,
      email: user.email,
    });
  } catch (err: any) {
    console.error('[SUPER ADMIN SEND OTP ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch Super Admin OTP' });
  }
});

// 3. Super Admin Verify OTP Endpoint
router.post('/super-admin/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    let normalizedEmail = String(email).trim().toLowerCase();

    const cleanOtp = String(otp).trim();

    const allowedSuperAdminEmails = ALLOWED_SUPER_ADMIN_EMAILS;

    if (!allowedSuperAdminEmails.includes(normalizedEmail)) {
      return res.status(403).json({
        error: 'Access restricted: examforge.superadmin@gmail.com is the authorized Super Admin.',
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: Role.SUPER_ADMIN,
      },
      include: { organization: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: { in: allowedSuperAdminEmails },
          role: Role.SUPER_ADMIN,
        },
        include: { organization: true },
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'Super Admin account not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    // Find active pending login attempt for this OTP
    const attempt = await prisma.loginAttempt.findFirst({
      where: {
        userId: user.id,
        approvalToken: cleanOtp,
        status: LoginAttemptStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!attempt) {
      const usedAttempt = await prisma.loginAttempt.findFirst({
        where: {
          userId: user.id,
          approvalToken: cleanOtp,
          status: LoginAttemptStatus.APPROVED,
        },
      });
      if (usedAttempt) {
        return res.status(410).json({ error: 'This verification code has already been used. Please request a new OTP.' });
      }
      return res.status(401).json({ error: 'Invalid verification code. Please check your inbox or request a new code.' });
    }

    if (new Date() > attempt.expiresAt) {
      await prisma.loginAttempt.update({
        where: { id: attempt.id },
        data: { status: LoginAttemptStatus.EXPIRED },
      });
      return res.status(410).json({ error: 'This verification code has expired. Please request a new code.' });
    }

    // Mark as APPROVED (dead-link / single-use protection)
    await prisma.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: LoginAttemptStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    // Invalidate any other pending attempts
    await prisma.loginAttempt.updateMany({
      where: {
        userId: user.id,
        status: LoginAttemptStatus.PENDING,
        id: { not: attempt.id },
      },
      data: { status: LoginAttemptStatus.EXPIRED },
    });

    const token = issueJwt(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        designation: user.designation,
        organization: null,
      },
      message: 'Super Admin authenticated successfully',
    });
  } catch (err: any) {
    console.error('[SUPER ADMIN VERIFY OTP ERROR]', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// 4. Super Admin Confirm Login (Legacy/fallback link support)
router.get('/super-admin/confirm', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Approval token is required' });
    }

    const attempt = await prisma.loginAttempt.findUnique({
      where: { approvalToken: token.trim() },
      include: { user: { include: { organization: true } } },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'This login attempt does not exist or token is invalid' });
    }

    if (attempt.status === LoginAttemptStatus.APPROVED) {
      return res.status(410).json({ error: 'This login attempt has already been approved and the token is now dead' });
    }

    if (attempt.status === LoginAttemptStatus.REJECTED) {
      return res.status(403).json({ error: 'This login attempt was rejected and blocked' });
    }

    if (new Date() > attempt.expiresAt) {
      await prisma.loginAttempt.update({
        where: { id: attempt.id },
        data: { status: LoginAttemptStatus.EXPIRED },
      });
      return res.status(410).json({ error: 'This login approval link has expired' });
    }

    // Mark as APPROVED and destroy the single-use token
    await prisma.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: LoginAttemptStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    const sessionToken = issueJwt(attempt.user);

    return res.json({
      success: true,
      message: 'Super Admin login authorized successfully!',
      token: sessionToken,
      user: {
        id: attempt.user.id,
        email: attempt.user.email,
        fullName: attempt.user.fullName,
        role: attempt.user.role,
        organization: attempt.user.organization,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Confirmation failed' });
  }
});

// 3. Super Admin Reject Login
router.get('/super-admin/reject', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Rejection token is required' });
    }

    const attempt = await prisma.loginAttempt.findUnique({
      where: { approvalToken: token.trim() },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Invalid or missing attempt token' });
    }

    await prisma.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: LoginAttemptStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'Login attempt has been explicitly rejected and blocked.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Rejection failed' });
  }
});

// 4. Poll Check Attempt Status (for when admin approves from mobile/different tab)
router.get('/super-admin/check-attempt/:id', async (req: Request, res: Response) => {
  try {
    const attempt = await prisma.loginAttempt.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { organization: true } } },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.status === LoginAttemptStatus.APPROVED) {
      const sessionToken = issueJwt(attempt.user);
      return res.json({
        status: 'APPROVED',
        token: sessionToken,
        user: {
          id: attempt.user.id,
          email: attempt.user.email,
          fullName: attempt.user.fullName,
          role: attempt.user.role,
          organization: attempt.user.organization,
        },
      });
    }

    return res.json({ status: attempt.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Staff Invitation Acceptance & Password Creation
router.post('/accept-invitation', async (req: Request, res: Response) => {
  try {
    const { token, password, fullName } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Invitation token and new password are required' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { invitationToken: String(token).trim() },
      include: { organization: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Invalid invitation token or account already activated' });
    }

    if (user.invitationExpiresAt && new Date() > user.invitationExpiresAt) {
      return res.status(410).json({ error: 'This invitation has expired. Please request a new invite from your administrator.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        fullName: fullName ? String(fullName).trim() : user.fullName,
        isEmailVerified: true,
        isActive: true,
        invitationToken: null, // Single-use: destroyed upon activation
        invitationExpiresAt: null,
      },
      include: { organization: true },
    });

    const sessionToken = issueJwt(updatedUser);

    return res.json({
      success: true,
      message: 'Account activated successfully! You are now logged in.',
      token: sessionToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        organization: updatedUser.organization,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to activate invitation' });
  }
});

// 6. Current Authenticated User Profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { organization: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    department: user.department,
    designation: user.designation,
    organization: user.organization,
  });
});

// 7. System Users List (Accessible by SUPER_ADMIN & ORG_ADMIN)
router.get('/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const orgId = isSuperAdmin ? (req.query.organizationId as string) || undefined : req.user!.organizationId;

    const where = orgId ? { organizationId: orgId } : {};
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        degree: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true, officialEmail: true } },
        _count: {
          select: {
            testsCreated: true,
            loginAttempts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Create Platform User (Accessible by SUPER_ADMIN & ORG_ADMIN)
router.post('/users', requireAuth, requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, fullName, role, password, department, designation, phone, organizationId } = req.body;
    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email and full name are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email address already exists' });
    }

    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const targetRole = role && Object.values(Role).includes(role) ? (role as Role) : Role.CANDIDATE;

    if (targetRole === Role.SUPER_ADMIN && !isSuperAdmin) {
      return res.status(403).json({ error: 'Only an authorized Super Admin can assign administrator privileges' });
    }

    let orgIdToAssign = organizationId || req.user!.organizationId;
    if (!orgIdToAssign && targetRole !== Role.SUPER_ADMIN) {
      const defaultOrg = await prisma.organization.findFirst();
      if (defaultOrg) orgIdToAssign = defaultOrg.id;
    }

    const passwordToHash = password && String(password).length >= 6 ? password : 'password12345';
    const passwordHash = await bcrypt.hash(passwordToHash, 12);

    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: String(fullName).trim(),
        role: targetRole,
        passwordHash,
        department: department || null,
        designation: designation || null,
        phone: phone || null,
        organizationId: orgIdToAssign || null,
        isEmailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        isActive: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true } },
      },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// 9. Update User Role
router.patch('/users/:id/role', requireAuth, requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protection: Primary Super Admin cannot be demoted
    if (targetUser.email === 'devopsbysahil@gmail.com' && role !== Role.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'The primary Super Admin account (devopsbysahil@gmail.com) cannot be demoted. Role and account are locked by policy.',
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true } },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update user role' });
  }
});

// 10. Toggle User Status (Active / Inactive)
router.patch('/users/:id/status', requireAuth, requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === 'devopsbysahil@gmail.com' && isActive === false) {
      return res.status(403).json({
        error: 'The primary Super Admin account cannot be deactivated.',
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update user status' });
  }
});

// 11. Update User Details
router.patch('/users/:id', requireAuth, requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, email, department, designation, phone } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protection: Primary Super Admin email cannot be modified without previous admin authorization
    if (targetUser.email === 'devopsbysahil@gmail.com' && email && String(email).trim().toLowerCase() !== 'devopsbysahil@gmail.com') {
      return res.status(403).json({
        error: 'The Super Admin email (devopsbysahil@gmail.com) is locked by default. Changing this email requires explicit authorization from the previous Super Admin.',
      });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = String(fullName).trim();
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (phone !== undefined) updateData.phone = phone;
    if (email && targetUser.email !== 'devopsbysahil@gmail.com') {
      updateData.email = String(email).trim().toLowerCase();
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update user details' });
  }
});

// 12. Delete User
router.delete('/users/:id', requireAuth, requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protection: Primary Super Admin cannot be deleted
    if (targetUser.email === 'devopsbysahil@gmail.com' || targetUser.role === Role.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'The primary Super Admin account is permanently protected and cannot be deleted.',
      });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ success: true, message: `User ${targetUser.fullName} (${targetUser.email}) deleted successfully` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

// 13. Forgot Password - Generates time-limited reset token & dispatches email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normEmail } });

    if (!user) {
      // Return success to avoid email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      });
    }

    const resetToken = jwt.sign(
      { id: user.id, email: user.email, purpose: 'PASSWORD_RESET' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    await EmailService.sendPasswordReset(
      user.email,
      resetToken,
      user.fullName,
      user.organizationId || undefined
    );

    await AuditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process password reset request' });
  }
});

// 14. Reset Password - Verifies token and updates user password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new one.' });
    }

    if (payload.purpose !== 'PASSWORD_RESET' || !payload.id) {
      return res.status(400).json({ error: 'Invalid token structure' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await AuditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    const authToken = issueJwt(user);

    return res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in.',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// 15. Student Verification OTP - Send Code
router.post('/student/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const result = await OTPService.sendStudentVerificationOTP(email);

    await AuditService.log({
      action: 'STUDENT_OTP_REQUESTED',
      resourceType: 'StudentOtpVerification',
      metadata: { email },
      ipAddress: req.ip,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to send verification code' });
  }
});

// 16. Student Verification OTP - Verify Code
router.post('/student/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required' });
    }

    const result = await OTPService.verifyStudentOTP(email, otp);

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { organization: true },
    });

    await AuditService.log({
      userId: user?.id,
      organizationId: user?.organizationId,
      action: 'STUDENT_OTP_VERIFIED',
      resourceType: 'User',
      resourceId: user?.id,
      ipAddress: req.ip,
    });

    const sessionToken = user ? issueJwt(user) : undefined;

    return res.json({
      ...result,
      token: sessionToken,
      user: user
        ? {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isEmailVerified: true,
            organization: user.organization,
          }
        : undefined,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

export default router;
