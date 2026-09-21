import 'dotenv/config';
import express from 'express';
import http from 'http';
import { applySecurityMiddleware } from './middleware/security.middleware';

import authRoutes from './controllers/auth.controller';
import organizationRoutes from './controllers/organization.controller';
import { createStaffRouter } from './controllers/staff.controller';
import testRoutes from './controllers/test.controller';
import candidateRoutes from './controllers/candidate.controller';
import invitationRoutes from './controllers/invitation.controller';
import otpRoutes from './controllers/otp.controller';
import examRoutes from './controllers/exam.controller';
import resultRoutes from './controllers/result.controller';
import emailRoutes from './controllers/email.controller';
import { academicRouter } from './controllers/academic.controller';
import calendarRoutes from './controllers/calendar.controller';
import csvRoutes from './controllers/csv.controller';
import taskRoutes from './controllers/task.controller';
import notificationRoutes from './controllers/notification.controller';

const app = express();
const server = http.createServer(app);

// Request body size limit
app.use(express.json({ limit: '512kb' }));

// Apply Helmet, CORS, and development rate-limiting
applySecurityMiddleware(app);

// Mount Teachers
const teacherRoutes = createStaffRouter('TEACHER');

// Mount clean REST API routes under both /api/v1 and /api
const routesMap: Record<string, express.Router> = {
  auth: authRoutes,
  organizations: organizationRoutes,
  teachers: teacherRoutes,
  tests: testRoutes,
  candidates: candidateRoutes,
  invitations: invitationRoutes,
  otp: otpRoutes,
  exams: examRoutes,
  results: resultRoutes,
  emails: emailRoutes,
  academic: academicRouter,
  calendar: calendarRoutes,
  csv: csvRoutes,
  tasks: taskRoutes,
  notifications: notificationRoutes,
};

for (const [prefix, router] of Object.entries(routesMap)) {
  app.use(`/api/v1/${prefix}`, router);
  app.use(`/api/${prefix}`, router);
}

// Health check
app.get(['/healthz', '/health', '/api/healthz', '/api/v1/health'], (_req, res) =>
  res.json({ status: 'ok', service: 'ExamForge Backend API' })
);

// Global Express error handler to prevent process termination
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[GLOBAL EXPRESS ERROR]', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

// Process-level crash guards
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION PREVENTED CRASH]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION PREVENTED CRASH] at:', promise, 'reason:', reason);
});

const PORT = Number(process.env.PORT || 5001);
server.listen(PORT, () => {
  console.log(`ExamForge backend listening on port ${PORT}`);
});
