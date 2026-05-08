/**
 * ============================================================================
 * INVENTARIO ESCS - RUTAS DE AUTENTICACIÓN
 * Middleware de autenticación y autorización con JWT
 * Instituto Profesional Del Comercio Spa.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';

const router = Router();

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

interface UsuarioPayload {
  id_usuario: number;
  nombre_usuario: string;
  id_rol: number;
  nombre_rol: string;
}

interface JwtResponse {
  token: string;
  usuario: {
    id_usuario: number;
    nombre_usuario: string;
    nombre_completo: string;
    email: string;
    id_rol: number;
    nombre_rol: string;
  };
}

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================================================

/**
 * Middleware para verificar token JWT en las peticiones
 * Se debe usar en todas las rutas que requieran autenticación
 * 
 * @param req - Request object
 * @param res - Response object
 * @param next - Next middleware function
 */
export const authMiddleware = async (req: Request, res: Response, next: any): Promise<void> => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Token de acceso no proporcionado'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret_default';
    
    // Verificar token
    const decoded = jwt.verify(token, secret) as UsuarioPayload;
    
    // Agregar información del usuario al request
    (req as any).usuario = decoded;
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expirado',
        message: 'El token ha expirado, por favor inicie sesión nuevamente'
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Token inválido',
        message: 'El token proporcionado no es válido'
      });
    } else {
      res.status(500).json({
        error: 'Error de autenticación',
        message: error.message
      });
    }
  }
};

/**
 * Middleware para verificar permisos por rol
 * 
 * @param rolesPermitidos - Array de nombres de roles permitidos
 * 
 * @example
 * router.get('/admin', checkRoles(['Administrador']), handler);
 */
export const checkRoles = (...rolesPermitidos: string[]) => {
  return async (req: Request, res: Response, next: any): Promise<void> => {
    try {
      const usuario = (req as any).usuario;
      
      if (!usuario || !usuario.nombre_rol) {
        res.status(401).json({
          error: 'No autorizado',
          message: 'Usuario no autenticado'
        });
        return;
      }
      
      // Verificar si el rol del usuario está en los permitidos
      if (!rolesPermitidos.includes(usuario.nombre_rol)) {
        res.status(403).json({
          error: 'Prohibido',
          message: `Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`
        });
        return;
      }
      
      next();
    } catch (error: any) {
      res.status(500).json({
        error: 'Error de autorización',
        message: error.message
      });
    }
  };
};

// ============================================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================================

/**
 * POST /api/auth/login
 * Inicia sesión de usuario con credenciales
 * 
 * @body {string} nombre_usuario - Nombre de usuario
 * @body {string} password - Contraseña del usuario
 * 
 * @returns {Object} Token JWT y datos del usuario
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  
  try {
    const { nombre_usuario, password } = req.body;
    
    // Validar campos requeridos
    if (!nombre_usuario || !password) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Debe proporcionar nombre de usuario y contraseña'
      });
      return;
    }
    
    // Buscar usuario en la base de datos
    const result = await pool.request()
      .input('nombre_usuario', nombre_usuario)
      .query(`
        SELECT 
          u.id_usuario,
          u.nombre_usuario,
          u.password_hash,
          u.nombre_completo,
          u.email,
          u.activo,
          u.id_rol,
          r.nombre_rol,
          r.permisos
        FROM usuarios u
        INNER JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.nombre_usuario = @nombre_usuario
      `);
    
    if (result.recordset.length === 0) {
      res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos'
      });
      return;
    }
    
    const usuario = result.recordset[0];
    
    // Verificar si el usuario está activo
    if (!usuario.activo) {
      res.status(403).json({
        error: 'Usuario inactivo',
        message: 'Este usuario ha sido desactivado. Contacte al administrador.'
      });
      return;
    }
    
    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    
    if (!passwordValido) {
      res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos'
      });
      return;
    }
    
    // Actualizar último acceso
    await pool.request()
      .input('id_usuario', usuario.id_usuario)
      .query('UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id_usuario = @id_usuario');
    
    // Generar token JWT
    const secret = process.env.JWT_SECRET || 'secret_default';
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    
    const payload: UsuarioPayload = {
      id_usuario: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
      id_rol: usuario.id_rol,
      nombre_rol: usuario.nombre_rol
    };
    
    const token = jwt.sign(payload, secret, { expiresIn });
    
    // Registrar login en logs
    await pool.request()
      .input('id_usuario', usuario.id_usuario)
      .input('tipo_operacion', 'LOGIN')
      .input('descripcion', `Inicio de sesión exitoso: ${usuario.nombre_usuario}`)
      .query(`
        INSERT INTO logs (tipo_operacion, id_usuario, descripcion, fecha_operacion)
        VALUES (@tipo_operacion, @id_usuario, @descripcion, GETDATE())
      `);
    
    // Retornar respuesta
    const response: JwtResponse = {
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        id_rol: usuario.id_rol,
        nombre_rol: usuario.nombre_rol
      }
    };
    
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: response
    });
    
  } catch (error: any) {
    console.error('[ERROR LOGIN]', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/validar-token
 * Valida si un token JWT es válido y retorna información del usuario
 * 
 * @headers {string} Authorization - Bearer token
 * 
 * @returns {Object} Información del usuario
 */
