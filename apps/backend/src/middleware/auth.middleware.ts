import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: Role };
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        organizationId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account is inactive or no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }

    next();
  };
}

export async function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admin can act on any organization if provided in header/query, otherwise defaults to primary college organization
  if (req.user.role === Role.SUPER_ADMIN) {
    const targetOrgId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      req.user.organizationId;

    if (targetOrgId) {
      req.user.organizationId = targetOrgId;
      return next();
    }

    const defaultOrg =
      (await prisma.organization.findFirst({ where: { type: 'COLLEGE' } })) ||
      (await prisma.organization.findFirst());

    if (defaultOrg) {
      req.user.organizationId = defaultOrg.id;
    }
    return next();
  }

  if (!req.user.organizationId) {
    return res.status(403).json({ error: 'User is not assigned to an active organization' });
  }

  next();
}
