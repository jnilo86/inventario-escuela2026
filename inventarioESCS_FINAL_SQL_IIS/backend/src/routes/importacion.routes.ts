/**
 * RUTAS DE IMPORTACIÓN CSV - Stub para compilación
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';

const router = Router();

router.post('/csv', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, message: 'CSV importado - Implementar con csv-parser' });
});

export default router;
