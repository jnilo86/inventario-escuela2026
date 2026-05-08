# DICCIONARIO TÉCNICO - INVENTARIO ESCS

## Base de Datos - Tablas y Campos

### 1. activos
Registro maestro de todos los activos tecnológicos de la institución.

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|-------------|
| id_activo | INT | Identificador único autoincremental | Sí (PK) |
| eqp | NVARCHAR(50) | Código EQP institucional único | Sí |
| serial | NVARCHAR(100) | Número de serie del fabricante | Sí |
| tipo_activo | NVARCHAR(50) | Tipo: Laptop, Monitor, Impresora, etc. | Sí |
| marca | NVARCHAR(100) | Marca del equipo | No |
| modelo | NVARCHAR(100) | Modelo del equipo | No |
| imei | NVARCHAR(50) | IMEI para equipos móviles | No |
| especificaciones | NVARCHAR(MAX) | Detalles técnicos completos | No |
| estado | NVARCHAR(50) | Estado actual del activo | Sí |
| ubicacion | NVARCHAR(200) | Ubicación física actual | No |
| fecha_adquisicion | DATE | Fecha de compra | No |
| valor_adquisicion | DECIMAL(18,2) | Valor de compra | No |
| proveedor | NVARCHAR(150) | Proveedor del equipo | No |
| garantia_hasta | DATE | Fin de garantía | No |
| vida_util_anios | INT | Vida útil estimada | No |
| qr_generado | BIT | ¿Se generó QR? (0/1) | Sí (default 0) |
| fecha_ultimo_movimiento | DATETIME | Último movimiento registrado | No |
| observaciones | NVARCHAR(MAX) | Notas adicionales | No |
| fecha_creacion | DATETIME | Fecha de creación | Sí (auto) |
| fecha_modificacion | DATETIME | Última modificación | No (auto) |
| creado_por | INT | Usuario que creó el registro | Sí (FK) |

**Estados válidos:**
- Disponible
- Asignado
- Con falla
- En reparación
- Baja
- Robado reportado
- Robado confirmado
- Sin trazabilidad
- Merma administrativa

### 2. responsables
Personas responsables de activos (no se eliminan, solo se desactivan).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_responsable | INT | Identificador único (PK) |
| rut | NVARCHAR(20) | RUT del responsable |
| nombre_completo | NVARCHAR(150) | Nombre completo |
| email | NVARCHAR(100) | Correo institucional |
| telefono | NVARCHAR(20) | Teléfono de contacto |
| area | NVARCHAR(100) | Área/departamento |
| cargo | NVARCHAR(100) | Cargo del responsable |
| direccion | NVARCHAR(200) | Dirección particular |
| activo | BIT | Estado (1=Activo, 0=Histórico) |
| fecha_ingreso | DATE | Fecha de ingreso |
| fecha_retiro | DATE | Fecha de retiro |
| observaciones | NVARCHAR(MAX) | Notas adicionales |

### 3. movimientos
Cabecera de movimientos (entregas, devoluciones, transferencias).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_movimiento | INT | Identificador único (PK) |
| tipo_movimiento | NVARCHAR(50) | Entrega, Devolución, Regularización |
| numero_acta | NVARCHAR(50) | Número de acta institucional |
| fecha_movimiento | DATETIME | Fecha del movimiento |
| id_responsable | INT | Responsable involucrado (FK) |
| id_responsable_origen | INT | Responsable origen (transferencias) |
| id_usuario | INT | Usuario que registra (FK) |
| ciudad | NVARCHAR(100) | Ciudad donde se realiza |
| observaciones | NVARCHAR(MAX) | Observaciones del movimiento |
| firma_digital | NVARCHAR(MAX) | Firma digital (base64/ruta) |
| ruta_acta_pdf | NVARCHAR(500) | Ruta del PDF generado |
| estado_movimiento | NVARCHAR(50) | Completado, Pendiente, Anulado |

### 4. movimiento_detalle
Detalle de activos por movimiento (relación muchos-a-muchos).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_detalle | INT | Identificador único (PK) |
| id_movimiento | INT | Movimiento padre (FK) |
| id_activo | INT | Activo involucrado (FK) |
| estado_anterior | NVARCHAR(50) | Estado antes del movimiento |
| estado_nuevo | NVARCHAR(50) | Estado después del movimiento |
| observaciones | NVARCHAR(MAX) | Observaciones específicas |

### 5. movimiento_accesorios
Accesorios entregados/devueltos en cada movimiento.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_accesorio_mov | INT | Identificador único (PK) |
| id_movimiento | INT | Movimiento padre (FK) |
| nombre_accesorio | NVARCHAR(100) | Mouse, Cargador, Bolso, etc. |
| cantidad | INT | Cantidad (default 1) |
| estado | NVARCHAR(50) | Estado del accesorio |
| observaciones | NVARCHAR(MAX) | Notas adicionales |

