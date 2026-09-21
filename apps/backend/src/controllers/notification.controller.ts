import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Apply auth and tenant middleware
router.use(requireAuth, requireTenant);

// 1. GET / - List notifications for logged in user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

// 2. PUT /:id/read - Mark notification as read
router.put('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({ success: true, notification: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to mark notification as read' });
  }
});

// 3. PUT /read-all - Mark all notifications as read
router.put('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to mark all as read' });
  }
});

// 4. DELETE /:id - Delete a notification
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    return res.json({ success: true, message: 'Notification removed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete notification' });
  }
});

export default router;
