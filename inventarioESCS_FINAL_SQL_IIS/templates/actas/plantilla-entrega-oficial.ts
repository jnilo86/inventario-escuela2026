/**
 * PLANTILLA OFICIAL - ACTA DE ENTREGA DE EQUIPAMIENTO
 * Instituto Profesional Del Comercio Spa.
 * 
 * Esta plantilla define la estructura exacta del documento institucional
 * para actas de entrega de equipamiento tecnológico.
 * 
 * USO: Esta plantilla es utilizada por el servicio de generación de PDF/DOCX
 * para crear actas oficiales con formato institucional estandarizado.
 * 
 * VARIABLES DINÁMICAS (se reemplazan al generar):
 * - {{FECHA_COMPLETA}}: Fecha completa del acto (ej: "a 15 de enero de 2025")
 * - NOMBRE_RESPONSABLE: Nombre del responsable que recibe
 * - RUT_RESPONSABLE: RUT del responsable que recibe
 * - RESPONSABLE_ENTREGA: Nombre del funcionario que entrega
 * - ORDEN_NUMERO: Número de orden del acta
 */

export const plantillaActaEntregaOficial = {
  documento: {
    tipo: "ACTA_ENTREGA_EQUIPAMIENTO",
    titulo: "ACTA ENTREGA DE EQUIPAMIENTO",
    institucion: "Instituto Profesional Del Comercio Spa.",
    logo: "ECS | Escuela de Comercio y Servicios",
    orden: {
      label: "Orden N°",
      valor: "XXX",
      placeholder: "Orden N°XXX"
    }
  },
  plantilla_variables: {
    ORDEN_NUMERO: "XXX",
    FECHA_COMPLETA: "{{FECHA_COMPLETA}}",
    CIUDAD: "Santiago de Chile",
    RESPONSABLE_RECEPTOR: {
      nombre: "NOMBRE_RESPONSABLE",
      rut: "RUT_RESPONSABLE"
    },
    RESPONSABLE_ENTREGA: {
      nombre: "RESPONSABLE_ENTREGA"
    },
    DIRECTOR_TI: {
      nombre: "Sebastian Olivos Toro",
      rut: "15.495.144-k",
      cargo: "Director de TI"
    },
    DOMICILIO_EMPRESA: "Ejército 306"
  },
  encabezado_texto: "En Santiago de Chile, {{FECHA_COMPLETA}}, por medio de presente, la dirección de TI del Instituto Profesional Del Comercio Spa., representada por Don Sebastian Olivos Toro, Cédula Nacional de Identidad N°15.495.144-k procede hacer entrega a NOMBRE_RESPONSABLE, Cédula Nacional de Identidad RUT_RESPONSABLE, del Instituto Profesional Del Comercio Spa. con domicilio para estos efectos en Ejército 306, los siguientes equipos de cargo:",
  tabla_activos: {
    titulo: "Equipos de cargo",
    columnas: [
      {
        campo: "dispositivo",
        label: "Dispositivo",
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
      },
      {
        campo: "imei",
        label: "IMEI",
        tipo: "string",
        descripcion: "Usar 'No aplica' cuando no corresponda"
      }
    ],
    ejemplo: [
      {
        dispositivo: "Notebook",
        marca: "HP",
        modelo: "15-fd0012la",
        serial: "1H8351045T",
        imei: "No aplica"
      }
    ]
  },
  clausulas: [
    "Por este acto NOMBRE_RESPONSABLE se compromete a utilizar el bien recibido para el desarrollo de los objetivos y fines propios del área. Por cuanto la entrega del equipamiento implica única y exclusivamente la facultad de uso sobre el mismo, siendo su responsabilidad mantenerlo en buen estado de conservación y a utilizar el equipamiento recibido conforme su destino, así como a resguardar el equipamiento entregado.",
    "La o el colaborador se compromete entregar íntegramente los equipos suministrados al término de la relación laboral y/o a indemnizar a la Empresa por la pérdida o daños que sean causados por dolo, culpa o negligencia del Trabajador en su uso, salvo caso fortuito, fuerza mayor (presentando documentación que lo avale). Esta indemnización se realizará vía descuento en el finiquito al momento del término contractual, considerando el precio mercado de los mismos equipos o alguno de las mismas características."
  ],
  firmas: {
    recibe_conforme: {
      label: "Recibe conforme",
      nombre: "NOMBRE_RESPONSABLE"
    },
    director_ti: {
      nombre: "Sebastian Olivos Toro",
      cargo: "Director de TI"
    },
    entrega_conforme: {
      label: "Entregué conforme",
      nombre: "RESPONSABLE_ENTREGA"
    }
  },
  pie_documento: "Instituto Profesional Del Comercio Spa.",
  configuracion_pdf: {
    formato: "A4",
    orientacion: "portrait",
    margenes: {
      superior: 40,
      inferior: 40,
      izquierdo: 50,
      derecho: 50
    },
    fuente: {
      principal: "Helvetica",
      titulo: "Helvetica-Bold"
    },
    estilo_tabla: {
      bordes: true,
      encabezado_negrita: true,
      alineacion: "center"
    }
  }
};

