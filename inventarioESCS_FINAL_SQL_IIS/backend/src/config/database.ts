/**
 * ============================================================================
 * INVENTARIO ESCS - CONFIGURACIÓN DE BASE DE DATOS
 * Conexión a SQL Server usando el driver mssql
 * Instituto Profesional Del Comercio Spa.
 * ============================================================================
 * 
 * Este módulo configura y gestiona la conexión a la base de datos SQL Server.
 * Utiliza un pool de conexiones para mejor rendimiento y maneja reconexiones
 * automáticas en caso de fallos.
 * 
 * @module database
 */

import sql, { ConnectionPool, ConnectionOptions } from 'mssql';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// ============================================================================
// CONFIGURACIÓN DE CONEXIÓN
// ============================================================================

/**
 * Configuración del pool de conexiones a SQL Server
 * Los valores se obtienen desde las variables de entorno
 */
const dbConfig: ConnectionOptions = {
  server: process.env.SQL_SERVER || 'localhost',
  port: parseInt(process.env.SQL_PORT || '1433', 10),
  database: process.env.SQL_DATABASE || 'InventarioESCS',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || '',
  trustServerCertificate: process.env.SQL_TRUST_CERTIFICATE === 'true',
  
  // Configuración del pool de conexiones
  pool: {
    max: 10,                    // Máximo de conexiones simultáneas
    min: 2,                     // Mínimo de conexiones mantenidas
    idleTimeoutMillis: 30000,   // Tiempo máximo de inactividad (30s)
    acquireTimeoutMillis: 5000, // Tiempo máximo para obtener conexión (5s)
    createTimeoutMillis: 5000,  // Tiempo máximo para crear conexión (5s)
    destroyTimeoutMillis: 5000, // Tiempo máximo para destruir conexión (5s)
    evictRunIntervalMillis: 30000 // Verificar conexiones cada 30s
  },
  
  // Opciones adicionales
  options: {
    encrypt: false, // Cambiar a true en producción con SSL
    enableArithAbort: true,
    trustServerCertificate: process.env.SQL_TRUST_CERTIFICATE === 'true'
  }
};

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

/**
 * Pool de conexiones global
 * Se inicializa una sola vez y se reutiliza en toda la aplicación
 */
let pool: ConnectionPool | null = null;

/**
 * Estado de la conexión
 * Indica si la base de datos está conectada actualmente
 */
let isConnected: boolean = false;

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Inicializa la conexión a la base de datos
 * Crea el pool de conexiones y verifica la conectividad
 * 
 * @returns Promise<void> - Resuelve si la conexión es exitosa
 * @throws Error - Si falla la conexión
 * 
 * @example
 * await initializeDatabase();
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('📦 Conectando a SQL Server...');
    console.log(`   Servidor: ${dbConfig.server}:${dbConfig.port}`);
    console.log(`   Base de datos: ${dbConfig.database}`);
    
    // Crear nuevo pool de conexiones
    pool = await sql.connect(dbConfig);
    isConnected = true;
    
    // Verificar conexión con consulta simple
    const result = await pool.request().query('SELECT @@VERSION as version');
    const version = result.recordset[0]?.version || 'Desconocida';
    
    console.log('✅ Conexión establecida exitosamente');
    console.log(`   SQL Server versión: ${version.substring(0, 100)}...`);
    
  } catch (error: any) {
    isConnected = false;
    console.error('❌ Error al conectar con SQL Server:', error.message);
    console.error('   Verifique:');
    console.error('   1. Que SQL Server esté ejecutándose');
    console.error('   2. Que las credenciales en .env sean correctas');
    console.error('   3. Que la base de datos InventarioESCS exista');
    console.error('   4. Que el usuario tenga permisos adecuados');
    throw new Error(`No se pudo conectar a la base de datos: ${error.message}`);
  }
}

/**
 * Obtiene el pool de conexiones actual
 * Lanza error si no hay conexión establecida
 * 
 * @returns ConnectionPool - Pool de conexiones activo
 * @throws Error - Si no hay conexión establecida
 * 
 * @example
 * const pool = getPool();
 * const result = await pool.request().query('SELECT * FROM activos');
 */
export function getPool(): ConnectionPool {
  if (!pool || !isConnected) {
    throw new Error('No hay conexión activa a la base de datos. Llame a initializeDatabase() primero.');
  }
  return pool;
}

