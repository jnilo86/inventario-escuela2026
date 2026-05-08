/**
 * PLANTILLA OFICIAL INSTITUCIONAL - ACTA DE DEVOLUCIÓN DE EQUIPAMIENTO
 * Instituto Profesional Del Comercio Spa.
 * 
 * Esta plantilla define la estructura EXACTA del acta de devolución institucional.
 * Se utiliza para generar documentos PDF formales cuando un responsable devuelve
 * uno o MÁS activos que tenía asignados previamente.
 * 
 * REGLAS CRÍTICAS:
 * - Solo se pueden devolver activos que estén actualmente ASIGNADOS al RUT del responsable
 * - Un responsable puede devolver 1 o MÁS activos en una misma acta
 * - Cada activo devuelto debe tener un estado final definido (Disponible, Baja, Robado, etc.)
 * - El documento es legal y requiere firmas de recepción y entrega
 * 
 * @version 1.0.0
 * @author Dirección de TI - Instituto Profesional Del Comercio Spa.
 */

// ============================================================================
// INTERFACES Y TIPOS - Definición de estructuras de datos para el acta
// ============================================================================

/**
 * Representa un activo individual dentro del acta de devolución
 * Incluye todos los campos visibles en la tabla institucional
 */
export interface ActivoEnDevolucion {
  /** Tipo de dispositivo (Notebook, Monitor, Teclado, etc.) */
  dispositivo: string;
  /** Marca comercial del activo (HP, Dell, Lenovo, etc.) */
  marca: string;
  /** Modelo específico del activo */
  modelo: string;
  /** Número de serie único del fabricante */
  serial: string;
  /** Estado final del activo después de la devolución */
  estadoFinal: string;
}

/**
 * Datos necesarios para generar un acta de devolución
 * Esta estructura es la que debe enviar el frontend al backend
 */
export interface DatosGenerarActaDevolucion {
  /** RUT del responsable que devuelve los activos (ej: "12.345.678-9") */
  rutResponsable: string;
  /** Nombre completo del responsable que devuelve */
  nombreResponsable: string;
  /** IDs de los activos a devolver (puede ser 1 o más) */
  activosIds: number[];
  /** Estados finales para cada activo (mismo orden que activosIds) */
  estadosFinales: {
    [activoId: number]: string; // Ej: { 101: "Disponible", 102: "Con falla" }
  };
  /** Observaciones sobre la devolución (daños, fallas, etc.) */
  observaciones?: string;
  /** Ciudad donde se realiza la devolución */
  ciudad?: string;
  /** Nombre del encargado de TI que recibe los activos */
  nombreResponsableRecepcion?: string;
  /** Cargo del encargado de recepción */
  cargoResponsableRecepcion?: string;
  /** Área/departamento de recepción */
  areaRecepcion?: string;
}

/**
 * Estructura de respuesta estandarizada tras generar un acta
 * Incluye URL del PDF generado y metadatos del proceso
 */
export interface RespuestaGenerarActa {
  /** Éxito o fracaso de la operación */
  exito: boolean;
  /** Mensaje descriptivo del resultado */
  mensaje: string;
  /** Número de orden único del acta (ej: "DEV-20250115-001") */
  numeroOrden?: string;
  /** ID del movimiento registrado en base de datos */
  idMovimiento?: number;
  /** URL relativa para descargar el PDF generado */
  pdfUrl?: string;
  /** Ruta absoluta del archivo PDF en el servidor */
  pdfPath?: string;
  /** Cantidad de activos incluidos en el acta */
  cantidadActivos?: number;
  /** Detalles adicionales o errores encontrados */
  detalles?: any;
}

// ============================================================================
// PLANTILLA JSON OFICIAL - Copia literal del estándar institucional
// ============================================================================

/**
 * Plantilla oficial del acta de devolución de equipamiento
 * Define estructura completa del documento institucional
 * 
 * NOTA: Esta plantilla se usa como referencia para generar el PDF.
 * Las variables entre {{ }} se reemplazan dinámicamente al generar el documento.
 */
