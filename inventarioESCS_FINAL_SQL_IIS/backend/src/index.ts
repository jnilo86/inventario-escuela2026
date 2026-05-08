/**
 * ============================================================================
 * INVENTARIO ESCS - PUNTO DE ENTRADA PRINCIPAL
 * Backend API - Node.js + Express + TypeScript
 * Instituto Profesional Del Comercio Spa.
 * ============================================================================
 * 
 * Este archivo es el punto de entrada principal de la aplicación backend.
 * Configura y lanza el servidor Express con todos los middlewares, rutas
 * y configuraciones necesarias para el funcionamiento del sistema.
 * 
 * @module index
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Importar configuración de base de datos
import { initializeDatabase } from './config/database';

// Importar rutas de la API
import authRoutes from './routes/auth.routes';
import activosRoutes from './routes/activos.routes';
import responsablesRoutes from './routes/responsables.routes';
import movimientosRoutes from './routes/movimientos.routes';
import mantencionesRoutes from './routes/mantenciones.routes';
import qrRoutes from './routes/qr.routes';
import reportesRoutes from './routes/reportes.routes';
import configuracionRoutes from './routes/configuracion.routes';
import importacionRoutes from './routes/importacion.routes';
import alertasRoutes from './routes/alertas.routes';

// Cargar variables de entorno desde archivo .env
dotenv.config();

// ============================================================================
// CONFIGURACIÓN PRINCIPAL
// ============================================================================

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV: string = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARES GLOBALES
// ============================================================================

/**
 * Helmet - Configuración de cabeceras HTTP seguras
 * Protege contra vulnerabilidades web comunes
 */
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para desarrollo, habilitar en producción
  crossOriginEmbedderPolicy: false
}));

/**
 * CORS - Configuración de Cross-Origin Resource Sharing
 * Permite que el frontend se comunique con el backend desde diferentes dominios
 */
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Compression - Compresión gzip de respuestas
 * Reduce el tamaño de las respuestas HTTP para mejorar rendimiento
 */
app.use(compression());

/**
 * Body Parser - Parseo de cuerpos de petición JSON
 * Permite recibir datos JSON en las peticiones POST/PUT/PATCH
 */
app.use(express.json({ limit: '10mb' }));

/**
 * URL Encoded Parser - Parseo de formularios HTML
 * Permite recibir datos de formularios HTML tradicionales
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Rate Limiting - Límite de peticiones por IP
 * Previene ataques de fuerza bruta y abuso del servicio
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 peticiones por ventana
  message: 'Demasiadas peticiones desde esta IP, intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/**
 * Servir archivos estáticos para uploads
 * Permite acceder a archivos subidos (firmas, actas, QR) vía HTTP
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// ============================================================================
// RUTAS DE LA API
// ============================================================================

/**
 * Ruta de health check - Verifica que el servidor esté funcionando
 * @route GET /api/health
 * @returns {Object} Estado del servidor
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Servidor Inventario ESCS funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

/**
 * Ruta raíz de la API - Información general
 * @route GET /api/
 * @returns {Object} Información de la API
 */
app.get('/api/', (req: Request, res: Response) => {
  res.json({
    name: 'Inventario ESCS API',
    description: 'Sistema de Gestión Patrimonial TI',
    institution: 'Instituto Profesional Del Comercio Spa.',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      activos: '/api/activos',
      responsables: '/api/responsables',
      movimientos: '/api/movimientos',
      mantenciones: '/api/mantenciones',
      qr: '/api/qr',
      reportes: '/api/reportes',
      configuracion: '/api/configuracion',
      importacion: '/api/importacion',
      alertas: '/api/alertas'
    }
  });
});

/**
 * Registro de rutas de la API
 * Cada módulo tiene su propio router definido en archivos separados
 */
app.use('/api/auth', authRoutes);
app.use('/api/activos', activosRoutes);
app.use('/api/responsables', responsablesRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/mantenciones', mantencionesRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/importacion', importacionRoutes);
app.use('/api/alertas', alertasRoutes);

// ============================================================================
// MANEJO DE ERRORES 404
// ============================================================================

/**
 * Middleware para manejar rutas no encontradas (404)
 * Se ejecuta cuando ninguna ruta coincide con la petición
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'No encontrado',
    message: `La ruta ${req.originalUrl} no existe en esta API`,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MANEJO GLOBAL DE ERRORES
// ============================================================================

/**
 * Middleware global para manejo de errores
 * Captura cualquier error no manejado en la aplicación
 */
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[ERROR GLOBAL]', err.stack || err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    error: 'Error del servidor',
    message: NODE_ENV === 'development' ? message : 'Error interno del servidor',
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================================================

/**
 * Función asíncrona para iniciar el servidor
 * 1. Conecta a la base de datos
 * 2. Inicia el servidor HTTP
 */
async function startServer(): Promise<void> {
  try {
    // Intentar conectar a la base de datos
    console.log('📦 Iniciando conexión a SQL Server...');
    await initializeDatabase();
    console.log('✅ Conexión a base de datos establecida exitosamente');
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║     INVENTARIO ESCS - SISTEMA DE GESTIÓN PATRIMONIAL    ║');
      console.log('║          Instituto Profesional Del Comercio Spa.         ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log(``);
      console.log(`🚀 Servidor corriendo en puerto: ${PORT}`);
      console.log(`🌍 Entorno: ${NODE_ENV}`);
      console.log(`📡 API disponible en: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📂 Archivos estáticos: http://localhost:${PORT}/uploads`);
      console.log(``);
      console.log(`⏰ Fecha de inicio: ${new Date().toLocaleString('es-CL')}`);
      console.log(`═══════════════════════════════════════════════════════════`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    console.error('El servidor no pudo iniciarse. Revise la configuración y la base de datos.');
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();

// Exportar la aplicación para testing
export default app;
