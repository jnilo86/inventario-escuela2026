/**
 * RUTAS DE RESPONSABLES - Stub para compilación
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';
import { getPool } from '../config/database';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'Ruta de responsables - Implementar CRUD completo' });
});

export default router;