export const plantillaActaDevolucionOficial = {
  /** Metadatos del documento institucional */
  documento: {
    /** Tipo interno del documento para clasificación */
    tipo: "ACTA_DEVOLUCION_EQUIPAMIENTO",
    /** Título visible en el encabezado del PDF */
    titulo: "ACTA DEVOLUCION DE EQUIPAMIENTO",
    /** Nombre legal de la institución */
    institucion: "Instituto Profesional Del Comercio Spa.",
    /** Información de numeración única del acta */
    orden: {
      /** Etiqueta visible junto al número */
      label: "Orden N°",
      /** Valor actual (se reemplaza al generar) */
      valor: "XXX",
      /** Placeholder para formularios */
      placeholder: "Orden N°XXX"
    }
  },
  
  /** Variables dinámicas que se reemplazan al generar el acta */
  plantilla_variables: {
    /** Número único de orden del acta */
    ORDEN_NUMERO: "XXX",
    /** Fecha completa con formato institucional (ej: "a 15 de enero de 2025") */
    FECHA_COMPLETA: "{{FECHA_COMPLETA}}",
    /** Ciudad donde se realiza la devolución */
    CIUDAD: "Santiago de Chile",
    /** Datos del responsable que devuelve los activos */
    RESPONSABLE_DEVOLUCION: {
      /** Nombre completo del responsable */
      nombre: "NOMBRE_RESPONSABLE",
      /** RUT del responsable */
      rut: "RUT_RESPONSABLE"
    },
    /** Datos del encargado de TI que recibe los activos */
    RESPONSABLE_RECEPCION: {
      /** Nombre del encargado de recepción */
      nombre: "RESPONSABLE_RECEPCION",
      /** Cargo del encargado */
      cargo: "Encargado de Soporte"
    },
    /** Área/departamento que recibe los activos */
    AREA_RECEPCION: "Permanencia y Éxito Estudiantil",
    /** Domicilio legal de la institución */
    DOMICILIO_EMPRESA: "Ejército 306"
  },
  
  /** Texto legal del encabezado del acta */
  encabezado_texto: "En Santiago de Chile, {{FECHA_COMPLETA}} por medio de presente NOMBRE_RESPONSABLE, Cédula Nacional de Identidad N° RUT_RESPONSABLE, hace acto de devolución del equipo asignado por el Instituto Profesional Del Comercio Spa. con domicilio para estos efectos en Ejército 306, los siguientes equipos de cargo:",
  
  /** Configuración de la tabla de activos devueltos */
  tabla_activos: {
    /** Título de la tabla */
    titulo: "Equipos devueltos",
    /** Columnas de la tabla con sus configuraciones */
    columnas: [
      {
        /** Campo interno del activo */
        campo: "dispositivo",
        /** Etiqueta visible en el encabezado de la tabla */
        label: "Dispositivo",
        /** Tipo de dato esperado */
        tipo: "string"
      },
      {
        campo: "marca",
        label: "Marca",
        tipo: "string"
      },
      {
        campo: "modelo",
        label: "Modelo",
        tipo: "string"
      },
      {
        campo: "serial",
        label: "Serial",
        tipo: "string"
      }
    ],
    /** Ejemplo de cómo se verían los datos en la tabla */
    ejemplo: [
      {
        dispositivo: "TIPO_ACTIVO",
        marca: "MARCA_ACTIVO",
        modelo: "MODELO_ACTIVO",
        serial: "SERIAL_ACTIVO"
      }
    ]
  },
  
  /** Configuración del campo de observaciones */
  observaciones: {
    /** Etiqueta visible */
    label: "Observaciones",
    /** Campo interno */
    campo: "OBSERVACIONES",
    /** Valor por defecto si no hay observaciones */
    valor_default: "0"
  },
  
  /** Declaración legal de entrega */
  declaracion_entrega: "Por este acto NOMBRE_RESPONSABLE hace entrega del equipo asignado anteriormente.",
  
  /** Configuración de las firmas al final del documento */
  firmas: {
    /** Firma de quien recibe los activos (TI) */
    recibe_conforme: {
      /** Etiqueta de la firma */
      label: "Recibe conforme",
      /** Nombre de quien recibe */
      nombre: "RESPONSABLE_RECEPCION",
      /** Cargo de quien recibe */
      cargo: "Encargado de Soporte",
      /** Área/departamento de quien recibe */
      area: "Permanencia y Éxito Estudiantil"
    },
    /** Firma de quien devuelve los activos */
    entrega_conforme: {
      /** Etiqueta de la firma */
      label: "Entregué conforme",
      /** Nombre de quien devuelve */
      nombre: "NOMBRE_RESPONSABLE"
    }
  },
  
  /** Pie de página del documento */
  pie_documento: "Instituto Profesional Del Comercio Spa.",
  
  /** Configuración técnica para generación del PDF */
  configuracion_pdf: {
    /** Formato de papel estándar institucional */
    formato: "A4",
    /** Orientación vertical del documento */
    orientacion: "portrait",
    /** Márgenes en milímetros (superior, inferior, izquierdo, derecho) */
    margenes: {
      superior: 40,
      inferior: 40,
      izquierdo: 50,
      derecho: 50
    },
    /** Configuración tipográfica */
    fuente: {
      /** Fuente principal del documento */
      principal: "Helvetica",
      /** Fuente en negrita para títulos y encabezados */
      titulo: "Helvetica-Bold"
    },
    /** Estilo visual de la tabla de activos */
    estilo_tabla: {
      /** Mostrar bordes en la tabla */
      bordes: true,
      /** Encabezado de tabla en negrita */
      encabezado_negrita: true,
      /** Alineación del texto en celdas */
      alineacion: "center"
    }
  }
};

