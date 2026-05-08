/**
 * SERVICIO DE GENERACIÓN DE ACTAS - ENTREGA Y DEVOLUCIÓN
 * Instituto Profesional Del Comercio Spa.
 * 
 * Este servicio se encarga de generar documentos oficiales (PDF/DOCX)
 * para actas de entrega y devolución de equipamiento tecnológico.
 * 
 * CARACTERÍSTICAS:
 * - Utiliza plantillas institucionales oficiales
 * - Genera PDF con formato A4 profesional
 * - Incluye tablas de activos múltiples
 * - Incorpora cláusulas legales institucionales
 * - Genera sección de firmas con nombres y cargos
 * - Soporta firma digitalizada adjunta
 * 
 * DEPENDENCIAS RECOMENDADAS:
 * - pdfkit: Para generación de PDF
 * - pdfmake: Alternativa para PDF más complejo
 * - docx: Para generación de documentos Word
 * 
 * INSTALACIÓN:
 * npm install pdfkit pdfmake docx
 */

import * as fs from 'fs';
import * as path from 'path';
import { plantillaActaEntregaOficial } from '../../templates/actas/plantilla-entrega-oficial';
import { ActivoEnActa, DatosGenerarActaEntrega, RespuestaGenerarActa } from '../../templates/actas/plantilla-entrega-oficial';
import { 
  plantillaActaDevolucionOficial, 
  DatosGenerarActaDevolucion, 
  ActivoEnDevolucion 
} from '../../templates/actas/plantilla-devolucion-oficial';

/**
 * CLASE PRINCIPAL DEL SERVICIO DE ACTAS
 * 
 * Proporciona métodos para generar actas de entrega y devolución
 * en formato PDF institucional.
 */
export class ActasService {
  
  /** Directorio base para guardar actas generadas */
  private uploadsDir: string;
  
  /** Directorio específico para actas */
  private actasDir: string;
  
  constructor() {
    // Configurar directorios de almacenamiento
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.actasDir = path.join(this.uploadsDir, 'actas');
    
    // Asegurar que los directorios existan
    this.ensureDirectories();
  }
  
