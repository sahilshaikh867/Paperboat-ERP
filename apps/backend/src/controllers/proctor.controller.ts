import { Router } from 'express';

// Placeholder for future proctoring & integrity monitoring (Phase 2 extension)
const router = Router();

router.post('/', async (_req, res) => {
  res.json({ status: 'Proctoring monitoring disabled in MVP' });
});

export default router;