/**
 * INTERFAZ PARA DATOS DE ENTRADA DEL ACTA
 * 
 * Esta interfaz define los datos mínimos requeridos para generar un acta
 * desde el frontend hacia el backend.
 */
export interface DatosGenerarActaEntrega {
  /** ID del movimiento de entrega (se genera al registrar la entrega) */
  movimientoId: number;
  
  /** RUT del responsable que recibe los activos */
  rutResponsable: string;
  
  /** Nombre completo del responsable que recibe */
  nombreResponsable: string;
  
  /** RUT del funcionario que entrega (usuario autenticado) */
  rutEntregador: string;
  
  /** Nombre del funcionario que entrega */
  nombreEntregador: string;
  
  /** Lista de IDs de activos a incluir en el acta */
  activosIds: number[];
  
  /** Lista de accesorios opcionales (mouse, cargador, bolso, dock, etc.) */
  accesorios?: string[];
  
  /** Observaciones adicionales opcionales */
  observaciones?: string;
  
  /** URL o path de la firma digitalizada del responsable (opcional) */
  firmaUrl?: string;
  
  /** Ciudad donde se realiza la entrega (por defecto: Santiago de Chile) */
  ciudad?: string;
  
  /** Número de orden del acta (auto-generado si no se proporciona) */
  ordenNumero?: string;
}

/**
 * INTERFAZ PARA ACTIVO INDIVIDUAL EN EL ACTA
 */
export interface ActivoEnActa {
  /** EQP o ID interno del activo */
  eqp: string;
  
  /** Tipo de dispositivo (Notebook, Monitor, Teclado, etc.) */
  dispositivo: string;
  
  /** Marca del equipo */
  marca: string;
  
  /** Modelo del equipo */
  modelo: string;
  
  /** Número de serie del fabricante */
  serial: string;
  
  /** IMEI (solo para dispositivos móviles, sino "No aplica") */
  imei: string;
  
  /** Estado actual del activo (debe ser "Disponible" antes de la entrega) */
  estado: string;
}

/**
 * INTERFAZ PARA RESPUESTA DE GENERACIÓN DE ACTA
 */
export interface RespuestaGenerarActa {
  /** Indica si la operación fue exitosa */
  success: boolean;
  
  /** Mensaje descriptivo del resultado */
  message: string;
  
  /** ID del movimiento registrado */
  movimientoId?: number;
  
  /** Número de orden del acta generado */
  ordenNumero?: string;
  
  /** Ruta del archivo PDF generado */
  pdfPath?: string;
  
  /** URL para descargar el PDF */
  pdfUrl?: string;
  
  /** Datos completos del acta generada */
  actaData?: any;
  
  /** Lista de errores de validación (si los hubo) */
  errores?: string[];
}
