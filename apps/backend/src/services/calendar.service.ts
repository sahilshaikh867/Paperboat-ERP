import { PrismaClient, CalendarEventType, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface GetEventsParams {
  organizationId: string;
  userId: string;
  userRole: Role;
  classId?: string;
  subjectId?: string;
  startAt?: Date;
  endAt?: Date;
  eventType?: CalendarEventType;
}

export interface CreateEventParams {
  organizationId: string;
  createdById: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  classId?: string;
  divisionId?: string;
  subjectId?: string;
  teacherId?: string;
  startAt: Date;
  endAt: Date;
  location?: string;
}

export class CalendarService {
  /**
   * Fetch calendar events filtered by organization, date window, and user's role/assignments
   */
  static async getEvents(params: GetEventsParams) {
    const { organizationId, userId, userRole, classId, subjectId, startAt, endAt, eventType } = params;

    const where: any = { organizationId };

    if (startAt || endAt) {
      where.startAt = {};
      if (startAt) where.startAt.gte = startAt;
      if (endAt) where.startAt.lte = endAt;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (classId) {
      where.classId = classId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    // Role-specific scoping:
    if (userRole === Role.CANDIDATE) {
      // Student: only see events for classes they are enrolled in, or organization-wide events (holidays/exams)
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { studentId: userId, status: 'ACTIVE' },
        select: { classId: true },
      });
      const enrolledClassIds = enrollments.map((e) => e.classId);

      where.OR = [
        { classId: { in: enrolledClassIds } },
        { classId: null }, // College-wide events / holidays
      ];
    } else if (userRole === Role.TEACHER) {
      // Teacher: see assigned classes, assigned subjects, or events created by them or organization-wide
      const [classAssignments, subjectAssignments] = await Promise.all([
        prisma.classTeacherAssignment.findMany({
          where: { teacherId: userId },
          select: { classId: true },
        }),
        prisma.subjectTeacherAssignment.findMany({
          where: { teacherId: userId },
          select: { classId: true, subjectId: true },
        }),
      ]);

      const classIds = Array.from(
        new Set([...classAssignments.map((c) => c.classId), ...subjectAssignments.map((s) => s.classId)])
      );

      where.OR = [
        { classId: { in: classIds } },
        { teacherId: userId },
        { createdById: userId },
        { classId: null }, // College-wide events
      ];
    }
    // ORG_ADMIN and SUPER_ADMIN see all organization events

    return prisma.calendarEvent.findMany({
      where,
      include: {
        class: { select: { id: true, classCode: true, semester: true, division: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Create a new calendar event
   */
  static async createEvent(params: CreateEventParams) {
    if (new Date(params.endAt) <= new Date(params.startAt)) {
      throw new Error('Event end time must be after start time.');
    }

    let resolvedEventType: CalendarEventType = CalendarEventType.LECTURE;
    const rawType = String(params.eventType || 'LECTURE').toUpperCase();
    if (['TEST', 'UNIT_TEST', 'TOPIC_TEST', 'MOCK_TEST', 'PRE_SEM'].includes(rawType)) {
      resolvedEventType = CalendarEventType.TEST;
    } else if (['PRACTICAL', 'LAB', 'LAB_WORK', 'EXPERIMENT'].includes(rawType)) {
      resolvedEventType = CalendarEventType.PRACTICAL;
    } else if (['VIVA', 'VIVA_VOCE', 'ORAL'].includes(rawType)) {
      resolvedEventType = CalendarEventType.VIVA;
    } else if (['EXAM', 'SEMESTER_EXAM', 'SEMESTER'].includes(rawType)) {
      resolvedEventType = CalendarEventType.EXAM;
    } else if (['ASSIGNMENT', 'SUBMISSION'].includes(rawType)) {
      resolvedEventType = CalendarEventType.ASSIGNMENT;
    } else if (['DEADLINE'].includes(rawType)) {
      resolvedEventType = CalendarEventType.DEADLINE;
    } else if (['HOLIDAY', 'VACATION'].includes(rawType)) {
      resolvedEventType = CalendarEventType.HOLIDAY;
    } else if (['MEETING'].includes(rawType)) {
      resolvedEventType = CalendarEventType.MEETING;
    } else if (['CLASS_EVENT', 'EVENT'].includes(rawType)) {
      resolvedEventType = CalendarEventType.CLASS_EVENT;
    } else {
      resolvedEventType = CalendarEventType.LECTURE;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        organizationId: params.organizationId,
        createdById: params.createdById,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        eventType: resolvedEventType,
        classId: params.classId || null,
        divisionId: params.divisionId || null,
        subjectId: params.subjectId || null,
        teacherId: params.teacherId || null,
        startAt: new Date(params.startAt),
        endAt: new Date(params.endAt),
        location: params.location?.trim() || null,
        status: 'SCHEDULED',
      },
      include: {
        class: { select: { id: true, classCode: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, fullName: true } },
      },
    });

    // Automatically notify all students enrolled in this class (or all students if college-wide)
    try {
      const studentEnrollments = await prisma.studentEnrollment.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.classId ? { classId: params.classId } : {}),
          status: 'ACTIVE',
        },
        select: { studentId: true },
      });

      const formattedDate = new Date(params.startAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const readableType = String(resolvedEventType).replace(/_/g, ' ');

      if (studentEnrollments.length > 0) {
        // 1. Bulk create In-App notifications for enrolled students
        await prisma.notification.createMany({
          data: studentEnrollments.map((enr) => ({
            userId: enr.studentId,
            organizationId: params.organizationId,
            title: `📅 New Event Scheduled: ${event.title}`,
            message: `${readableType} has been scheduled for ${formattedDate}.${event.location ? ' Location: ' + event.location : ''}`,
            type:
              resolvedEventType === CalendarEventType.TEST || resolvedEventType === CalendarEventType.EXAM
                ? 'NEW_TEST'
                : resolvedEventType === CalendarEventType.PRACTICAL
                ? 'PRACTICAL'
                : resolvedEventType === CalendarEventType.VIVA
                ? 'VIVA'
                : resolvedEventType === CalendarEventType.ASSIGNMENT
                ? 'ASSIGNMENT'
                : 'EVENT_SCHEDULED',
            channel: 'IN_APP',
            metadata: {
              eventId: event.id,
              eventType: event.eventType,
              classId: event.classId,
              subjectId: event.subjectId,
              startAt: event.startAt,
            },
          })),
        });

        // 2. If actionable academic activity, automatically create StudentTask records
        const isActionable =
          resolvedEventType === CalendarEventType.ASSIGNMENT ||
          resolvedEventType === CalendarEventType.PRACTICAL ||
          resolvedEventType === CalendarEventType.VIVA ||
          resolvedEventType === CalendarEventType.TEST ||
          resolvedEventType === CalendarEventType.EXAM;

        if (params.classId && isActionable) {
          const taskCategory =
            resolvedEventType === CalendarEventType.PRACTICAL
              ? 'PRACTICAL'
              : resolvedEventType === CalendarEventType.VIVA
              ? 'VIVA'
              : resolvedEventType === CalendarEventType.TEST || resolvedEventType === CalendarEventType.EXAM
              ? 'TEST'
              : 'ASSIGNMENT';

          await prisma.studentTask.createMany({
            data: studentEnrollments.map((enr) => ({
              organizationId: params.organizationId,
              classId: params.classId!,
              subjectId: params.subjectId || null,
              studentId: enr.studentId,
              title: `${readableType}: ${event.title}`,
              description: event.description || `Upcoming ${readableType} scheduled on ${formattedDate}`,
              category: taskCategory as any,
              status: 'PENDING',
              assignedDate: new Date(),
              dueDate: new Date(params.endAt || params.startAt),
              assignedById: params.createdById,
            })),
          });
        }
      }
    } catch (notifErr) {
      console.error('[CALENDAR NOTIFICATION DISPATCH ERROR]', notifErr);
      // Non-blocking so event creation still succeeds
    }

    return event;
  }

  /**
   * Update an existing event
   */
  static async updateEvent(id: string, organizationId: string, data: Partial<CreateEventParams>) {
    const existing = await prisma.calendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new Error('Calendar event not found.');
    }

    const updateData: any = {};
    if (data.title) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.eventType) updateData.eventType = data.eventType;
    if (data.classId !== undefined) updateData.classId = data.classId || null;
    if (data.subjectId !== undefined) updateData.subjectId = data.subjectId || null;
    if (data.teacherId !== undefined) updateData.teacherId = data.teacherId || null;
    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.startAt) updateData.startAt = new Date(data.startAt);
    if (data.endAt) updateData.endAt = new Date(data.endAt);

    return prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        class: { select: { id: true, classCode: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, fullName: true } },
      },
    });
  }

  /**
   * Delete event
   */
  static async deleteEvent(id: string, organizationId: string) {
    const existing = await prisma.calendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new Error('Calendar event not found.');
    }

    return prisma.calendarEvent.delete({ where: { id } });
  }
}
