import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, OrgType, Role } from '@prisma/client';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

function issueJwt(user: { id: string; role: Role }) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '12h' as any }
  );
}

// 1. Public College Registration
router.post('/college', async (req: Request, res: Response) => {
  try {
    const {
      collegeName,
      collegeEmail,
      phone,
      address,
      city,
      state,
      country,
      website,
      logoUrl,
      adminName,
      adminEmail,
      password,
    } = req.body;

    if (!collegeName || !collegeEmail || !adminName || !adminEmail || !password) {
      return res.status(400).json({
        error: 'College name, official college email, administrator name, email, and password are required',
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normOrgEmail = String(collegeEmail).trim().toLowerCase();
    const normAdminEmail = String(adminEmail).trim().toLowerCase();

    // Verify uniqueness
    const existingOrg = await prisma.organization.findUnique({ where: { officialEmail: normOrgEmail } });
    if (existingOrg) {
      return res.status(400).json({ error: 'An organization with this official email is already registered' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normAdminEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this administrator email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique Institute Secret Code e.g. STANFORD-7892
    const cleanPrefix = String(collegeName)
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'COLLEGE';
    const randomSuffix = crypto.randomInt(1000, 9999);
    const instituteSecretCode = `${cleanPrefix}-${randomSuffix}`;

    // Create College + Initial ORG_ADMIN in transaction (Instant access, no email verification needed)
    const [org, user] = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          type: OrgType.COLLEGE,
          name: String(collegeName).trim(),
          officialEmail: normOrgEmail,
          instituteSecretCode,
          phone: phone ? String(phone).trim() : null,
          address: address ? String(address).trim() : null,
          city: city ? String(city).trim() : null,
          state: state ? String(state).trim() : null,
          country: country ? String(country).trim() : null,
          website: website ? String(website).trim() : null,
          logoUrl: logoUrl ? String(logoUrl).trim() : null,
          isActive: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email: normAdminEmail,
          passwordHash,
          fullName: String(adminName).trim(),
          role: Role.ORG_ADMIN,
          organizationId: createdOrg.id,
          phone: phone ? String(phone).trim() : null,
          department: 'Administration',
          designation: 'College Administrator',
          isEmailVerified: true,
          isActive: true,
        },
      });

      return [createdOrg, createdUser];
    });

    const token = issueJwt(user);

    return res.status(201).json({
      success: true,
      message: `College "${org.name}" registered successfully! Institute Secret Code generated: ${org.instituteSecretCode}. You can now log in directly using this code without email verification.`,
      token,
      instituteSecretCode: org.instituteSecretCode,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organization: org,
      },
    });
  } catch (err: any) {
    console.error('[COLLEGE REG ERROR]', err);
    return res.status(500).json({ error: err.message || 'College registration failed' });
  }
});

// 2. Public Company Registration
router.post('/company', async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      companyEmail,
      phone,
      address,
      city,
      state,
      country,
      website,
      logoUrl,
      adminName,
      adminEmail,
      password,
    } = req.body;

    if (!companyName || !companyEmail || !adminName || !adminEmail || !password) {
      return res.status(400).json({
        error: 'Company name, official company email, administrator name, email, and password are required',
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normOrgEmail = String(companyEmail).trim().toLowerCase();
    const normAdminEmail = String(adminEmail).trim().toLowerCase();

    const existingOrg = await prisma.organization.findUnique({ where: { officialEmail: normOrgEmail } });
    if (existingOrg) {
      return res.status(400).json({ error: 'A company with this official email is already registered' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normAdminEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this administrator email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [org, user] = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          type: OrgType.COMPANY,
          name: String(companyName).trim(),
          officialEmail: normOrgEmail,
          phone: phone ? String(phone).trim() : null,
          address: address ? String(address).trim() : null,
          city: city ? String(city).trim() : null,
          state: state ? String(state).trim() : null,
          country: country ? String(country).trim() : null,
          website: website ? String(website).trim() : null,
          logoUrl: logoUrl ? String(logoUrl).trim() : null,
          isActive: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email: normAdminEmail,
          passwordHash,
          fullName: String(adminName).trim(),
          role: Role.ORG_ADMIN,
          organizationId: createdOrg.id,
          phone: phone ? String(phone).trim() : null,
          department: 'Talent Acquisition',
          designation: 'Company Administrator',
          isEmailVerified: true,
          isActive: true,
        },
      });

      return [createdOrg, createdUser];
    });

    const token = issueJwt(user);

    return res.status(201).json({
      success: true,
      message: `Company "${org.name}" registered successfully! You may now begin inviting recruiters and setting up hiring tests.`,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organization: org,
      },
    });
  } catch (err: any) {
    console.error('[COMPANY REG ERROR]', err);
    return res.status(500).json({ error: err.message || 'Company registration failed' });
  }
});

// 3. Get Current Tenant Organization Profile
router.get('/current', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.organizationId) {
    return res.status(404).json({ error: 'No associated organization found' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: req.user.organizationId },
    include: {
      _count: {
        select: {
          users: true,
          tests: true,
          candidates: true,
        },
      },
    },
  });

  if (!org) return res.status(404).json({ error: 'Organization not found' });
  return res.json(org);
});

// 4. Update Organization Profile (ORG_ADMIN only)
router.put('/current', requireAuth, requireRole(Role.ORG_ADMIN, Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const { name, phone, address, city, state, country, website, logoUrl } = req.body;

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: name ? String(name).trim() : undefined,
        phone: phone ? String(phone).trim() : undefined,
        address: address ? String(address).trim() : undefined,
        city: city ? String(city).trim() : undefined,
        state: state ? String(state).trim() : undefined,
        country: country ? String(country).trim() : undefined,
        website: website ? String(website).trim() : undefined,
        logoUrl: logoUrl ? String(logoUrl).trim() : undefined,
      },
    });

    return res.json({ success: true, organization: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. List All Organizations (Super Admin only)
router.get('/', requireAuth, requireRole(Role.SUPER_ADMIN), async (_req: AuthenticatedRequest, res: Response) => {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: { users: true, tests: true, candidates: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(orgs);
});

export default router;
