import { Request, Response } from 'express';
import { analyzeFormStructure } from '../services/form-structure-analyzer.service';

/**
 * POST /api/form-structure  (Sprint 4)
 *
 * Body: { url: string }
 * Returns: FormStructure — panels + orphan fields with full semantic metadata.
 */
export async function formStructureController(req: Request, res: Response): Promise<void> {
  const { url } = req.body as { url?: unknown };

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A valid "url" string is required.' });
    return;
  }

  try {
    const structure = await analyzeFormStructure(url);
    res.json(structure);
  } catch (err: unknown) {
    console.error('[form-structure] Error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
