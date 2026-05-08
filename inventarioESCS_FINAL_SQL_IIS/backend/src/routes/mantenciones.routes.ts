/**
 * RUTAS DE MANTENCIONES - Stub para compilación
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

export default router;
