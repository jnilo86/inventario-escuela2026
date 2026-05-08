/**
 * MIDDLEWARE DE AUTENTICACIÓN JWT
 * Instituto Profesional Del Comercio Spa.
 * 
 * Este middleware verifica que las solicitudes a rutas protegidas
 * incluyan un token JWT válido emitido por el sistema.
 * 
 * USO:
 * - Se aplica a todas las rutas que requieren autenticación
 * - Extrae información del usuario desde el token
 * - Inyecta datos del usuario en req.usuario para uso en controllers
 * 
 * REQUIERE:
 * npm install jsonwebtoken bcryptjs
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * INTERFAZ PARA DATOS DEL USUARIO EN EL TOKEN
 */
export interface UsuarioToken {
  id_usuario: number;
  rut: string;
  nombre: string;
  email: string;
  id_rol: number;
  rol_nombre: string;
  iat?: number;
  exp?: number;
}

/**
 * INTERFAZ PARA REQUEST CON USUARIO AUTENTICADO
 */
export interface RequestWithUsuario extends Request {
  usuario?: UsuarioToken;
}

/**
 * CLAVE SECRETA PARA JWT
 * 
 * IMPORTANTE: En producción, esta clave debe estar en variables de entorno
 * y ser única por instalación. Nunca commitear claves reales al repositorio.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'inventario-eschs-secret-key-2025-change-in-production';

/**
 * MIDDLEWARE DE AUTENTICACIÓN
 * 
 * Verifica que el request incluya un header Authorization válido
 * con formato: "Bearer <token>"
 * 
 * Si el token es válido, extrae la información del usuario y la
 * inyecta en req.usuario para uso en los controladores.
 * 
 * Si el token es inválido o expirado, retorna error 401.
 */
export const authMiddleware = (req: RequestWithUsuario, res: Response, next: NextFunction): void => {
  try {
    // Obtener header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación.'
      });
      return;
    }
    
    // Verificar formato "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer <token>'
      });
      return;
    }
    
    const [scheme, token] = parts;
    
    if (scheme !== 'Bearer') {
      res.status(401).json({
        success: false,
        message: 'Esquema de autenticación inválido. Use: Bearer <token>'
      });
      return;
    }
    
    // Verificar token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as UsuarioToken;
    
    // Inyectar usuario en el request
    req.usuario = decoded;
    
    // Continuar con la siguiente función middleware o ruta
    next();
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor inicie sesión nuevamente.'
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
      return;
    }
    
    console.error('Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno en autenticación.'
    });
  }
};

/**
 * MIDDLEWARE DE AUTORIZACIÓN POR ROL
 * 
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * 
 * @param rolesPermitidos - Lista de nombres de roles que pueden acceder
 * 
 * EJEMPLO DE USO:
 * ```typescript
 * router.post('/admin-only',
 *   authMiddleware,
 *   checkRoles(['Administrador']),
 *   async (req, res) => { ... }
 * );
 * 
 * router.get('/ti-staff',
 *   authMiddleware,
 *   checkRoles(['Administrador', 'Supervisor TI', 'Técnico TI']),
 *   async (req, res) => { ... }
 * );
 * ```
 */
export const checkRoles = (...rolesPermitidos: string[]) => {
  return (req: RequestWithUsuario, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado.'
      });
      return;
    }
    
    const usuarioRol = req.usuario.rol_nombre;
    
    if (!rolesPermitidos.includes(usuarioRol)) {
      res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`,
        rolRequerido: rolesPermitidos,
        rolUsuario: usuarioRol
      });
      return;
    }
    
    next();
  };
};

/**
 * GENERAR TOKEN JWT PARA USUARIO
 * 
 * Esta función crea un token JWT válido para un usuario autenticado.
 * Se usa después de validar credenciales en el login.
 * 
 * @param usuario - Datos completos del usuario incluyendo rol
 * @returns Token JWT como string
 * 
 * DURACIÓN DEL TOKEN:
 * - Por defecto: 8 horas (28800 segundos)
 * - Ajustable según política de seguridad institucional
 */
export const generarToken = (usuario: any): string => {
  const payload = {
    id_usuario: usuario.id_usuario,
    rut: usuario.rut,
    nombre: usuario.nombre,
    email: usuario.email,
    id_rol: usuario.id_rol,
    rol_nombre: usuario.rol_nombre
  };
  
  // Duración del token: 8 horas (ajustable)
  const expiresIn = process.env.JWT_EXPIRATION || '8h';
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * OBTENER DATOS DEL USUARIO DESDE TOKEN
 * 
 * Función utilitaria para decodificar un token sin verificarlo.
 * Útil para casos donde se necesita información del usuario
 * pero la verificación se hace por otros medios.
 * 
 * @param token - Token JWT a decodificar
 * @returns Datos del usuario o null si inválido
 */
export const obtenerDatosToken = (token: string): UsuarioToken | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as UsuarioToken;
  } catch (error) {
    return null;
  }
};