/**
 * Verifica el estado actual de la conexión
 * 
 * @returns boolean - True si está conectado, False en caso contrario
 * 
 * @example
 * if (isConnected()) {
 *   console.log('Base de datos disponible');
 * }
 */
export function isConnected(): boolean {
  return isConnected;
}

/**
 * Cierra la conexión a la base de datos
 * Libera todos los recursos del pool
 * 
 * @returns Promise<void> - Resuelve cuando la conexión se cierra
 * 
 * @example
 * await closeDatabase();
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      isConnected = false;
      console.log('🔒 Conexión a base de datos cerrada');
    }
  } catch (error: any) {
    console.error('Error al cerrar la conexión:', error.message);
    throw error;
  }
}

/**
 * Reconecta automáticamente si la conexión se perdió
 * Útil para manejar caídas temporales del servidor
 * 
 * @returns Promise<boolean> - True si se reconectó, False si ya estaba conectado
 * 
 * @example
 * await reconnectIfNeeded();
 */
export async function reconnectIfNeeded(): Promise<boolean> {
  if (isConnected && pool) {
    try {
      // Verificar que la conexión sigue activa
      await pool.request().query('SELECT 1');
      return false; // Ya estaba conectado
    } catch (error) {
      console.warn('⚠️ Conexión perdida, intentando reconectar...');
      isConnected = false;
    }
  }
  
  try {
    await initializeDatabase();
    return true; // Se reconectó exitosamente
  } catch (error) {
    console.error('❌ No se pudo reconectar a la base de datos');
    throw error;
  }
}

/**
 * Ejecuta una transacción en la base de datos
 * Garantiza atomicidad en operaciones críticas
 * 
 * @param callback - Función asíncrona que recibe un transaction object
 * @returns Promise<T> - Resultado de la transacción
 * 
 * @example
 * const result = await withTransaction(async (transaction) => {
 *   await transaction.request().query('INSERT INTO ...');
 *   await transaction.request().query('UPDATE ...');
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  callback: (transaction: any) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('No hay conexión a la base de datos');
  }
  
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error('Transacción fallida, rollback realizado:', error);
    throw error;
  }
}

// ============================================================================
// UTILIDADES PARA CONSULTAS
// ============================================================================

/**
 * Ejecuta una consulta SQL parametrizada
 * Previene inyección SQL usando parámetros
 * 
 * @param query - Consulta SQL con parámetros (@nombre)
 * @param params - Objeto con los parámetros
 * @returns Promise<any> - Resultados de la consulta
 * 
 * @example
 * const result = await executeQuery(
 *   'SELECT * FROM activos WHERE estado = @estado',
 *   { estado: 'Disponible' }
 * );
 */
export async function executeQuery(
  query: string,
  params: Record<string, any> = {}
): Promise<any> {
  const connectionPool = getPool();
  const request = connectionPool.request();
  
  // Agregar parámetros
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  const result = await request.query(query);
  return result.recordset;
}

/**
 * Ejecuta un procedimiento almacenado
 * 
 * @param procedure - Nombre del procedimiento almacenado
 * @param params - Parámetros para el procedimiento
 * @returns Promise<any> - Resultados del procedimiento
 * 
 * @example
 * const result = await executeProcedure(
 *   'sp_buscar_activos_por_responsable',
 *   { rut_responsable: '12345678-9' }
 * );
 */
export async function executeProcedure(
  procedure: string,
  params: Record<string, any> = {}
): Promise<any> {
  const connectionPool = getPool();
  const request = connectionPool.request();
  
  // Agregar parámetros
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  const result = await request.execute(procedure);
  return result.recordset;
}

// ============================================================================
// EVENTOS DEL POOL
// ============================================================================

/**
 * Configura listeners para eventos del pool de conexiones
 * Permite monitorear el estado y rendimiento
 */
export function setupPoolListeners(): void {
  if (!pool) return;
  
  pool.on('error', (err) => {
    console.error('❌ Error en pool de conexiones:', err);
    isConnected = false;
  });
  
  console.log('👂 Listeners del pool configurados');
}

// ============================================================================
// EXPORTAR MÓDULO SQL
// ============================================================================

// Exportar el módulo sql para usar tipos y utilidades
export { sql };

// Exportar por defecto funciones principales
export default {
  initializeDatabase,
  getPool,
  isConnected,
  closeDatabase,
  reconnectIfNeeded,
  withTransaction,
  executeQuery,
  executeProcedure,
  setupPoolListeners,
  sql
};
