/**
 * RUTAS DE GESTIÓN DE CÓDIGOS QR INSTITUCIONALES
 * 
 * Módulo completo para generación y gestión de códigos QR
 * para identificación patrimonial de activos.
 * 
 * FUNCIONALIDADES:
 * - Generar QR individual o masivo
 * - Seleccionar tamaño de pegatina
 * - Ver historial de QR generados
 * - Obtener lista de tamaños disponibles
 * - Reimpresión de QR
 * 
 * REGLA CRÍTICA:
 * Los QR NO se generan automáticamente al crear activos.
 * Solo se generan cuando usuario elige "Imprimir plantilla".
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';
import { getPool } from '../config/database';
import { QRService, createQRService, SolicitudGenerarQR } from '../services/qr.service';

const router = Router();

// Instancia del servicio (se crea por request para usar pool actual)
function getQRService(): QRService {
  return createQRService(getPool());
}

/**
 * POST /api/qr/generar-masivo
 * Genera códigos QR para múltiples activos seleccionados
 * 
 * BODY REQUEST:
 * {
 *   "activosIds": [1, 2, 3],           // IDs de activos a procesar (1 o más)
 *   "tamanoId": 2,                     // ID de tamaño (1-6), opcional
 *   "incluirURL": false,               // Si incluye URL institucional
 *   "urlBase": "https://sistema.instituto.cl",
 *   "formatoSalida": "png",            // png, svg, pdf
 *   "observaciones": "Impresión inicial"
 * }
 * 
 * RESPONSE:
 * {
 *   "exito": true,
 *   "mensaje": "Se generaron exitosamente 3 código(s) QR",
 *   "totalProcesados": 3,
 *   "totalExitosos": 3,
 *   "totalFallidos": 0,
 *   "resultados": [
 *     {
 *       "activoId": 1,
 *       "eqp": "EQP-2024-00123",
 *       "exito": true,
 *       "qrPath": "/uploads/qr/QR_EQP-2024-00123_2025-01-15T10-30-00.png",
 *       "qrDataUrl": "data:image/png;base64,...",
 *       "tamanio": { "nombre": "Mediana (30x30mm)", ... }
 *     }
 *   ],
 *   "fechaGeneracion": "2025-01-15T10:30:00.000Z",
 *   "usuarioResponsable": "Usuario_5"
 * }
 */
router.post('/generar-masivo', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      activosIds, 
      tamanoId, 
      incluirURL = false, 
      urlBase, 
      formatoSalida = 'png',
      observaciones 
    } = req.body;

    // Validaciones básicas
    if (!activosIds || !Array.isArray(activosIds) || activosIds.length === 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Debe proporcionar al menos un ID de activo en el array "activosIds"'
      });
    }

    // Obtener ID de usuario desde token (inyectado por authMiddleware)
    const usuarioId = req.usuario?.id || 1; // TODO: Usar usuario real del token

    // Crear solicitud
    const solicitud: SolicitudGenerarQR = {
      activosIds,
      tamanoId,
      incluirURL,
      urlBase,
      formatoSalida,
      observaciones
    };

    // Ejecutar generación masiva
    const qrService = getQRService();
    const resultado = await qrService.generarQRMasivo(solicitud, usuarioId, false);

    // Retornar resultado
    res.json(resultado);

  } catch (error) {
    console.error('[QR Routes] Error generando QR masivo:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno al generar códigos QR',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/qr/generar/:activoId
 * Genera QR individual para un solo activo
 * Método conveniente para casos de un solo activo
 * 
 * PARAMS:
 * - activoId: ID del activo a procesar
 * 
 * QUERY (opcional):
 * - tamanoId: ID de tamaño de pegatina (1-6)
 * - formato: formato de salida (png, svg, pdf)
 */
router.post('/generar/:activoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const activoId = parseInt(req.params.activoId);
    const { tamanoId, formato = 'png' } = req.query;

    if (isNaN(activoId) || activoId <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de activo inválido'
      });
    }

    const usuarioId = req.usuario?.id || 1;
    const qrService = getQRService();

    const resultado = await qrService.generarQRIndividual(
      activoId,
      usuarioId,
      tamanoId ? parseInt(tamanoId as string) : undefined,
      formato as 'png' | 'svg' | 'pdf'
    );

    res.json({
      exito: resultado.exito,
      resultado
    });

  } catch (error) {
    console.error('[QR Routes] Error generando QR individual:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al generar código QR',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/qr/historial/:activoId
 * Obtiene historial completo de QR generados para un activo
 * Útil para auditoría y control de reimpresiones
 */
router.get('/historial/:activoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const activoId = parseInt(req.params.activoId);

    if (isNaN(activoId) || activoId <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de activo inválido'
      });
    }

    const qrService = getQRService();
    const historial = await qrService.obtenerHistorialQR(activoId);

    res.json({
      exito: true,
      activoId,
      totalRegistros: historial.length,
      historial
    });

  } catch (error) {
    console.error('[QR Routes] Error obteniendo historial:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener historial de QR',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/qr/tamanos-disponibles
 * Obtiene lista de tamaños de pegatina disponibles
 * Para mostrar en interfaz de selección
 */
router.get('/tamanos-disponibles', authMiddleware, async (req: Request, res: Response) => {
  try {
    const qrService = getQRService();
    const tamanos = qrService.obtenerTamanosDisponibles();

    res.json({
      exito: true,
      total: tamanos.length,
      tamanos
    });

  } catch (error) {
    console.error('[QR Routes] Error obteniendo tamaños:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener tamaños disponibles',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/qr/reimprimir/:activoId
 * Genera QR de reimpresión para un activo
 * Registra como reimpresión en historial para auditoría
 */
router.post('/reimprimir/:activoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const activoId = parseInt(req.params.activoId);
    const { tamanoId, formato = 'png', observaciones } = req.body;

    if (isNaN(activoId) || activoId <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de activo inválido'
      });
    }

    const usuarioId = req.usuario?.id || 1;
    const qrService = getQRService();

    const solicitud: SolicitudGenerarQR = {
      activosIds: [activoId],
      tamanoId,
      formatoSalida: formato as 'png' | 'svg' | 'pdf',
      observaciones: observaciones || 'Reimpresión de QR'
    };

    const resultado = await qrService.generarQRMasivo(solicitud, usuarioId, true);

    res.json({
      exito: resultado.exito,
      mensaje: 'QR reimprimido exitosamente',
      resultado: resultado.resultados[0]
    });

  } catch (error) {
    console.error('[QR Routes] Error reimprimiendo QR:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al reimprimir código QR',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
