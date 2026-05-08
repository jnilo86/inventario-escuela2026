/**
 * RUTAS DE REPORTES - Stub para compilación
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';

const router = Router();

router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, data: { totalActivos: 0, totalResponsables: 0 } });
});

export default router;
