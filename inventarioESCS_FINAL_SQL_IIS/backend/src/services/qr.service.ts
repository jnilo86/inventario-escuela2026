/**
 * SERVICIO DE GENERACIÓN DE CÓDIGOS QR INSTITUCIONALES
 * 
 * Módulo completo para generación, gestión e impresión de códigos QR
 * para identificación patrimonial de activos tecnológicos.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Genera QR con información crítica: EQP, Serial, Modelo, Tipo
 * - Soporta generación individual y masiva
 * - Plantillas personalizables por tamaño de pegatina
 * - Historial completo de QR generados
 * - URLs institucionales o datos embebidos
 * - Formatos de impresión: A4, etiquetas adhesivas, tarjetas
 * 
 * REGLA CRÍTICA:
 * Los QR NO se generan automáticamente al crear activos.
 * Solo se generan cuando el usuario selecciona "Imprimir plantilla".
 * 
 * @author Sistema Inventario ESCS
 * @version 1.0.0
 */

import { Pool } from 'mssql';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

/**
 * Información básica de un activo para generar QR
 */
export interface InfoActivoQR {
  id: number;
  eqp: string;           // Código EQP institucional (ej: EQP-2024-00123)
  serial: string;        // Número de serie del fabricante
  modelo: string;        // Modelo del equipo
  tipo: string;          // Tipo de activo (Notebook, Monitor, etc.)
  marca: string;         // Marca del equipo
  estado: string;        // Estado actual
}

/**
 * Configuración de tamaño de pegatina QR
 * Valores en milímetros para impresión profesional
 */
export interface TamanoPegatina {
  nombre: string;        // Nombre descriptivo (ej: "Pequeña 20x20mm")
  ancho_mm: number;      // Ancho en milímetros
  alto_mm: number;       // Alto en milímetros
  dpi: number;           // DPI para impresión (recomendado 300)
  margen_mm: number;     // Margen blanco alrededor del QR
}

/**
 * Datos para solicitud de generación de QR
 */
export interface SolicitudGenerarQR {
  activosIds: number[];              // IDs de activos a procesar
  tamanoId?: number;                 // ID de tamaño de pegatina (opcional)
  incluirURL?: boolean;              // Si true, incluye URL institucional
  urlBase?: string;                  // URL base del sistema (si aplica)
  formatoSalida: 'png' | 'svg' | 'pdf'; // Formato de archivo a generar
  observaciones?: string;            // Observaciones opcionales
}

/**
 * Resultado de generación de QR individual
 */
export interface ResultadoQRIndividual {
  activoId: number;
  eqp: string;
  exito: boolean;
  qrPath?: string;                 // Ruta del archivo generado
  qrDataUrl?: string;              // Data URL para vista previa
  error?: string;                  // Mensaje de error si falló
  tamanio: TamanoPegatina;
}

/**
 * Respuesta completa de generación masiva de QR
 */
export interface RespuestaGeneracionMasivaQR {
  exito: boolean;
  mensaje: string;
  totalProcesados: number;
  totalExitosos: number;
  totalFallidos: number;
  resultados: ResultadoQRIndividual[];
  paqueteDescarga?: string;        // Ruta a ZIP con todos los QR
  fechaGeneracion: string;
  usuarioResponsable: string;
}

/**
 * Registro histórico de QR generado (para BD)
 */
export interface RegistroHistorialQR {
  id_historial: number;
  activo_id: number;
  eqp: string;
  fecha_generacion: Date;
  usuario_id: number;
  tamano_nombre: string;
  formato_salida: string;
  ruta_archivo: string;
  observaciones?: string;
  reimpresion: boolean;            // True si es reimpresión
}

// ============================================================================
// TAMAÑOS DE PEGATINAS PREDEFINIDOS
// ============================================================================

/**
 * Catálogo de tamaños de pegatina disponibles
 * El usuario puede seleccionar según necesidad física
 */
