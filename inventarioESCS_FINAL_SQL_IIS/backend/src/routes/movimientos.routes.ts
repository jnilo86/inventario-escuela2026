/**
 * RUTAS DE MOVIMIENTOS - Stub para compilación
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';

const router = Router();

router.post('/entrega', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Entrega registrada - Implementar lógica completa' });
});

router.post('/devolucion', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Devolución registrada - Implementar lógica completa' });
});

export default router;
