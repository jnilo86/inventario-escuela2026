/**
 * ============================================================================
 * INVENTARIO ESCS - RUTAS DE ACTIVOS
 * CRUD completo para gestión de activos tecnológicos
 * Instituto Profesional Del Comercio Spa.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.routes';
import { getPool } from '../config/database';

const router = Router();

// ============================================================================
// OBTENER TODOS LOS ACTIVOS (CON PAGINACIÓN Y FILTROS)
// ============================================================================

/**
 * GET /api/activos
 * Obtiene lista de activos con paginación y filtros opcionales
 * 
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Registros por página (default: 25)
 * @query {string} estado - Filtrar por estado
 * @query {string} tipo_activo - Filtrar por tipo
 * @query {string} busqueda - Búsqueda en eqp, serial, marca, modelo
 * @query {string} orden - Campo de ordenamiento
 * @query {string} direccion - Dirección de orden (ASC/DESC)
 * 
 * @returns {Object} Lista de activos con metadatos de paginación
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const offset = (page - 1) * limit;
    
    // Filtros opcionales
    const estado = req.query.estado as string;
    const tipoActivo = req.query.tipo_activo as string;
    const busqueda = req.query.busqueda as string;
    
    // Ordenamiento
    const orden = req.query.orden as string || 'fecha_creacion';
    const direccion = (req.query.direccion as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Construir consulta dinámica con filtros
    let whereClause = 'WHERE 1=1';
    const params: Record<string, any> = {};
    
    if (estado) {
      whereClause += ' AND estado = @estado';
      params.estado = estado;
    }
    
    if (tipoActivo) {
      whereClause += ' AND tipo_activo = @tipo_activo';
      params.tipo_activo = tipoActivo;
    }
    
    if (busqueda) {
      whereClause += ' AND (eqp LIKE @busqueda OR serial LIKE @busqueda OR marca LIKE @busqueda OR modelo LIKE @busqueda)';
      params.busqueda = `%${busqueda}%`;
    }
    
    // Consulta principal con paginación
    const query = `
      SELECT 
        a.id_activo,
        a.eqp,
        a.serial,
        a.tipo_activo,
        a.marca,
        a.modelo,
        a.imei,
        a.estado,
        a.ubicacion,
        a.fecha_adquisicion,
        a.valor_adquisicion,
        a.proveedor,
        a.garantia_hasta,
        a.qr_generado,
        a.fecha_ultimo_movimiento,
        a.observaciones,
        a.fecha_creacion,
        a.fecha_modificacion,
        u.nombre_completo as creado_por_nombre,
        r.nombre_completo as responsable_actual,
        r.rut as responsable_rut
      FROM activos a
      LEFT JOIN usuarios u ON a.creado_por = u.id_usuario
      LEFT JOIN (
        SELECT 
          a2.id_activo,
          r.nombre_completo,
          r.rut,
          ROW_NUMBER() OVER (PARTITION BY a2.id_activo ORDER BY m.fecha_movimiento DESC) as rn
        FROM activos a2
        INNER JOIN movimiento_detalle md ON a2.id_activo = md.id_activo
        INNER JOIN movimientos m ON md.id_movimiento = m.id_movimiento
        INNER JOIN responsables r ON m.id_responsable = r.id_responsable
        WHERE m.tipo_movimiento = 'Entrega' AND a2.estado = 'Asignado'
      ) sub ON a.id_activo = sub.id_activo AND sub.rn = 1
      LEFT JOIN responsables r ON sub.id_activo = a.id_activo
      ${whereClause}
      ORDER BY ${orden} ${direccion}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    // Agregar parámetros de paginación
    params.offset = offset;
    params.limit = limit;
    
    const request = pool.request();
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.query(query);
    
    // Obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM activos
      ${whereClause.replace('WHERE 1=1', 'WHERE 1=1')}
    `;
    
    const countRequest = pool.request();
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'offset' && key !== 'limit') {
        countRequest.input(key, value);
      }
    });
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    res.json({
      success: true,
      data: {
        activos: result.recordset,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total
        }
      }
    });
    
  } catch (error: any) {
    console.error('[ERROR GET ACTIVOS]', error);
    res.status(500).json({
      error: 'Error al obtener activos',
      message: error.message
    });
  }
});

// ============================================================================
// OBTENER ACTIVO POR ID
// ============================================================================

/**
 * GET /api/activos/:id
 * Obtiene un activo específico por su ID
 * 
 * @param {number} id - ID del activo
 * 
 * @returns {Object} Datos completos del activo
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const idActivo = parseInt(req.params.id, 10);
  
  try {
    const result = await pool.request()
      .input('id_activo', idActivo)
      .query(`
        SELECT 
          a.*,
          u.nombre_completo as creado_por_nombre,
          ult_mov.numero_acta as ultima_acta,
          ult_mov.fecha_movimiento as fecha_ultima_asignacion,
          resp.nombre_completo as responsable_actual,
          resp.rut as responsable_rut,
          resp.area as responsable_area
        FROM activos a
        LEFT JOIN usuarios u ON a.creado_por = u.id_usuario
        LEFT JOIN (
          SELECT 
            md.id_activo,
            m.numero_acta,
            m.fecha_movimiento,
            m.id_responsable,
            ROW_NUMBER() OVER (PARTITION BY md.id_activo ORDER BY m.fecha_movimiento DESC) as rn
          FROM movimiento_detalle md
          INNER JOIN movimientos m ON md.id_movimiento = m.id_movimiento
          WHERE m.tipo_movimiento = 'Entrega'
        ) ult_mov ON a.id_activo = ult_mov.id_activo AND ult_mov.rn = 1
        LEFT JOIN responsables resp ON ult_mov.id_responsable = resp.id_responsable
        WHERE a.id_activo = @id_activo
      `);
    
    if (result.recordset.length === 0) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'El activo solicitado no existe'
      });
      return;
    }
    
    // Obtener historial de movimientos del activo
    const movimientosResult = await pool.request()
      .input('id_activo', idActivo)
      .query(`
        SELECT TOP 10
          m.id_movimiento,
          m.tipo_movimiento,
          m.numero_acta,
          m.fecha_movimiento,
          m.ciudad,
          m.observaciones,
          r.nombre_completo as responsable,
          u.nombre_completo as usuario_registro
        FROM movimientos m
        INNER JOIN movimiento_detalle md ON m.id_movimiento = md.id_movimiento
        LEFT JOIN responsables r ON m.id_responsable = r.id_responsable
        LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
        WHERE md.id_activo = @id_activo
        ORDER BY m.fecha_movimiento DESC
      `);
    
    // Obtener mantenciones del activo
    const mantencionesResult = await pool.request()
      .input('id_activo', idActivo)
      .query(`
        SELECT TOP 5
          id_mantencion,
          tipo_mantencion,
          fecha_ingreso,
          fecha_salida,
          proveedor,
          tecnico_responsable,
          descripcion_falla,
          trabajo_realizado,
          costo
        FROM mantenciones
        WHERE id_activo = @id_activo
        ORDER BY fecha_ingreso DESC
      `);
    
    res.json({
      success: true,
      data: {
        activo: result.recordset[0],
        historial: {
          movimientos: movimientosResult.recordset,
          mantenciones: mantencionesResult.recordset
        }
      }
    });
    
  } catch (error: any) {
    console.error('[ERROR GET ACTIVO BY ID]', error);
    res.status(500).json({
      error: 'Error al obtener el activo',
      message: error.message
    });
  }
});

// ============================================================================
// CREAR NUEVO ACTIVO
// ============================================================================

/**
 * POST /api/activos
 * Crea un nuevo activo tecnológico
 * 
 * @body {string} eqp - Código EQP (debe ser único)
 * @body {string} serial - Número de serie
 * @body {string} tipo_activo - Tipo de activo
 * @body {string} marca - Marca del equipo
 * @body {string} modelo - Modelo del equipo
 * @body {string} [imei] - IMEI (opcional)
 * @body {string} [especificaciones] - Especificaciones técnicas
 * @body {string} [ubicacion] - Ubicación física
 * @body {date} [fecha_adquisicion] - Fecha de compra
 * @body {number} [valor_adquisicion] - Valor de compra
 * @body {string} [proveedor] - Proveedor
 * @body {date} [garantia_hasta] - Fin de garantía
 * @body {string} [observaciones] - Observaciones
 * 
 * @returns {Object} Activo creado
 */
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const usuario = (req as any).usuario;
  
  try {
    const {
      eqp,
      serial,
      tipo_activo,
      marca,
      modelo,
      imei,
      especificaciones,
      ubicacion,
      fecha_adquisicion,
      valor_adquisicion,
      proveedor,
      garantia_hasta,
      observaciones
    } = req.body;
    
    // Validar campos requeridos
    if (!eqp || !serial || !tipo_activo) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Los campos EQP, Serial y Tipo de activo son obligatorios'
      });
      return;
    }
    
    // Verificar que el EQP no exista
    const eqpExistente = await pool.request()
      .input('eqp', eqp)
      .query('SELECT id_activo FROM activos WHERE eqp = @eqp');
    
    if (eqpExistente.recordset.length > 0) {
      res.status(409).json({
        error: 'Duplicado',
        message: 'Ya existe un activo con este código EQP'
      });
      return;
    }
    
    // Verificar que el serial no exista
    const serialExistente = await pool.request()
      .input('serial', serial)
      .query('SELECT id_activo FROM activos WHERE serial = @serial');
    
    if (serialExistente.recordset.length > 0) {
      res.status(409).json({
        error: 'Duplicado',
        message: 'Ya existe un activo con este número de serial'
      });
      return;
    }
    
    // Insertar nuevo activo
    const result = await pool.request()
      .input('eqp', eqp)
      .input('serial', serial)
      .input('tipo_activo', tipo_activo)
      .input('marca', marca || null)
      .input('modelo', modelo || null)
      .input('imei', imei || null)
      .input('especificaciones', especificaciones || null)
      .input('ubicacion', ubicacion || null)
      .input('fecha_adquisicion', fecha_adquisicion || null)
      .input('valor_adquisicion', valor_adquisicion || null)
      .input('proveedor', proveedor || null)
      .input('garantia_hasta', garantia_hasta || null)
      .input('observaciones', observaciones || null)
      .input('creado_por', usuario.id_usuario)
      .query(`
        INSERT INTO activos (
          eqp, serial, tipo_activo, marca, modelo, imei, especificaciones,
          ubicacion, fecha_adquisicion, valor_adquisicion, proveedor,
          garantia_hasta, observaciones, creado_por, fecha_creacion
        )
        OUTPUT INSERTED.*
        VALUES (
          @eqp, @serial, @tipo_activo, @marca, @modelo, @imei, @especificaciones,
          @ubicacion, @fecha_adquisicion, @valor_adquisicion, @proveedor,
          @garantia_hasta, @observaciones, @creado_por, GETDATE()
        )
      `);
    
    // Registrar en logs
    await pool.request()
      .input('id_usuario', usuario.id_usuario)
      .input('tipo_operacion', 'INSERT')
      .input('tabla_afectada', 'activos')
      .input('id_registro_afectado', result.recordset[0].id_activo)
      .input('descripcion', `Creación de activo: ${eqp}`)
      .query(`
        INSERT INTO logs (id_usuario, tipo_operacion, tabla_afectada, id_registro_afectado, descripcion, fecha_operacion)
        VALUES (@id_usuario, @tipo_operacion, @tabla_afectada, @id_registro_afectado, @descripcion, GETDATE())
      `);
    
    res.status(201).json({
      success: true,
      message: 'Activo creado exitosamente',
      data: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('[ERROR CREATE ACTIVO]', error);
    res.status(500).json({
      error: 'Error al crear el activo',
      message: error.message
    });
  }
});