export const TAMANOS_PEGATINA: TamanoPegatina[] = [
  {
    nombre: 'Pequeña (20x20mm)',
    ancho_mm: 20,
    alto_mm: 20,
    dpi: 300,
    margen_mm: 2
  },
  {
    nombre: 'Mediana (30x30mm)',
    ancho_mm: 30,
    alto_mm: 30,
    dpi: 300,
    margen_mm: 3
  },
  {
    nombre: 'Grande (40x40mm)',
    ancho_mm: 40,
    alto_mm: 40,
    dpi: 300,
    margen_mm: 4
  },
  {
    nombre: 'Rectangular Pequeña (40x25mm)',
    ancho_mm: 40,
    alto_mm: 25,
    dpi: 300,
    margen_mm: 3
  },
  {
    nombre: 'Rectangular Mediana (60x40mm)',
    ancho_mm: 60,
    alto_mm: 40,
    dpi: 300,
    margen_mm: 4
  },
  {
    nombre: 'Etiqueta A4 Completa (210x297mm)',
    ancho_mm: 210,
    alto_mm: 297,
    dpi: 300,
    margen_mm: 10
  }
];

// ============================================================================
// CLASE PRINCIPAL DEL SERVICIO
// ============================================================================

/**
 * Servicio de Gestión de Códigos QR Institucionales
 * 
 * Responsable de:
 * - Obtener información de activos desde SQL Server
 * - Generar códigos QR con datos institucionales
 * - Guardar archivos en directorio uploads/qr/
 * - Registrar historial en tabla qr_historial
 * - Empaquetar múltiples QR para descarga masiva
 */
export class QRService {
  private pool: Pool;
  private uploadsDir: string;