### 6. mantenciones
Registro de mantenciones preventivas y correctivas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_mantencion | INT | Identificador único (PK) |
| id_activo | INT | Activo mantenido (FK) |
| tipo_mantencion | NVARCHAR(50) | Preventiva, Correctiva, Mejora |
| fecha_ingreso | DATE | Fecha de ingreso a mantención |
| fecha_salida | DATE | Fecha de salida |
| proveedor | NVARCHAR(150) | Proveedor del servicio |
| tecnico_responsable | NVARCHAR(100) | Técnico que realizó |
| descripcion_falla | NVARCHAR(MAX) | Descripción de la falla |
| trabajo_realizado | NVARCHAR(MAX) | Trabajo realizado |
| costo | DECIMAL(18,2) | Costo de la mantención |
| garantia_mantencion | DATE | Garantía del servicio |

### 7. regularizaciones_activos
Regularizaciones históricas de activos (cambio de estado sin acta).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_regularizacion | INT | Identificador único (PK) |
| id_activo | INT | Activo regularizado (FK) |
| estado_anterior | NVARCHAR(50) | Estado anterior |
| estado_nuevo | NVARCHAR(50) | Estado nuevo |
| motivo | NVARCHAR(MAX) | Motivo obligatorio |
| observaciones | NVARCHAR(MAX) | Observaciones adicionales |
| ruta_adjunto | NVARCHAR(500) | Documento justificativo |
| fecha_regularizacion | DATETIME | Fecha de la regularización |
| id_usuario | INT | Usuario que realiza (FK) |

### 8. qr_historial
Historial de códigos QR generados.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_qr_historial | INT | Identificador único (PK) |
| id_activo | INT | Activo asociado (FK) |
| contenido_qr | NVARCHAR(MAX) | Contenido codificado |
| ruta_imagen | NVARCHAR(500) | Ruta de la imagen QR |
| tipo_impresion | NVARCHAR(50) | Individual, Masivo |
| plantilla_usada | NVARCHAR(100) | Plantilla utilizada |
| es_reimpresion | BIT | ¿Es reimpresión? |
| id_qr_original | INT | QR original (si es reimpresión) |
| fecha_generacion | DATETIME | Fecha de generación |
| generado_por | INT | Usuario que generó (FK) |

### 9. importaciones_csv
Registro de importaciones desde CSV.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_importacion | INT | Identificador único (PK) |
| tipo_importacion | NVARCHAR(50) | Activos, Responsables, Movimientos |
| nombre_archivo | NVARCHAR(255) | Nombre del archivo CSV |
| total_registros | INT | Total de registros |
| registros_exitosos | INT | Importados correctamente |
| registros_fallidos | INT | Con error |
| registros_omitidos | INT | Omitidos (duplicados) |
| errores_detalle | NVARCHAR(MAX) | Detalle de errores (JSON) |
| estado_importacion | NVARCHAR(50) | Procesando, Completada, Fallida |

### 10. alertas
Sistema de alertas institucionales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_alerta | INT | Identificador único (PK) |
| tipo_alerta | NVARCHAR(50) | Tipo de alerta |
| titulo | NVARCHAR(200) | Título descriptivo |
| descripcion | NVARCHAR(MAX) | Descripción detallada |
| severidad | NVARCHAR(20) | Baja, Media, Alta, Crítica |
| leida | BIT | ¿Fue leída? |
| resuelta | BIT | ¿Fue resuelta? |
| fecha_resolucion | DATETIME | Fecha de resolución |

### 11. logs
Auditoría completa del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_log | BIGINT | Identificador único (PK) |
| tipo_operacion | NVARCHAR(50) | INSERT, UPDATE, DELETE, LOGIN |
| tabla_afectada | NVARCHAR(50) | Tabla afectada |
| id_registro_afectado | INT | ID del registro |
| descripcion | NVARCHAR(MAX) | Descripción de la operación |
| datos_anteriores | NVARCHAR(MAX) | Datos antes (JSON) |
| datos_nuevos | NVARCHAR(MAX) | Datos después (JSON) |
| id_usuario | INT | Usuario que realizó (FK) |
| ip_origen | NVARCHAR(50) | IP de origen |
| user_agent | NVARCHAR(500) | Navegador/dispositivo |
| fecha_operacion | DATETIME | Fecha y hora |

## Reglas de Negocio Importantes

### Validación de Entrega
- UN ACTIVO SOLO PUEDE SER ENTREGADO SI SU ESTADO ES "DISPONIBLE"
- Se debe validar antes de crear el movimiento

### Devolución
- Solo se pueden devolver activos que estén actualmente asignados al RUT consultado
- Por cada activo se debe elegir estado final

### QR
- NO se genera automáticamente al crear activo
- SOLO se genera cuando usuario elige "Imprimir plantilla"

### Responsables
- Los responsables históricos NO se eliminan
- Se desactivan (activo = 0) para mantener historial

### Búsqueda
- Búsqueda SOLO al presionar botón BUSCAR
- NO búsqueda automática mientras se escribe