// ============================================================================
// ACTUALIZAR ACTIVO
// ============================================================================

/**
 * PUT /api/activos/:id
 * Actualiza un activo existente
 * 
 * @param {number} id - ID del activo
 * @body {string} [eqp] - Código EQP
 * @body {string} [serial] - Número de serie
 * @body {string} [tipo_activo] - Tipo de activo
 * @body {string} [marca] - Marca
 * @body {string} [modelo] - Modelo
 * @body {string} [estado] - Estado del activo
 * @body {string} [ubicacion] - Ubicación
 * @body {string} [observaciones] - Observaciones
 * 
 * @returns {Object} Activo actualizado
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const usuario = (req as any).usuario;
  const idActivo = parseInt(req.params.id, 10);
  
  try {
    // Verificar que el activo existe
    const activoExistente = await pool.request()
      .input('id_activo', idActivo)
      .query('SELECT * FROM activos WHERE id_activo = @id_activo');
    
    if (activoExistente.recordset.length === 0) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'El activo no existe'
      });
      return;
    }
    
    const activoActual = activoExistente.recordset[0];
    const {
      eqp,
      serial,
      tipo_activo,
      marca,
      modelo,
      estado,
      ubicacion,
      observaciones
    } = req.body;
    
    // Si cambia EQP o serial, verificar que no estén duplicados
    if (eqp && eqp !== activoActual.eqp) {
      const eqpExistente = await pool.request()
        .input('eqp', eqp)
        .query('SELECT id_activo FROM activos WHERE eqp = @eqp AND id_activo != @id_activo', {
          id_activo: { value: idActivo, type: pool.Int }
        });
      
      if (eqpExistente.recordset.length > 0) {
        res.status(409).json({
          error: 'Duplicado',
          message: 'Ya existe otro activo con este código EQP'
        });
        return;
      }
    }
    
    // Construir actualización dinámica
    const updateFields: string[] = [];
    const params: Record<string, any> = { id_activo: idActivo };
    
    if (eqp !== undefined) { updateFields.push('eqp = @eqp'); params.eqp = eqp; }
    if (serial !== undefined) { updateFields.push('serial = @serial'); params.serial = serial; }
    if (tipo_activo !== undefined) { updateFields.push('tipo_activo = @tipo_activo'); params.tipo_activo = tipo_activo; }
    if (marca !== undefined) { updateFields.push('marca = @marca'); params.marca = marca; }
    if (modelo !== undefined) { updateFields.push('modelo = @modelo'); params.modelo = modelo; }
    if (estado !== undefined) { updateFields.push('estado = @estado'); params.estado = estado; }
    if (ubicacion !== undefined) { updateFields.push('ubicacion = @ubicacion'); params.ubicacion = ubicacion; }
    if (observaciones !== undefined) { updateFields.push('observaciones = @observaciones'); params.observaciones = observaciones; }
    
    updateFields.push('fecha_modificacion = GETDATE()');
    
    const request = pool.request();
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const query = `
      UPDATE activos
      SET ${updateFields.join(', ')}
      WHERE id_activo = @id_activo
      
      SELECT * FROM activos WHERE id_activo = @id_activo
    `;
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      message: 'Activo actualizado exitosamente',
      data: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('[ERROR UPDATE ACTIVO]', error);
    res.status(500).json({
      error: 'Error al actualizar el activo',
      message: error.message
    });
  }
});

// ============================================================================
// ELIMINAR ACTIVO (SOLO LÓGICO - CAMBIA ESTADO)
// ============================================================================

/**
 * DELETE /api/activos/:id
 * Elimina lógicamente un activo (cambia estado a "Baja")
 * 
 * @param {number} id - ID del activo
 * 
 * @returns {Object} Resultado de la operación
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const usuario = (req as any).usuario;
  const idActivo = parseInt(req.params.id, 10);
  
  try {
    // Verificar que el activo existe
    const activoExistente = await pool.request()
      .input('id_activo', idActivo)
      .query('SELECT * FROM activos WHERE id_activo = @id_activo');
    
    if (activoExistente.recordset.length === 0) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'El activo no existe'
      });
      return;
    }
    
    // Cambiar estado a "Baja" en lugar de eliminar físicamente
    await pool.request()
      .input('id_activo', idActivo)
      .input('id_usuario', usuario.id_usuario)
      .query(`
        UPDATE activos
        SET estado = 'Baja',
            fecha_modificacion = GETDATE()
        WHERE id_activo = @id_activo
      `);
    
    res.json({
      success: true,
      message: 'Activo dado de baja exitosamente'
    });
    
  } catch (error: any) {
    console.error('[ERROR DELETE ACTIVO]', error);
    res.status(500).json({
      error: 'Error al eliminar el activo',
      message: error.message
    });
  }
});

// ============================================================================
// VALIDAR DISPONIBILIDAD DE ACTIVO PARA ENTREGA
// ============================================================================

/**
 * GET /api/activos/:id/disponible
 * Valida si un activo está disponible para entrega
 * 
 * @param {number} id - ID del activo
 * 
 * @returns {Object} Estado de disponibilidad
 */
router.get('/:id/disponible', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const idActivo = parseInt(req.params.id, 10);
  
  try {
    const result = await pool.request()
      .input('id_activo', idActivo)
      .query(`
        SELECT 
          id_activo,
          eqp,
          serial,
          estado,
          CASE WHEN estado = 'Disponible' THEN 1 ELSE 0 END as disponible
        FROM activos
        WHERE id_activo = @id_activo
      `);
    
    if (result.recordset.length === 0) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'El activo no existe'
      });
      return;
    }
    
    const activo = result.recordset[0];
    
    res.json({
      success: true,
      data: {
        id_activo: activo.id_activo,
        eqp: activo.eqp,
        serial: activo.serial,
        estado: activo.estado,
        disponible: activo.disponible === 1,
        mensaje: activo.disponible ? 'Activo disponible para entrega' : `Activo no disponible (estado: ${activo.estado})`
      }
    });
    
  } catch (error: any) {
    console.error('[ERROR VALIDAR DISPONIBILIDAD]', error);
    res.status(500).json({
      error: 'Error al validar disponibilidad',
      message: error.message
    });
  }
});

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;
