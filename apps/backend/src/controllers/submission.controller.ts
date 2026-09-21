import { Router } from 'express';

// Submissions are handled directly in exam.controller.ts for standardized scoring
const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Use /api/v1/exams/:testId/submit for exam submission' });
});

export default router;
