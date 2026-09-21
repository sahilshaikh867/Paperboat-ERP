import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogActionOptions {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
}

export class AuditService {
  /**
   * Log critical academic, authentication, or management action
   */
  static async log(options: LogActionOptions) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: options.userId || null,
          organizationId: options.organizationId || null,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.resourceId || null,
          metadata: options.metadata || null,
          ipAddress: options.ipAddress || null,
        },
      });
    } catch (err: any) {
      // Non-blocking log failure
      console.error('[AUDIT LOG ERROR]', err.message);
      return null;
    }
  }

  /**
   * Fetch audit logs for organization with pagination
   */
  static async getLogs(organizationId: string, limit: number = 50, skip: number = 0) {
    return prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip,
    });
  }
}