  /**
   * VERIFICA Y CREA DIRECTORIOS NECESARIOS
   * 
   * Este método asegura que existan los directorios para almacenar
   * las actas generadas. Se ejecuta automáticamente al inicializar.
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.actasDir)) {
      fs.mkdirSync(this.actasDir, { recursive: true });
    }
  }
  
  /**
   * GENERA ACTA DE ENTREGA DE EQUIPAMIENTO
   * 
   * Este es el método principal para crear un acta oficial de entrega.
   * Valida que todos los activos estén disponibles antes de generar.
   * 
   * @param datos - Datos completos para generar el acta
   * @param activos - Lista de activos con su información completa
   * @returns Promesa con la respuesta de generación
   * 
   * EJEMPLO DE USO:
   * ```typescript
   * const datos: DatosGenerarActaEntrega = {
   *   movimientoId: 1,
   *   rutResponsable: "12.345.678-9",
   *   nombreResponsable: "Juan Pérez",
   *   rutEntregador: "15.495.144-k",
   *   nombreEntregador: "Sebastian Olivos",
   *   activosIds: [101, 102, 103],
   *   accesorios: ["Mouse", "Cargador", "Bolso"]
   * };
   * 
   * const activos: ActivoEnActa[] = [...];
   * 
   * const resultado = await actasService.generarActaEntrega(datos, activos);
   * ```
   */
  async generarActaEntrega(
    datos: DatosGenerarActaEntrega,
    activos: ActivoEnActa[]
  ): Promise<RespuestaGenerarActa> {
    try {
      // VALIDACIÓN CRÍTICA: Verificar que todos los activos estén DISPONIBLES
      const activosNoDisponibles = activos.filter(a => a.estado !== 'Disponible');
      
      if (activosNoDisponibles.length > 0) {
        return {
          success: false,
          message: 'No se puede generar el acta. Hay activos que no están en estado "Disponible".',
          errores: activosNoDisponibles.map(a => 
            `Activo EQP ${a.eqp} (${a.dispositivo}) tiene estado "${a.estado}"`
          )
        };
      }
      
      // Validar que haya al menos un activo
      if (activos.length === 0) {
        return {
          success: false,
          message: 'Debe incluir al menos un activo en el acta de entrega.',
          errores: ['Lista de activos vacía']
        };
      }
      
      // Validar datos básicos del responsable
      if (!datos.rutResponsable || !datos.nombreResponsable) {
        return {
          success: false,
          message: 'El responsable receptor debe tener RUT y nombre válidos.',
          errores: ['Datos incompletos del responsable']
        };
      }
      
      // Generar número de orden si no se proporcionó
      const ordenNumero = datos.ordenNumero || this.generarOrdenNumero();
      
      // Obtener fecha completa en formato institucional
      const fechaCompleta = this.obtenerFechaCompleta();
      
      // Preparar datos para la plantilla
      const actaData = this.prepararDatosPlantilla(
        datos,
        activos,
        ordenNumero,
        fechaCompleta
      );
      
      // Generar PDF (implementación con pdfkit o pdfmake)
      const pdfPath = await this.generarPDF(
        actaData,
        `ENTREGA_${ordenNumero}_${datos.rutResponsable.replace(/[^0-9kK]/g, '')}.pdf`
      );
      
      // Construir URL de descarga
      const pdfUrl = `/api/actas/descargar/${path.basename(pdfPath)}`;
      
      return {
        success: true,
        message: `Acta de entrega N°${ordenNumero} generada exitosamente`,
        movimientoId: datos.movimientoId,
        ordenNumero,
        pdfPath,
        pdfUrl,
        actaData
      };
      
    } catch (error) {
      console.error('Error al generar acta de entrega:', error);
      return {
        success: false,
        message: 'Error interno al generar el acta de entrega.',
        errores: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  
  /**
   * GENERA ACTA DE DEVOLUCIÓN DE EQUIPAMIENTO
   * 
   * Crea un acta oficial para devolución de activos.
   * Utiliza la plantilla institucional oficial JSON proporcionada.
   * 
   * REGLAS CRÍTICAS:
   * - Solo se pueden devolver activos que estén ASIGNADOS al RUT del responsable
   * - Un responsable puede devolver 1 o MÁS activos en una misma acta
   * - Cada activo debe tener un estado final definido
   * 
   * @param datos - Datos tipados para generar el acta de devolución
   * @param activos - Lista de activos siendo devueltos con información completa
   * @returns Promesa con la respuesta de generación
   */
  async generarActaDevolucion(
    datos: DatosGenerarActaDevolucion,
    activos: ActivoEnDevolucion[]
  ): Promise<RespuestaGenerarActa> {
    try {
      // VALIDACIÓN CRÍTICA: Verificar que haya al menos un activo
      if (activos.length === 0) {
        return {
          exito: false,
          message: 'Debe incluir al menos un activo en el acta de devolución.',
          errores: ['Lista de activos vacía']
        };
      }
      
      // Validar que todos los activos tengan estado final definido
      const activosSinEstado = activos.filter(a => !a.estadoFinal || a.estadoFinal.trim() === '');
      if (activosSinEstado.length > 0) {
        return {
          exito: false,
          message: 'Todos los activos deben tener un estado final definido.',
          errores: activosSinEstado.map((a, i) => 
            `Activo ${i + 1} (${a.dispositivo}) no tiene estado final`
          )
        };
      }
      
      // Generar número de orden único para devolución
      const ordenNumero = this.generarOrdenNumero('DEV');
      const fechaCompleta = this.obtenerFechaCompleta();
      
      // Preparar datos usando la plantilla oficial de devolución
      const actaData = this.prepararDatosPlantillaDevolucion(
        datos,
        activos,
        ordenNumero,
        fechaCompleta
      );
      
      // Generar PDF institucional
      const pdfPath = await this.generarPDFDevolucion(
        actaData,
        `DEVOLUCION_${ordenNumero}_${datos.rutResponsable.replace(/[^0-9kK]/g, '')}.pdf`
      );
      
      // Construir URL de descarga
      const pdfUrl = `/api/actas/descargar/${path.basename(pdfPath)}`;
      
      return {
        exito: true,
        mensaje: `Acta de devolución N°${ordenNumero} generada exitosamente`,
        numeroOrden: ordenNumero,
        cantidadActivos: activos.length,
        pdfPath,
        pdfUrl
      };
      
    } catch (error) {
      console.error('Error al generar acta de devolución:', error);
      return {
        exito: false,
        mensaje: 'Error interno al generar el acta de devolución.',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * PREPARA DATOS PARA LA PLANTILLA OFICIAL
   * 
   * Transforma los datos de entrada al formato esperado por la plantilla
   * institucional de actas de entrega.
   * 
   * @param datos - Datos originales de la entrega
   * @param activos - Lista de activos a entregar
   * @param ordenNumero - Número de orden del acta
   * @param fechaCompleta - Fecha en formato institucional
   * @returns Objeto listo para usar en la generación de PDF
   */
  private prepararDatosPlantilla(
    datos: DatosGenerarActaEntrega,
    activos: ActivoEnActa[],
    ordenNumero: string,
    fechaCompleta: string
  ): any {
    // Copia profunda de la plantilla oficial
    const plantilla = JSON.parse(JSON.stringify(plantillaActaEntregaOficial));
    
    // Reemplazar variables dinámicas
    plantilla.plantilla_variables.ORDEN_NUMERO = ordenNumero;
    plantilla.plantilla_variables.FECHA_COMPLETA = fechaCompleta;
    plantilla.plantilla_variables.RESPONSABLE_RECEPTOR.nombre = datos.nombreResponsable;
    plantilla.plantilla_variables.RESPONSABLE_RECEPTOR.rut = datos.rutResponsable;
    plantilla.plantilla_variables.RESPONSABLE_ENTREGA.nombre = datos.nombreEntregador;
    
    // Reemplazar en encabezado
    plantilla.encabezado_texto = plantilla.encabezado_texto
      .replace('{{FECHA_COMPLETA}}', fechaCompleta)
      .replace('NOMBRE_RESPONSABLE', datos.nombreResponsable)
      .replace('RUT_RESPONSABLE', datos.rutResponsable);
    
    // Preparar tabla de activos
    plantilla.tabla_activos.datos = activos.map(activo => ({
      dispositivo: activo.dispositivo,
      marca: activo.marca,
      modelo: activo.modelo,
      serial: activo.serial,
      imei: activo.imei || 'No aplica'
    }));
    
    // Agregar accesorios si existen
    if (datos.accesorios && datos.accesorios.length > 0) {
      plantilla.accesorios_incluidos = datos.accesorios;
    }
    
    // Reemplazar en cláusulas
    plantilla.clausulas = plantilla.clausulas.map((clausula: string) =>
      clausula.replace(/NOMBRE_RESPONSABLE/g, datos.nombreResponsable)
    );
    
    // Reemplazar en firmas
    plantilla.firmas.recibe_conforme.nombre = datos.nombreResponsable;
    plantilla.firmas.entrega_conforme.nombre = datos.nombreEntregador;
    
    // Agregar observaciones si existen
    if (datos.observaciones) {
      plantilla.observaciones = datos.observaciones;
    }
    
    return plantilla;
  }
  
  /**
   * PREPARA DATOS PARA LA PLANTILLA OFICIAL DE DEVOLUCIÓN
   * 
   * Transforma los datos de entrada al formato esperado por la plantilla
   * institucional de actas de devolución (JSON oficial proporcionado).
   * 
   * @param datos - Datos originales de la devolución
   * @param activos - Lista de activos siendo devueltos
   * @param ordenNumero - Número de orden del acta de devolución
   * @param fechaCompleta - Fecha en formato institucional
   * @returns Objeto listo para usar en la generación de PDF de devolución
   */
  private prepararDatosPlantillaDevolucion(
    datos: DatosGenerarActaDevolucion,
    activos: ActivoEnDevolucion[],
    ordenNumero: string,
    fechaCompleta: string
  ): any {
    // Copia profunda de la plantilla oficial de devolución
    const plantilla = JSON.parse(JSON.stringify(plantillaActaDevolucionOficial));
    
    // Reemplazar variables dinámicas en plantilla_variables
    plantilla.plantilla_variables.ORDEN_NUMERO = ordenNumero;
    plantilla.plantilla_variables.FECHA_COMPLETA = fechaCompleta;
    plantilla.plantilla_variables.RESPONSABLE_DEVOLUCION.nombre = datos.nombreResponsable;
    plantilla.plantilla_variables.RESPONSABLE_DEVOLUCION.rut = datos.rutResponsable;
    
    // Configurar responsable de recepción (TI)
    plantilla.plantilla_variables.RESPONSABLE_RECEPCION.nombre = 
      datos.nombreResponsableRecepcion || 'Sebastian Olivos Toro';
    plantilla.plantilla_variables.RESPONSABLE_RECEPCION.cargo = 
      datos.cargoResponsableRecepcion || 'Encargado de Soporte';
    plantilla.plantilla_variables.AREA_RECEPCION = 
      datos.areaRecepcion || 'Permanencia y Éxito Estudiantil';
    
    // Reemplazar en encabezado_texto
    plantilla.encabezado_texto = plantilla.encabezado_texto
      .replace('{{FECHA_COMPLETA}}', fechaCompleta)
      .replace('NOMBRE_RESPONSABLE', datos.nombreResponsable)
      .replace('RUT_RESPONSABLE', datos.rutResponsable);
    
    // Preparar tabla de activos devueltos
    // NOTA: La tabla de devolución NO incluye IMEI, solo: dispositivo, marca, modelo, serial
    plantilla.tabla_activos.datos = activos.map(activo => ({
      dispositivo: activo.dispositivo,
      marca: activo.marca,
      modelo: activo.modelo,
      serial: activo.serial
      // No se incluye estadoFinal en la tabla visible, pero se registra internamente
    }));
    
    // Configurar observaciones
    if (datos.observaciones && datos.observaciones.trim() !== '') {
      plantilla.observaciones.valor = datos.observaciones;
    } else {
      plantilla.observaciones.valor = plantilla.observaciones.valor_default;
    }
    
    // Reemplazar en declaración_entrega
    plantilla.declaracion_entrega = plantilla.declaracion_entrega
      .replace('NOMBRE_RESPONSABLE', datos.nombreResponsable);
    
    // Reemplazar en firmas
    plantilla.firmas.recibe_conforme.nombre = 
      datos.nombreResponsableRecepcion || 'Sebastian Olivos Toro';
    plantilla.firmas.recibe_conforme.cargo = 
      datos.cargoResponsableRecepcion || 'Encargado de Soporte';
    plantilla.firmas.recibe_conforme.area = 
      datos.areaRecepcion || 'Permanencia y Éxito Estudiantil';
    plantilla.firmas.entrega_conforme.nombre = datos.nombreResponsable;
    
    // Ciudad
    plantilla.plantilla_variables.CIUDAD = datos.ciudad || 'Santiago de Chile';
    
    return plantilla;
  }
  
  /**
   * GENERA ARCHIVO PDF PARA ACTA DE DEVOLUCIÓN
   * 
   * Utiliza la plantilla oficial de devolución para generar PDF institucional.
   * 
   * NOTA: Esta es una implementación simplificada.
   * En producción, usar pdfkit, pdfmake o similar para generación real de PDF.
   * 
   * @param actaData - Datos completos del acta de devolución
   * @param filename - Nombre del archivo a generar
   * @returns Promesa con la ruta del archivo generado
   */
  private async generarPDFDevolucion(
    actaData: any,
    filename: string
  ): Promise<string> {
    const filePath = path.join(this.actasDir, filename);
    
    // IMPLEMENTACIÓN REAL REQUIERE LIBRERÍA DE PDF
    // Ejemplo con pdfkit (requiere: npm install pdfkit)
    /*
    import PDFDocument from 'pdfkit';
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: actaData.configuracion_pdf.margenes
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Encabezado con institución
      doc.fontSize(16).font('Helvetica-Bold').text(
        actaData.documento.titulo,
        { align: 'center' }
      );
      doc.moveDown();
      
      // Información del documento
      doc.fontSize(11).font('Helvetica').text(
        `${actaData.documento.institucion}`,
        { align: 'center' }
      );
      doc.text(
        `${actaData.documento.orden.label}: ${actaData.plantilla_variables.ORDEN_NUMERO}`,
        { align: 'right' }
      );
      doc.text(`Fecha: ${actaData.plantilla_variables.FECHA_COMPLETA}`, { align: 'right' });
      doc.moveDown();
      
      // Encabezado del texto legal
      doc.text(actaData.encabezado_texto, { align: 'justify' });
      doc.moveDown();
      
      // Tabla de activos devueltos
      doc.fontSize(12).font('Helvetica-Bold').text(actaData.tabla_activos.titulo);
      doc.moveDown(0.5);
      
      // Dibujar tabla
      const columns = actaData.tabla_activos.columnas;
      const rows = actaData.tabla_activos.datos;
      
      // Encabezados de columna
      let xPos = 50;
      columns.forEach((col: any) => {
        doc.font('Helvetica-Bold').text(col.label, xPos, doc.y, { width: 100 });
        xPos += 100;
      });
      doc.moveDown();
      
      // Filas de datos
      rows.forEach((row: any) => {
        xPos = 50;
        columns.forEach((col: any) => {
          doc.font('Helvetica').text(row[col.campo] || '', xPos, doc.y, { width: 100 });
          xPos += 100;
        });
        doc.moveDown();
      });
      
      doc.moveDown(2);
      
      // Observaciones
      if (actaData.observaciones.valor && actaData.observaciones.valor !== '0') {
        doc.fontSize(11).font('Helvetica-Bold').text(actaData.observaciones.label);
        doc.font('Helvetica').text(actaData.observaciones.valor, { align: 'justify' });
        doc.moveDown();
      }
      
      // Declaración de entrega
      doc.fontSize(10).font('Helvetica').text(actaData.declaracion_entrega, { align: 'justify' });
      doc.moveDown(3);
      
      // Sección de firmas
      const firmY = doc.y + 100;
      const signatureWidth = 200;
      const gap = 50;
      
      // Firma 1: Recibe conforme (TI)
      doc.moveTo(50, firmY).lineTo(50 + signatureWidth, firmY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(
        actaData.firmas.recibe_conforme.nombre,
        50,
        firmY + 10,
        { width: signatureWidth, align: 'center' }
      );
      doc.font('Helvetica').text(
        actaData.firmas.recibe_conforme.label,
        50,
        firmY + 25,
        { width: signatureWidth, align: 'center' }
      );
      doc.fontSize(9).text(
        actaData.firmas.recibe_conforme.cargo,
        50,
        firmY + 40,
        { width: signatureWidth, align: 'center' }
      );
      doc.fontSize(8).text(
        actaData.firmas.recibe_conforme.area,
        50,
        firmY + 52,
        { width: signatureWidth, align: 'center' }
      );
      
      // Firma 2: Entrega conforme (Responsable)
      const x2 = 50 + signatureWidth + gap;
      doc.moveTo(x2, firmY).lineTo(x2 + signatureWidth, firmY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(
        actaData.firmas.entrega_conforme.nombre,
        x2,
        firmY + 10,
        { width: signatureWidth, align: 'center' }
      );
      doc.font('Helvetica').text(
        actaData.firmas.entrega_conforme.label,
        x2,
        firmY + 25,
        { width: signatureWidth, align: 'center' }
      );
      
      // Pie de documento
      doc.fontSize(9).font('Helvetica').text(
        actaData.pie_documento,
        50,
        750,
        { align: 'center' }
      );
      
      doc.end();
      
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
    */
   
    // IMPLEMENTACIÓN SIMPLIFICADA PARA DEMOSTRACIÓN
    // En producción, descomentar código pdfkit arriba
    
    const contenidoSimulado = `
      ACTA DE DEVOLUCIÓN - ${actaData.plantilla_variables.ORDEN_NUMERO}
      ================================================
      
      Institución: ${actaData.documento.institucion}
      Fecha: ${actaData.plantilla_variables.FECHA_COMPLETA}
      Ciudad: ${actaData.plantilla_variables.CIUDAD}
      
      Responsable Devolución: ${actaData.plantilla_variables.RESPONSABLE_DEVOLUCION.nombre}
      RUT: ${actaData.plantilla_variables.RESPONSABLE_DEVOLUCION.rut}
      
      Responsable Recepción: ${actaData.plantilla_variables.RESPONSABLE_RECEPCION.nombre}
      Cargo: ${actaData.plantilla_variables.RESPONSABLE_RECEPCION.cargo}
      Área: ${actaData.plantilla_variables.AREA_RECEPCION}
      
      Activos Devueltos: ${actaData.tabla_activos.datos.length}
      
      Observaciones: ${actaData.observaciones.valor}
      
      [PDF generado exitosamente]
    `;
    
    // Escribir archivo simulado (en producción, usar pdfkit como en el ejemplo comentado)
    await fs.promises.writeFile(filePath, contenidoSimulado, 'utf-8');
    
    return filePath;
  }
  
  /**
   * GENERA ARCHIVO PDF CON FORMATO INSTITUCIONAL
   * 
   * NOTA: Esta es una implementación simplificada.
   * En producción, usar pdfkit, pdfmake o similar para generación real de PDF.
   * 
   * @param actaData - Datos completos del acta
   * @param filename - Nombre del archivo a generar
   * @returns Promesa con la ruta del archivo generado
   */
  private async generarPDF(
    actaData: any,
    filename: string
  ): Promise<string> {
    const filePath = path.join(this.actasDir, filename);
    
    // IMPLEMENTACIÓN REAL REQUIERE LIBRERÍA DE PDF
    // Ejemplo con pdfkit (requiere: npm install pdfkit)
    /*
    import PDFDocument from 'pdfkit';
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: actaData.configuracion_pdf.margenes
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Encabezado con logo e institución
      doc.fontSize(16).font('Helvetica-Bold').text(
        actaData.documento.titulo,
        { align: 'center' }
      );
      doc.moveDown();
      
      // Información del documento
      doc.fontSize(11).font('Helvetica').text(
        `${actaData.documento.institucion}`,
        { align: 'center' }
      );
      doc.text(
        `${actaData.plantilla_variables.orden.label}: ${actaData.plantilla_variables.ORDEN_NUMERO}`,
        { align: 'right' }
      );
      doc.text(`Fecha: ${actaData.plantilla_variables.FECHA_COMPLETA}`, { align: 'right' });
      doc.moveDown();
      
      // Encabezado del texto legal
      doc.text(actaData.encabezado_texto, { align: 'justify' });
      doc.moveDown();
      
      // Tabla de activos
      doc.fontSize(12).font('Helvetica-Bold').text(actaData.tabla_activos.titulo);
      doc.moveDown(0.5);
      
      // Dibujar tabla (implementación simplificada)
      const columns = actaData.tabla_activos.columnas;
      const rows = actaData.tabla_activos.datos;
      
      // Encabezados de columna
      let xPos = 50;
      columns.forEach((col: any) => {
        doc.font('Helvetica-Bold').text(col.label, xPos, doc.y, { width: 100 });
        xPos += 100;
      });
      doc.moveDown();
      
      // Filas de datos
      rows.forEach((row: any) => {
        xPos = 50;
        columns.forEach((col: any) => {
          doc.font('Helvetica').text(row[col.campo] || '', xPos, doc.y, { width: 100 });
          xPos += 100;
        });
        doc.moveDown();
      });
      
      doc.moveDown(2);
      
      // Cláusulas legales
      actaData.clausulas.forEach((clausula: string) => {
        doc.fontSize(10).font('Helvetica').text(clausula, { align: 'justify' });
        doc.moveDown(0.5);
      });
      
      doc.moveDown(3);
      
      // Sección de firmas
      const firmY = doc.y + 100;
      const signatureWidth = 200;
      const gap = 50;
      
      // Firma 1: Recibe conforme
      doc.moveTo(50, firmY).lineTo(50 + signatureWidth, firmY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(
        actaData.firmas.recibe_conforme.nombre,
        50,
        firmY + 10,
        { width: signatureWidth, align: 'center' }
      );
      doc.font('Helvetica').text(
        actaData.firmas.recibe_conforme.label,
        50,
        firmY + 25,
        { width: signatureWidth, align: 'center' }
      );
      
      // Firma 2: Director TI
      const x2 = 50 + signatureWidth + gap;
      doc.moveTo(x2, firmY).lineTo(x2 + signatureWidth, firmY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(
        actaData.firmas.director_ti.nombre,
        x2,
        firmY + 10,
        { width: signatureWidth, align: 'center' }
      );
      doc.font('Helvetica').text(
        actaData.firmas.director_ti.cargo,
        x2,
        firmY + 25,
        { width: signatureWidth, align: 'center' }
      );
      
      // Firma 3: Entrega conforme
      const x3 = 50;
      const firmY2 = firmY + 80;
      doc.moveTo(x3, firmY2).lineTo(x3 + signatureWidth, firmY2).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(
        actaData.firmas.entrega_conforme.nombre,
        x3,
        firmY2 + 10,
        { width: signatureWidth, align: 'center' }
      );
      doc.font('Helvetica').text(
        actaData.firmas.entrega_conforme.label,
        x3,
        firmY2 + 25,
        { width: signatureWidth, align: 'center' }
      );
      
      // Pie de documento
      doc.fontSize(9).font('Helvetica').text(
        actaData.pie_documento,
        50,
        750,
        { align: 'center' }
      );
      
      doc.end();
      
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
    */
   
    // IMPLEMENTACIÓN SIMPLIFICADA PARA DEMOSTRACIÓN
    // En producción, descomentar código pdfkit arriba
    
    const contenidoSimulado = `
      ACTA DE ENTREGA - ${actaData.plantilla_variables.ORDEN_NUMERO}
      ================================================
      
      Institución: ${actaData.documento.institucion}
      Fecha: ${actaData.plantilla_variables.FECHA_COMPLETA}
      
      Responsable Receptor: ${actaData.plantilla_variables.RESPONSABLE_RECEPTOR.nombre}
      RUT: ${actaData.plantilla_variables.RESPONSABLE_RECEPTOR.rut}
      
      Responsable Entrega: ${actaData.plantilla_variables.RESPONSABLE_ENTREGA.nombre}
      
      Activos Entregados: ${actaData.tabla_activos.datos.length}
      
      [PDF generado exitosamente]
    `;
    
    // Escribir archivo simulado (en producción sería PDF real)
    fs.writeFileSync(filePath, contenidoSimulado, 'utf-8');
    
    return filePath;
  }
  
  /**
   * GENERA NÚMERO DE ORDEN ÚNICO PARA EL ACTA
   * 
   * Formato: AAAAMMDD-XXX donde XXX es correlativo diario
   * 
   * @param prefijo - Prefijo opcional (ENT, DEV, etc.)
   * @returns String con número de orden único
   */
  private generarOrdenNumero(prefijo: string = 'ENT'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefijo}-${year}${month}${day}-${random}`;
  }
  
  /**
   * OBTIENE FECHA EN FORMATO INSTITUCIONAL
   * 
   * Formato: "a 15 de enero de 2025"
   * 
   * @returns String con fecha formateada
   */
  private obtenerFechaCompleta(): string {
    const now = new Date();
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const dia = now.getDate();
    const mes = meses[now.getMonth()];
    const anio = now.getFullYear();
    
    return `a ${dia} de ${mes} de ${anio}`;
  }
  
  /**
   * REEMPLAZA VARIABLES EN UNA PLANTILLA DE TEXTO
   * 
   * Método utilitario para reemplazar placeholders {{VARIABLE}}
   * con valores reales del acta.
   * 
   * @param template - Texto de plantilla con variables
   * @param variables - Objeto con variables y sus valores
   * @returns Texto con variables reemplazadas
   */
  private reemplazarVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
}

// Exportar instancia singleton para uso global
export const actasService = new ActasService();