router.post('/validar-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Token no proporcionado'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret_default';
    
    const decoded = jwt.verify(token, secret) as UsuarioPayload;
    
    // Verificar que el usuario siga activo en la base de datos
    const pool = getPool();
    const result = await pool.request()
      .input('id_usuario', decoded.id_usuario)
      .query(`
        SELECT 
          u.id_usuario,
          u.nombre_usuario,
          u.nombre_completo,
          u.email,
          u.activo,
          u.id_rol,
          r.nombre_rol
        FROM usuarios u
        INNER JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = @id_usuario
      `);
    
    if (result.recordset.length === 0 || !result.recordset[0].activo) {
      res.status(401).json({
        error: 'Token inválido',
        message: 'El usuario ya no está activo'
      });
      return;
    }
    
    const usuario = result.recordset[0];
    
    res.json({
      success: true,
      data: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        id_rol: usuario.id_rol,
        nombre_rol: usuario.nombre_rol
      }
    });
    
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expirado',
        message: 'El token ha expirado'
      });
    } else {
      res.status(401).json({
        error: 'Token inválido',
        message: error.message
      });
    }
  }
});

/**
 * POST /api/auth/cambiar-password
 * Cambia la contraseña del usuario autenticado
 * 
 * @headers {string} Authorization - Bearer token
 * @body {string} password_actual - Contraseña actual
 * @body {string} password_nuevo - Nueva contraseña
 * 
 * @returns {Object} Resultado de la operación
 */
router.post('/cambiar-password', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const usuario = (req as any).usuario;
  
  try {
    const { password_actual, password_nuevo } = req.body;
    
    if (!password_actual || !password_nuevo) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Debe proporcionar contraseña actual y nueva contraseña'
      });
      return;
    }
    
    // Validar longitud de nueva contraseña
    if (password_nuevo.length < 6) {
      res.status(400).json({
        error: 'Contraseña débil',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
      return;
    }
    
    // Obtener contraseña actual del usuario
    const result = await pool.request()
      .input('id_usuario', usuario.id_usuario)
      .query('SELECT password_hash FROM usuarios WHERE id_usuario = @id_usuario');
    
    if (result.recordset.length === 0) {
      res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe'
      });
      return;
    }
    
    // Verificar contraseña actual
    const passwordHash = result.recordset[0].password_hash;
    const passwordValido = await bcrypt.compare(password_actual, passwordHash);
    
    if (!passwordValido) {
      res.status(401).json({
        error: 'Contraseña incorrecta',
        message: 'La contraseña actual no es correcta'
      });
      return;
    }
    
    // Encriptar nueva contraseña
    const saltRounds = 10;
    const nuevoPasswordHash = await bcrypt.hash(password_nuevo, saltRounds);
    
    // Actualizar contraseña
    await pool.request()
      .input('id_usuario', usuario.id_usuario)
      .input('password_hash', nuevoPasswordHash)
      .query('UPDATE usuarios SET password_hash = @password_hash WHERE id_usuario = @id_usuario');
    
    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
    
  } catch (error: any) {
    console.error('[ERROR CAMBIAR PASSWORD]', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/perfil
 * Obtiene el perfil del usuario autenticado
 * 
 * @headers {string} Authorization - Bearer token
 * 
 * @returns {Object} Datos completos del usuario
 */
router.get('/perfil', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  const usuario = (req as any).usuario;
  
  try {
    const result = await pool.request()
      .input('id_usuario', usuario.id_usuario)
      .query(`
        SELECT 
          u.id_usuario,
          u.nombre_usuario,
          u.nombre_completo,
          u.email,
          u.activo,
          u.ultimo_acceso,
          u.fecha_creacion,
          u.id_rol,
          r.nombre_rol,
          r.descripcion as rol_descripcion,
          r.permisos
        FROM usuarios u
        INNER JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = @id_usuario
      `);
    
    if (result.recordset.length === 0) {
      res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe'
      });
      return;
    }
    
    const perfil = result.recordset[0];
    
    // Eliminar información sensible
    delete perfil.password_hash;
    
    res.json({
      success: true,
      data: perfil
    });
    
  } catch (error: any) {
    console.error('[ERROR PERFIL]', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: error.message
    });
  }
});

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;
