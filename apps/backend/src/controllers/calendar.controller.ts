import { Router, Response } from 'express';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';
import { CalendarService } from '../services/calendar.service';
import { AuditService } from '../services/audit.service';

const router = Router();

router.use(requireAuth, requireTenant);

// 1. GET / - Retrieve calendar events for authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const { classId, subjectId, startAt, endAt, eventType } = req.query;

    const events = await CalendarService.getEvents({
      organizationId: orgId,
      userId,
      userRole,
      classId: classId ? String(classId) : undefined,
      subjectId: subjectId ? String(subjectId) : undefined,
      startAt: startAt ? new Date(String(startAt)) : undefined,
      endAt: endAt ? new Date(String(endAt)) : undefined,
      eventType: eventType ? (String(eventType) as any) : undefined,
    });

    return res.json({ success: true, events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch calendar events' });
  }
});

// 2. POST / - Create a new calendar event
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const userId = req.user!.id;

    const {
      title,
      description,
      eventType,
      classId,
      divisionId,
      subjectId,
      teacherId,
      startAt,
      endAt,
      location,
    } = req.body;

    if (!title || !startAt || !endAt || !eventType) {
      return res.status(400).json({ error: 'Title, eventType, startAt, and endAt are required' });
    }

    const event = await CalendarService.createEvent({
      organizationId: orgId,
      createdById: userId,
      title,
      description,
      eventType,
      classId,
      divisionId,
      subjectId,
      teacherId: teacherId || userId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      location,
    });

    await AuditService.log({
      userId,
      organizationId: orgId,
      action: 'CALENDAR_EVENT_CREATED',
      resourceType: 'CalendarEvent',
      resourceId: event.id,
      metadata: { title: event.title, eventType: event.eventType },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, event });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create calendar event' });
  }
});

// 3. PUT /:id - Update event
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const updated = await CalendarService.updateEvent(id, orgId, req.body);

    await AuditService.log({
      userId,
      organizationId: orgId,
      action: 'CALENDAR_EVENT_UPDATED',
      resourceType: 'CalendarEvent',
      resourceId: id,
      ipAddress: req.ip,
    });

    return res.json({ success: true, event: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update calendar event' });
  }
});

// 4. DELETE /:id - Remove event
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const userId = req.user!.id;
    const { id } = req.params;

    await CalendarService.deleteEvent(id, orgId);

    await AuditService.log({
      userId,
      organizationId: orgId,
      action: 'CALENDAR_EVENT_DELETED',
      resourceType: 'CalendarEvent',
      resourceId: id,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Calendar event deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete calendar event' });
  }
});

export default router;
