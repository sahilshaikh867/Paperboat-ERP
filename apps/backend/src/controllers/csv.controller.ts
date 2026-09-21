import { Router, Response } from 'express';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth.middleware';
import { CSVImportService } from '../services/csv-import.service';
import { AuditService } from '../services/audit.service';

const router = Router();

// 1. GET /templates/:type - Download sample CSV template (Public / Auth)
router.get('/templates/:type', (req, res: Response) => {
  try {
    let { type } = req.params;
    if (type.endsWith('s') && type !== 'attendance') {
      type = type.slice(0, -1);
    }
    const { filename, content } = CSVImportService.getTemplate(type as any);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Template not found' });
  }
});

// Require auth & tenant for validate and commit
router.use(requireAuth, requireTenant);

// 2. POST /validate - Preview and validate uploaded dataset without saving
router.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const { type, rows, context } = req.body;

    if (!type || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'type and rows array are required' });
    }

    const validationResult = await CSVImportService.validate(type, rows, orgId, context);

    return res.json({
      success: true,
      ...validationResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Validation failed' });
  }
});

// 3. POST /commit - Transactional commit of validated rows
router.post('/commit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId!;
    const userId = req.user!.id;
    const { type, validRows, context } = req.body;

    if (!type || !Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({ error: 'Valid rows are required for import' });
    }

    const commitResult = await CSVImportService.commit(type, validRows, orgId, {
      ...context,
      authorId: userId,
    });

    await AuditService.log({
      userId,
      organizationId: orgId,
      action: `${String(type).toUpperCase()}_CSV_IMPORTED`,
      resourceType: type,
      metadata: { importedCount: commitResult.importedCount },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      ...commitResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Import commit failed' });
  }
});

export default router;