// ============================================================================
// UTILIDADES - Funciones helper para trabajar con la plantilla
// ============================================================================

/**
 * Valida que los datos enviados cumplan con los requisitos mínimos
 * para generar un acta de devolución válida.
 * 
 * @param datos - Datos a validar
 * @returns Objeto con validación y mensajes de error si corresponde
 */
export function validarDatosDevolucion(datos: DatosGenerarActaDevolucion): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  // Validar RUT del responsable
  if (!datos.rutResponsable || datos.rutResponsable.trim() === "") {
    errores.push("El RUT del responsable es obligatorio");
  }

  // Validar nombre del responsable
  if (!datos.nombreResponsable || datos.nombreResponsable.trim() === "") {
    errores.push("El nombre del responsable es obligatorio");
  }

  // Validar que haya al menos un activo para devolver
  if (!datos.activosIds || datos.activosIds.length === 0) {
    errores.push("Debe seleccionar al menos un activo para devolver");
  }

  // Validar que haya estados finales para todos los activos
  if (!datos.estadosFinales) {
    errores.push("Debe especificar el estado final para cada activo");
  } else {
    for (const activoId of datos.activosIds) {
      if (!datos.estadosFinales[activoId]) {
        errores.push(`Falta especificar estado final para el activo ID ${activoId}`);
      }
    }
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Formatea la fecha actual al formato institucional chileno
 * Ejemplo: "a 15 de enero de 2025"
 * 
 * @returns Fecha formateada como string
 */
export function formatearFechaInstitucional(): string {
  const fecha = new Date();
  const dia = fecha.getDate();
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const mes = meses[fecha.getMonth()];
  const anio = fecha.getFullYear();
  
  return `a ${dia} de ${mes} de ${anio}`;
}

/**
 * Genera un número de orden único para el acta de devolución
 * Formato: DEV-AAAAMMDD-XXX (donde XXX es correlativo)
 * 
 * @returns Número de orden único
 */
export function generarNumeroOrden(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const aleatorio = Math.floor(Math.random() * 999) + 1;
  
  return `DEV-${anio}${mes}${dia}-${String(aleatorio).padStart(3, '0')}`;
}

// Exportación por defecto de la plantilla principal
export default plantillaActaDevolucionOficial;
