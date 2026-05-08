/**
 * RUTAS DE QR - Stub para compilación
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';

const router = Router();

router.post('/generar', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, message: 'QR generado - Implementar con qrcode library' });
});

export default router;
