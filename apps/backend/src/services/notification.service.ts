import { PrismaClient, NotificationChannel } from '@prisma/client';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

export interface CreateNotificationParams {
  userId: string;
  organizationId?: string | null;
  title: string;
  message: string;
  type?: string;
  channel?: NotificationChannel;
  metadata?: any;
}

export class NotificationService {
  /**
   * Dispatches in-app and/or email notifications
   */
  static async send(params: CreateNotificationParams) {
    const {
      userId,
      organizationId,
      title,
      message,
      type = 'INFO',
      channel = NotificationChannel.IN_APP,
      metadata,
    } = params;

    // 1. Create In-App record
    const record = await prisma.notification.create({
      data: {
        userId,
        organizationId: organizationId || null,
        title,
        message,
        type,
        channel,
        metadata: metadata || null,
        isRead: false,
      },
    });

    // 2. If email or both requested, dispatch email
    if (channel === NotificationChannel.EMAIL || channel === NotificationChannel.BOTH) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true },
      });

      if (user && user.email) {
        await EmailService.sendNotificationEmail(
          user.email,
          title,
          message,
          organizationId || undefined
        );
      }
    }

    return record;
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
}