  /**
   * Constructor del servicio
   * @param pool - Pool de conexiones a SQL Server
   */
  constructor(pool: Pool) {
    this.pool = pool;
    // Directorio base para almacenar QR generados
    this.uploadsDir = path.join(process.cwd(), '..', 'uploads', 'qr');
    
    // Asegurar que el directorio existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PRINCIPALES
  // ============================================================================

  /**
   * Genera códigos QR para uno o más activos seleccionados
   * 
   * FLUJO DEL PROCESO:
   * 1. Valida que existan los activos solicitados
   * 2. Obtiene información completa de cada activo (EQP, serial, modelo, tipo)
   * 3. Genera código QR individual para cada activo
   * 4. Guarda archivos PNG/SVG en directorio uploads/qr/
   * 5. Registra cada generación en tabla qr_historial
   * 6. Retorna resultados individuales y opción de paquete ZIP
   * 
   * @param solicitud - Parámetros de generación
   * @param usuarioId - ID del usuario que solicita la generación
   * @param esReimpresion - Indica si es reimpresión (default: false)
   * @returns Promesa con resultados completos de la generación
   */
  async generarQRMasivo(
    solicitud: SolicitudGenerarQR,
    usuarioId: number,
    esReimpresion: boolean = false
  ): Promise<RespuestaGeneracionMasivaQR> {
    const resultados: ResultadoQRIndividual[] = [];
    let totalExitosos = 0;
    let totalFallidos = 0;

    console.log(`[QR Service] Iniciando generación masiva para ${solicitud.activosIds.length} activos`);
    console.log(`[QR Service] Usuario: ${usuarioId}, Reimpresión: ${esReimpresion}`);

    // Validar que haya activos para procesar
    if (!solicitud.activosIds || solicitud.activosIds.length === 0) {
      return {
        exito: false,
        mensaje: 'No se proporcionaron IDs de activos para generar QR',
        totalProcesados: 0,
        totalExitosos: 0,
        totalFallidos: 0,
        resultados: [],
        fechaGeneracion: new Date().toISOString(),
        usuarioResponsable: `Usuario_${usuarioId}`
      };
    }

    // Determinar tamaño de pegatina a usar
    const tamanoSeleccionado = this.obtenerTamanoPegatina(solicitud.tamanoId);

    // Procesar cada activo individualmente
    for (const activoId of solicitud.activosIds) {
      try {
        // Paso 1: Obtener información del activo desde SQL Server
        const infoActivo = await this.obtenerInfoActivo(activoId);
        
        if (!infoActivo) {
          throw new Error(`Activo ID ${activoId} no encontrado en base de datos`);
        }

        // Paso 2: Generar contenido del QR (datos a codificar)
        const contenidoQR = this.generarContenidoQR(infoActivo, solicitud.incluirURL, solicitud.urlBase);

        // Paso 3: Generar archivo QR físico
        const resultadoGeneracion = await this.generarArchivoQR(
          infoActivo,
          contenidoQR,
          tamanoSeleccionado,
          solicitud.formatoSalida
        );

        // Paso 4: Registrar en historial de QR
        await this.registrarEnHistorial({
          activo_id: activoId,
          eqp: infoActivo.eqp,
          usuario_id: usuarioId,
          tamano_nombre: tamanoSeleccionado.nombre,
          formato_salida: solicitud.formatoSalida,
          ruta_archivo: resultadoGeneracion.rutaRelativa,
          observaciones: solicitud.observaciones,
          reimpresion: esReimpresion
        });

        // Agregar resultado exitoso
        resultados.push({
          activoId: activoId,
          eqp: infoActivo.eqp,
          exito: true,
          qrPath: resultadoGeneracion.rutaAbsoluta,
          qrDataUrl: resultadoGeneracion.dataUrl,
          tamanio: tamanoSeleccionado
        });
        totalExitosos++;

        console.log(`[QR Service] QR generado exitosamente para EQP: ${infoActivo.eqp}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`[QR Service] Error generando QR para activo ${activoId}:`, errorMessage);

        // Agregar resultado fallido
        resultados.push({
          activoId: activoId,
          eqp: 'Desconocido',
          exito: false,
          error: errorMessage,
          tamanio: tamanoSeleccionado
        });
        totalFallidos++;
      }
    }

    // Construir respuesta final
    const respuesta: RespuestaGeneracionMasivaQR = {
      exito: totalExitosos > 0,
      mensaje: this.generarMensajeResumen(totalExitosos, totalFallidos),
      totalProcesados: solicitud.activosIds.length,
      totalExitosos,
      totalFallidos,
      resultados,
      fechaGeneracion: new Date().toISOString(),
      usuarioResponsable: `Usuario_${usuarioId}`
    };

    // TODO: Implementar creación de paquete ZIP si hay múltiples exitosos
    // if (totalExitosos > 1) {
    //   respuesta.paqueteDescarga = await this.crearPaqueteZIP(resultados);
    // }

    return respuesta;
  }

  /**
   * Genera QR individual para un solo activo
   * Método conveniente para casos de un solo activo
   */
  async generarQRIndividual(
    activoId: number,
    usuarioId: number,
    tamanoId?: number,
    formatoSalida: 'png' | 'svg' | 'pdf' = 'png'
  ): Promise<ResultadoQRIndividual> {
    const solicitud: SolicitudGenerarQR = {
      activosIds: [activoId],
      tamanoId,
      formatoSalida
    };

    const resultadoMasivo = await this.generarQRMasivo(solicitud, usuarioId);
    
    if (resultadoMasivo.resultados.length === 0) {
      throw new Error('No se generó ningún resultado');
    }

    return resultadoMasivo.resultados[0];
  }

  /**
   * Obtiene historial completo de QR generados para un activo
   * Útil para auditoría y reimpresiones
   */
  async obtenerHistorialQR(activoId: number): Promise<RegistroHistorialQR[]> {
    try {
      const request = this.pool.request();
      request.input('activo_id', activoId);

      const result = await request.query(`
        SELECT 
          id_historial,
          activo_id,
          eqp,
          fecha_generacion,
          usuario_id,
          tamano_nombre,
          formato_salida,
          ruta_archivo,
          observaciones,
          reimpresion
        FROM qr_historial
        WHERE activo_id = @activo_id
        ORDER BY fecha_generacion DESC
      `);

      return result.recordset;
    } catch (error) {
      console.error('[QR Service] Error obteniendo historial:', error);
      throw new Error('No se pudo obtener el historial de QR');
    }
  }

  /**
   * Obtiene lista de tamaños de pegatina disponibles
   * Para mostrar en interfaz de usuario
   */
  obtenerTamanosDisponibles(): TamanoPegatina[] {
    return TAMANOS_PEGATINA;
  }

  // ============================================================================
  // MÉTODOS PRIVADOS DE SOPORTE
  // ============================================================================

  /**
   * Obtiene información completa de un activo desde SQL Server
   * Campos requeridos: EQP, Serial, Modelo, Tipo, Marca, Estado
   */
  private async obtenerInfoActivo(activoId: number): Promise<InfoActivoQR | null> {
    try {
      const request = this.pool.request();
      request.input('activo_id', activoId);

      const query = `
        SELECT 
          a.id,
          a.eqp,
          a.serial,
          a.modelo,
          ta.nombre AS tipo,
          m.nombre AS marca,
          e.nombre AS estado
        FROM activos a
        INNER JOIN tipos_activos ta ON a.tipo_id = ta.id
        INNER JOIN marcas m ON a.marca_id = m.id
        INNER JOIN estados_activos e ON a.estado_id = e.id
        WHERE a.id = @activo_id
      `;

      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];
      return {
        id: row.id,
        eqp: row.eqp || 'S/EQP',
        serial: row.serial || 'S/Serial',
        modelo: row.modelo || 'Sin modelo',
        tipo: row.tipo || 'Genérico',
        marca: row.marca || 'Sin marca',
        estado: row.estado || 'Desconocido'
      };
    } catch (error) {
      console.error('[QR Service] Error obteniendo info activo:', error);
      throw new Error('No se pudo obtener información del activo');
    }
  }

  /**
   * Genera el contenido textual que irá codificado en el QR
   * 
   * OPCIONES DE CONTENIDO:
   * 1. Solo datos (default): EQP, Serial, Modelo, Tipo
   * 2. Con URL: URL completa al detalle del activo en el sistema
   * 
   * FORMATO DE DATOS:
   * Texto plano estructurado fácil de leer con scanner QR
   */
  private generarContenidoQR(
    info: InfoActivoQR,
    incluirURL?: boolean,
    urlBase?: string
  ): string {
    if (incluirURL && urlBase) {
      // Opción con URL institucional
      const urlActivo = `${urlBase}/activos/detalle/${info.id}`;
      return `${urlActivo}\nEQP: ${info.eqp}\nSerial: ${info.serial}\nModelo: ${info.modelo}\nTipo: ${info.tipo}`;
    }

    // Opción solo datos (recomendada para impresión)
    return `EQUIPO: ${info.tipo}\nMARCA: ${info.marca}\nMODELO: ${info.modelo}\nSERIAL: ${info.serial}\nEQP: ${info.eqp}\nINSTITUTO PROFESIONAL DEL COMERCIO SPA.`;
  }

  /**
   * Genera archivo físico del código QR
   * Soporta PNG, SVG y prepara estructura para PDF
   */
  private async generarArchivoQR(
    info: InfoActivoQR,
    contenido: string,
    tamano: TamanoPegatina,
    formato: 'png' | 'svg' | 'pdf'
  ): Promise<{ rutaAbsoluta: string; rutaRelativa: string; dataUrl: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const nombreArchivo = `QR_${info.eqp}_${timestamp}`;
    
    let rutaArchivo: string;
    let dataUrl: string;

    if (formato === 'svg') {
      // Generar SVG
      rutaArchivo = path.join(this.uploadsDir, `${nombreArchivo}.svg`);
      dataUrl = await QRCode.toString(contenido, {
        type: 'svg',
        width: tamano.ancho_mm * (tamano.dpi / 25.4), // Convertir mm a píxeles
        margin: tamano.margen_mm,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      fs.writeFileSync(rutaArchivo, dataUrl);
    } else {
      // Generar PNG (default)
      const extension = formato === 'pdf' ? 'png' : formato; // PDF usa PNG como base temporalmente
      rutaArchivo = path.join(this.uploadsDir, `${nombreArchivo}.${extension}`);
      
      dataUrl = await QRCode.toDataURL(contenido, {
        width: tamano.ancho_mm * (tamano.dpi / 25.4),
        margin: tamano.margen_mm,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M' // Nivel medio de corrección de errores
      });

      // Guardar PNG
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(rutaArchivo, base64Data, 'base64');
    }

    // Construir rutas relativas y absolutas
    const rutaRelativa = `/uploads/qr/${path.basename(rutaArchivo)}`;
    
    return {
      rutaAbsoluta: rutaArchivo,
      rutaRelativa,
      dataUrl
    };
  }

  /**
   * Registra generación de QR en tabla de historial
   * Para trazabilidad y auditoría institucional
   */
  private async registrarEnHistorial(datos: Omit<RegistroHistorialQR, 'id_historial'>): Promise<void> {
    try {
      const request = this.pool.request();
      
      // Mapear campos
      Object.keys(datos).forEach(key => {
        const value = datos[key as keyof typeof datos];
        if (value !== undefined) {
          request.input(key, value);
        }
      });

      const query = `
        INSERT INTO qr_historial (
          activo_id,
          eqp,
          fecha_generacion,
          usuario_id,
          tamano_nombre,
          formato_salida,
          ruta_archivo,
          observaciones,
          reimpresion
        ) VALUES (
          @activo_id,
          @eqp,
          GETDATE(),
          @usuario_id,
          @tamano_nombre,
          @formato_salida,
          @ruta_archivo,
          @observaciones,
          @reimpresion
        )
      `;

      await request.query(query);
      console.log(`[QR Service] Historial registrado para EQP: ${datos.eqp}`);
    } catch (error) {
      console.error('[QR Service] Error registrando historial:', error);
      // No lanzar error, solo loguear - el QR ya se generó
    }
  }

  /**
   * Obtiene configuración de tamaño de pegatina según ID
   * Si no se proporciona ID, retorna tamaño mediano por defecto
   */
  private obtenerTamanoPegatina(tamanoId?: number): TamanoPegatina {
    if (!tamanoId || tamanoId < 1 || tamanoId > TAMANOS_PEGATINA.length) {
      // Default: Mediana (30x30mm) - índice 1 (0-based)
      return TAMANOS_PEGATINA[1];
    }
    return TAMANOS_PEGATINA[tamanoId - 1]; // Convertir de 1-based a 0-based
  }

  /**
   * Genera mensaje resumen de resultados de generación masiva
   */
  private generarMensajeResumen(exitosos: number, fallidos: number): string {
    if (fallidos === 0) {
      return `Se generaron exitosamente ${exitosos} código(s) QR`;
    } else if (exitosos === 0) {
      return `No se pudo generar ningún QR. ${fallidos} fallo(s)`;
    } else {
      return `Se generaron ${exitosos} QR exitosamente. ${fallidos} fallo(s). Revise detalles.`;
    }
  }

  /**
   * TODO: Implementar creación de paquete ZIP para descarga masiva
   * Cuando se generan múltiples QR, ofrecer descarga como único archivo ZIP
   */
  private async crearPaqueteZIP(resultados: ResultadoQRIndividual[]): Promise<string> {
    // Pendiente de implementación con librería archiver
    throw new Error('Funcionalidad ZIP pendiente de implementación');
  }
}

// Exportar instancia factory para uso en controllers
export function createQRService(pool: Pool): QRService {
  return new QRService(pool);
}
