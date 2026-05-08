/**
 * RUTAS DE MOVIMIENTOS - ENTREGAS Y DEVOLUCIONES
 * Instituto Profesional Del Comercio Spa.
 * 
 * Este módulo maneja todas las operaciones relacionadas con:
 * - Entregas de activos (uno o múltiples)
 * - Devoluciones de activos
 * - Generación de actas oficiales
 * - Validación de estados de activos
 * - Registro de accesorios
 * 
 * REGLAS DE NEGOCIO CRÍTICAS:
 * 1. Solo activos "Disponibles" pueden ser entregados
 * 2. Solo activos asignados al RUT pueden ser devueltos
 * 3. Las entregas/devoluciones pueden incluir múltiples activos
 * 4. Se debe generar acta oficial para cada movimiento
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';
import { actasService } from '../services/actas.service';
import { ActivoEnActa, DatosGenerarActaEntrega } from '../../templates/actas/plantilla-entrega-oficial';

const router = Router();

/**
 * POST /api/movimientos/entrega
 * REGISTRA UNA ENTREGA DE ACTIVOS Y GENERA ACTA
 * 
 * Este endpoint permite registrar una entrega formal de uno o más activos
 * a un responsable institucional. Valida que todos los activos estén
 * disponibles antes de proceder.
 * 
 * BODY REQUEST:
 * {
 *   rutResponsable: string,        // RUT del responsable que recibe
 *   nombreResponsable: string,     // Nombre completo del responsable
 *   activosIds: number[],          // IDs de los activos a entregar
 *   accesorios?: string[],         // Accesorios opcionales (mouse, cargador, etc.)
 *   observaciones?: string,        // Observaciones adicionales
 *   ciudad?: string                // Ciudad donde se realiza la entrega
 * }
 * 
 * RESPONSE:
 * {
 *   success: boolean,
 *   message: string,
 *   movimientoId: number,
 *   ordenNumero: string,
 *   pdfUrl: string,
 *   activosActualizados: any[]
 * }
 */
router.post('/entrega', authMiddleware, async (req: Request, res: Response) => {
  const transaction = await pool.transaction();
  
  try {
    const {
      rutResponsable,
      nombreResponsable,
      activosIds,
      accesorios = [],
      observaciones = '',
      ciudad = 'Santiago de Chile'
    } = req.body;
    
    // VALIDACIONES INICIALES
    if (!rutResponsable || !nombreResponsable) {
      return res.status(400).json({
        success: false,
        message: 'El responsable debe tener RUT y nombre válidos.'
      });
    }
    
    if (!activosIds || !Array.isArray(activosIds) || activosIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un activo para entregar.'
      });
    }
    
    // OBTENER DATOS DEL USUARIO QUE ENTREGA (desde token JWT)
    const usuarioEntregador = req.usuario; // Inyectado por authMiddleware
    
    // VERIFICAR ESTADO DE TODOS LOS ACTIVOS
    const activosQuery = `
      SELECT 
        id_activo,
        eqp,
        tipo,
        marca,
        modelo,
        serial,
        imei,
        estado,
        descripcion
      FROM activos
      WHERE id_activo IN (${activosIds.map(() => '?').join(',')})
    `;
    
    const activosResult = await pool.query(activosQuery, activosIds);
    
    if (activosResult.recordset.length !== activosIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Uno o más activos no existen en la base de datos.'
      });
    }
    
    // VALIDAR QUE TODOS LOS ACTIVOS ESTÉN DISPONIBLES
    const activosNoDisponibles = activosResult.recordset.filter(
      (a: any) => a.estado !== 'Disponible'
    );
    
    if (activosNoDisponibles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden entregar activos que no están en estado "Disponible".',
        errores: activosNoDisponibles.map((a: any) => 
          `EQP ${a.eqp} (${a.tipo}) tiene estado "${a.estado}"`
        )
      });
    }
    
    // VERIFICAR QUE EL RESPONSABLE EXISTA O CREARLO
    let responsableId: number;
    const responsableCheck = await pool.query(
      'SELECT id_responsable FROM responsables WHERE rut = ?',
      [rutResponsable]
    );
    
    if (responsableCheck.recordset.length === 0) {
      // Crear responsable nuevo si no existe
      const insertResp = await pool.query(
        `INSERT INTO responsables (rut, nombre, estado, fecha_creacion)
         VALUES (?, ?, 'Activo', GETDATE())`,
        [rutResponsable, nombreResponsable]
      );
      responsableId = insertResp.recordset[0].id_responsable;
    } else {
      responsableId = responsableCheck.recordset[0].id_responsable;
      
      // Verificar que el responsable esté activo
      if (responsableCheck.recordset[0].estado !== 'Activo') {
        return res.status(400).json({
          success: false,
          message: 'El responsable está desactivado en el sistema.'
        });
      }
    }
    
    // GENERAR NÚMERO DE ORDEN ÚNICO
    const ordenNumero = `ENT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // REGISTRAR MOVIMIENTO PRINCIPAL
    const insertMovimiento = await pool.query(`
      INSERT INTO movimientos (
        tipo_movimiento,
        id_responsable,
        id_usuario,
        fecha_movimiento,
        orden_numero,
        estado,
        observaciones,
        ciudad
      ) VALUES (?, ?, ?, GETDATE(), ?, 'Completado', ?, ?)
    `, ['Entrega', responsableId, usuarioEntregador.id_usuario, ordenNumero, observaciones, ciudad]);
    
    const movimientoId = insertMovimiento.recordset[0].id_movimiento;
    
    // REGISTRAR CADA ACTIVO EN MOVIMIENTO_DETALLE
    const detalleInserts = [];
    for (const activo of activosResult.recordset) {
      await pool.query(`
        INSERT INTO movimiento_detalle (
          id_movimiento,
          id_activo,
          estado_anterior,
          estado_nuevo,
          fecha_asignacion
        ) VALUES (?, ?, ?, 'Asignado', GETDATE())
      `, [movimientoId, activo.id_activo, activo.estado]);
      
      // ACTUALIZAR ESTADO DEL ACTIVO A "ASIGNADO"
      await pool.query(`
        UPDATE activos SET estado = 'Asignado' WHERE id_activo = ?
      `, [activo.id_activo]);
      
      detalleInserts.push(activo);
    }
    
    // REGISTRAR ACCESORIOS SI EXISTEN
    if (accesorios.length > 0) {
      for (const accesorio of accesorios) {
        await pool.query(`
          INSERT INTO movimiento_accesorios (
            id_movimiento,
            nombre_accesorio,
            cantidad
          ) VALUES (?, ?, 1)
        `, [movimientoId, accesorio]);
      }
    }
    
    // CONFIRMAR TRANSACCIÓN
    await transaction.commit();
    
    // PREPARAR DATOS PARA GENERAR ACTA
    const datosActa: DatosGenerarActaEntrega = {
      movimientoId,
      rutResponsable,
      nombreResponsable,
      rutEntregador: usuarioEntregador.rut || '15.495.144-k',
      nombreEntregador: usuarioEntregador.nombre || 'Sebastian Olivos Toro',
      activosIds,
      accesorios: accesorios.length > 0 ? accesorios : undefined,
      observaciones: observaciones || undefined,
      ciudad: ciudad || undefined,
      ordenNumero
    };
    
    const activosParaActa: ActivoEnActa[] = activosResult.recordset.map((a: any) => ({
      eqp: a.eqp,
      dispositivo: a.tipo,
      marca: a.marca,
      modelo: a.modelo,
      serial: a.serial,
      imei: a.imei || 'No aplica',
      estado: 'Disponible' // Ya validamos que todos estaban disponibles
    }));
    
    // GENERAR ACTA OFICIAL PDF
    const resultadoActa = await actasService.generarActaEntrega(datosActa, activosParaActa);
    
    // ACTUALIZAR MOVIMIENTO CON RUTA DEL PDF
    if (resultadoActa.success && resultadoActa.pdfPath) {
      await pool.query(`
        UPDATE movimientos SET archivo_acta = ? WHERE id_movimiento = ?
      `, [resultadoActa.pdfPath, movimientoId]);
    }
    
    // REGISTRAR EN LOGS
    await pool.query(`
      INSERT INTO logs (
        id_usuario,
        accion,
        tabla_afectada,
        id_registro,
        descripcion,
        ip_origen
      ) VALUES (?, 'INSERT', 'movimientos', ?, 'Entrega registrada - Orden: ' + ?, ?)
    `, [usuarioEntregador.id_usuario, movimientoId, ordenNumero, req.ip || '']);
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: `Entrega registrada exitosamente. Orden N°${ordenNumero}`,
      movimientoId,
      ordenNumero,
      pdfUrl: resultadoActa.pdfUrl || `/api/actas/descargar/${ordenNumero}.pdf`,
      activosActualizados: activosResult.recordset,
      cantidadActivos: activosResult.recordset.length,
      accesoriosIncluidos: accesorios
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar entrega:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno al registrar la entrega.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/movimientos/devolucion
 * REGISTRA UNA DEVOLUCIÓN DE ACTIVOS Y GENERA ACTA
 * 
 * Este endpoint permite registrar la devolución formal de uno o más activos
 * que estaban asignados a un responsable. Valida que los activos pertenezcan
 * al responsable que los devuelve.
 * 
 * BODY REQUEST:
 * {
 *   rutResponsable: string,        // RUT del responsable que devuelve
 *   activosIds: number[],          // IDs de los activos a devolver
 *   estadosFinales: {              // Estado final para cada activo
 *     [id_activo]: string          // "Disponible", "Baja", "Robado reportado", etc.
 *   },
 *   observaciones?: string,        // Observaciones sobre la devolución
 *   receptorTI?: string            // Nombre del funcionario TI que recibe
 * }
 */
router.post('/devolucion', authMiddleware, async (req: Request, res: Response) => {
  const transaction = await pool.transaction();
  
  try {
    const {
      rutResponsable,
      activosIds,
      estadosFinales = {},
      observaciones = '',
      receptorTI = 'Sebastian Olivos Toro'
    } = req.body;
    
    // VALIDACIONES INICIALES
    if (!rutResponsable) {
      return res.status(400).json({
        success: false,
        message: 'El RUT del responsable es requerido.'
      });
    }
    
    if (!activosIds || !Array.isArray(activosIds) || activosIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un activo para devolver.'
      });
    }
    
    // OBTENER ID DEL RESPONSABLE
    const responsableResult = await pool.query(
      'SELECT id_responsable, nombre FROM responsables WHERE rut = ?',
      [rutResponsable]
    );
    
    if (responsableResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El responsable no existe en el sistema.'
      });
    }
    
    const responsableId = responsableResult.recordset[0].id_responsable;
    const nombreResponsable = responsableResult.recordset[0].nombre;
    
    // VERIFICAR QUE LOS ACTIVOS ESTÉN ASIGNADOS A ESTE RESPONSABLE
    const verificarAsignacionQuery = `
      SELECT 
        a.id_activo,
        a.eqp,
        a.tipo,
        a.marca,
        a.modelo,
        a.serial,
        a.estado,
        m.id_responsable,
        r.nombre as nombre_responsable
      FROM activos a
      INNER JOIN movimiento_detalle md ON a.id_activo = md.id_activo
      INNER JOIN movimientos m ON md.id_movimiento = m.id_movimiento
      INNER JOIN responsables r ON m.id_responsable = r.id_responsable
      WHERE a.id_activo IN (${activosIds.map(() => '?').join(',')})
        AND m.tipo_movimiento = 'Entrega'
        AND m.id_responsable = ?
        AND a.estado = 'Asignado'
      ORDER BY md.fecha_asignacion DESC
    `;
    
    const activosParams = [...activosIds, responsableId];
    const activosResult = await pool.query(verificarAsignacionQuery, activosParams);
    
    // VALIDAR QUE TODOS LOS ACTIVOS SEAN DEL RESPONSABLE
    if (activosResult.recordset.length !== activosIds.length) {
      const idsEncontrados = activosResult.recordset.map((a: any) => a.id_activo);
      const idsFaltantes = activosIds.filter(id => !idsEncontrados.includes(id));
      
      return res.status(400).json({
        success: false,
        message: 'Uno o más activos no están asignados a este responsable.',
        errores: idsFaltantes.map((id: number) => 
          `Activo ID ${id} no está asignado al RUT ${rutResponsable}`
        )
      });
    }
    
    // OBTENER DATOS DEL USUARIO QUE RECIBE (TI)
    const usuarioReceptor = req.usuario;
    
    // GENERAR NÚMERO DE ORDEN PARA DEVOLUCIÓN
    const ordenNumero = `DEV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // REGISTRAR MOVIMIENTO DE DEVOLUCIÓN
    const insertMovimiento = await pool.query(`
      INSERT INTO movimientos (
        tipo_movimiento,
        id_responsable,
        id_usuario,
        fecha_movimiento,
        orden_numero,
        estado,
        observaciones
      ) VALUES (?, ?, ?, GETDATE(), ?, 'Completado', ?)
    `, ['Devolucion', responsableId, usuarioReceptor.id_usuario, ordenNumero, observaciones]);
    
    const movimientoId = insertMovimiento.recordset[0].id_movimiento;
    
    // PROCESAR CADA ACTIVO DEVUELTO
    const activosDevueltos = [];
    for (const activo of activosResult.recordset) {
      const estadoFinal = estadosFinales[activo.id_activo] || 'Disponible';
      
      // Registrar en movimiento_detalle
      await pool.query(`
        INSERT INTO movimiento_detalle (
          id_movimiento,
          id_activo,
          estado_anterior,
          estado_nuevo,
          fecha_devolucion
        ) VALUES (?, ?, 'Asignado', ?, GETDATE())
      `, [movimientoId, activo.id_activo, estadoFinal]);
      
      // Actualizar estado del activo
      await pool.query(`
        UPDATE activos SET estado = ? WHERE id_activo = ?
      `, [estadoFinal, activo.id_activo]);
      
      activosDevueltos.push({
        ...activo,
        estadoFinal
      });
    }
    
    // CONFIRMAR TRANSACCIÓN
    await transaction.commit();
    
    // GENERAR ACTA DE DEVOLUCIÓN
    const datosActaDevolucion = {
      movimientoId,
      rutResponsable,
      nombreResponsable,
      nombreReceptorTI: receptorTI,
      rutReceptorTI: usuarioReceptor.rut || '15.495.144-k',
      observaciones,
      ciudad: 'Santiago de Chile'
    };
    
    const resultadoActa = await actasService.generarActaDevolucion(
      datosActaDevolucion,
      activosDevueltos
    );
    
    // ACTUALIZAR MOVIMIENTO CON RUTA DEL PDF
    if (resultadoActa.success && resultadoActa.pdfPath) {
      await pool.query(`
        UPDATE movimientos SET archivo_acta = ? WHERE id_movimiento = ?
      `, [resultadoActa.pdfPath, movimientoId]);
    }
    
    // REGISTRAR EN LOGS
    await pool.query(`
      INSERT INTO logs (
        id_usuario,
        accion,
        tabla_afectada,
        id_registro,
        descripcion
      ) VALUES (?, 'INSERT', 'movimientos', ?, 'Devolución registrada - Orden: ' + ?)
    `, [usuarioReceptor.id_usuario, movimientoId, ordenNumero]);
    
    res.json({
      success: true,
      message: `Devolución registrada exitosamente. Orden N°${ordenNumero}`,
      movimientoId,
      ordenNumero,
      pdfUrl: resultadoActa.pdfUrl || `/api/actas/descargar/${ordenNumero}.pdf`,
      activosDevueltos,
      cantidadActivos: activosDevueltos.length
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar devolución:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno al registrar la devolución.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/movimientos/historial/:rutResponsable
 * OBTIENE HISTORIAL COMPLETO DE MOVIMIENTOS DE UN RESPONSABLE
 * 
 * Retorna todas las entregas y devoluciones realizadas por un responsable.
 */
router.get('/historial/:rutResponsable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { rutResponsable } = req.params;
    
    const query = `
      SELECT 
        m.id_movimiento,
        m.tipo_movimiento,
        m.orden_numero,
        m.fecha_movimiento,
        m.estado,
        m.observaciones,
        m.archivo_acta,
        r.nombre as nombre_responsable,
        r.rut,
        u.nombre as nombre_usuario,
        STRING_AGG(a.tipo + ' - ' + a.marca + ' ' + a.modelo, ', ') as activos_involucrados,
        COUNT(a.id_activo) as cantidad_activos
      FROM movimientos m
      INNER JOIN responsables r ON m.id_responsable = r.id_responsable
      INNER JOIN usuarios u ON m.id_usuario = u.id_usuario
      LEFT JOIN movimiento_detalle md ON m.id_movimiento = md.id_movimiento
      LEFT JOIN activos a ON md.id_activo = a.id_activo
      WHERE r.rut = ?
      GROUP BY 
        m.id_movimiento,
        m.tipo_movimiento,
        m.orden_numero,
        m.fecha_movimiento,
        m.estado,
        m.observaciones,
        m.archivo_acta,
        r.nombre,
        r.rut,
        u.nombre
      ORDER BY m.fecha_movimiento DESC
    `;
    
    const result = await pool.query(query, [rutResponsable]);
    
    res.json({
      success: true,
      data: result.recordset,
      total: result.recordset.length
    });
    
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de movimientos.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/movimientos/activos-asignados/:rutResponsable
 * OBTIENE SOLO ACTIVOS ACTUALMENTE ASIGNADOS A UN RESPONSABLE
 * 
 * Este endpoint es crucial para el módulo de devoluciones,
 * ya que solo muestra activos que pueden ser devueltos.
 */
router.get('/activos-asignados/:rutResponsable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { rutResponsable } = req.params;
    
    const query = `
      SELECT DISTINCT
        a.id_activo,
        a.eqp,
        a.tipo,
        a.marca,
        a.modelo,
        a.serial,
        a.imei,
        a.estado,
        a.descripcion,
        m.orden_numero as orden_entrega,
        m.fecha_movimiento as fecha_asignacion
      FROM activos a
      INNER JOIN movimiento_detalle md ON a.id_activo = md.id_activo
      INNER JOIN movimientos m ON md.id_movimiento = m.id_movimiento
      INNER JOIN responsables r ON m.id_responsable = r.id_responsable
      WHERE r.rut = ?
        AND m.tipo_movimiento = 'Entrega'
        AND a.estado = 'Asignado'
        AND NOT EXISTS (
          SELECT 1 FROM movimiento_detalle md2
          INNER JOIN movimientos m2 ON md2.id_movimiento = m2.id_movimiento
          WHERE md2.id_activo = a.id_activo
            AND m2.tipo_movimiento = 'Devolucion'
            AND m2.fecha_movimiento > m.fecha_movimiento
        )
      ORDER BY a.tipo, a.marca
    `;
    
    const result = await pool.query(query, [rutResponsable]);
    
    res.json({
      success: true,
      data: result.recordset,
      total: result.recordset.length
    });
    
  } catch (error) {
    console.error('Error al obtener activos asignados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener activos asignados.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
