-- ============================================================================
-- INVENTARIO ESCS - SISTEMA DE GESTIÓN PATRIMONIAL TI
-- SCRIPT DE CREACIÓN DE BASE DE DATOS
-- Instituto Profesional Del Comercio Spa.
-- Versión: 1.0.0
-- Base de Datos: SQL Server
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONFIGURACIÓN INICIAL
-- ----------------------------------------------------------------------------

-- Crear base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'InventarioESCS')
BEGIN
    CREATE DATABASE InventarioESCS;
    PRINT 'Base de datos InventarioESCS creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La base de datos InventarioESCS ya existe.';
END
GO

USE InventarioESCS;
GO

-- ----------------------------------------------------------------------------
-- TABLA: roles
-- Descripción: Define los roles de seguridad del sistema
-- Cada usuario debe tener asignado un rol que determina sus permisos
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id_rol INT PRIMARY KEY IDENTITY(1,1),              -- Identificador único del rol
    nombre_rol NVARCHAR(50) NOT NULL UNIQUE,           -- Nombre del rol (ej: Administrador, Técnico TI)
    descripcion NVARCHAR(255),                         -- Descripción detallada del rol
    permisos NVARCHAR(MAX),                            -- JSON con permisos específicos
    activo BIT DEFAULT 1,                              -- Estado del rol (1=Activo, 0=Inactivo)
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación del registro
    fecha_modificacion DATETIME,                       -- Fecha de última modificación
    creado_por INT                                     -- Usuario que creó el registro
);
GO

-- ----------------------------------------------------------------------------
-- TABLA: usuarios
-- Descripción: Usuarios del sistema con credenciales de acceso
-- Cada usuario está asociado a un rol
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY IDENTITY(1,1),          -- Identificador único del usuario
    nombre_usuario NVARCHAR(50) NOT NULL UNIQUE,       -- Nombre de usuario para login
    password_hash NVARCHAR(255) NOT NULL,              -- Contraseña encriptada (bcrypt)
    nombre_completo NVARCHAR(100) NOT NULL,            -- Nombre completo del usuario
    email NVARCHAR(100),                               -- Correo electrónico
    id_rol INT FOREIGN KEY REFERENCES roles(id_rol),   -- Rol asignado al usuario
    activo BIT DEFAULT 1,                              -- Estado del usuario (1=Activo, 0=Inactivo)
    ultimo_acceso DATETIME,                            -- Fecha y hora del último acceso
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_modificacion DATETIME,                       -- Fecha de última modificación
    creado_por INT                                     -- Usuario que creó el registro
);
GO

-- ----------------------------------------------------------------------------
-- TABLA: responsables
-- Descripción: Personas responsables de activos tecnológicos
-- Incluye personal activo e histórico (no se eliminan)
-- ----------------------------------------------------------------------------
CREATE TABLE responsables (
    id_responsable INT PRIMARY KEY IDENTITY(1,1),      -- Identificador único del responsable
    rut NVARCHAR(20) NOT NULL,                         -- RUT del responsable
    nombre_completo NVARCHAR(150) NOT NULL,            -- Nombre completo
    email NVARCHAR(100),                               -- Correo electrónico institucional
    telefono NVARCHAR(20),                             -- Teléfono de contacto
    area NVARCHAR(100),                                -- Área o departamento
    cargo NVARCHAR(100),                               -- Cargo del responsable
    direccion NVARCHAR(200),                           -- Dirección particular
    activo BIT DEFAULT 1,                              -- Estado (1=Activo, 0=Desactivado/Histórico)
    fecha_ingreso DATE,                                -- Fecha de ingreso a la institución
    fecha_retiro DATE,                                 -- Fecha de retiro (si aplica)
    observaciones NVARCHAR(MAX),                       -- Observaciones adicionales
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_modificacion DATETIME,                       -- Fecha de última modificación
    creado_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que creó el registro
);

-- Índice para búsqueda rápida por RUT
CREATE INDEX IX_responsables_rut ON responsables(rut);
-- Índice para búsqueda por nombre
CREATE INDEX IX_responsables_nombre ON responsables(nombre_completo);
GO

-- ----------------------------------------------------------------------------
-- TABLA: activos
-- Descripción: Registro maestro de activos tecnológicos
-- Cada activo tiene un estado que determina su disponibilidad
-- ----------------------------------------------------------------------------
CREATE TABLE activos (
    id_activo INT PRIMARY KEY IDENTITY(1,1),           -- Identificador único del activo
    eqp NVARCHAR(50) NOT NULL UNIQUE,                  -- Código EQP (identificador institucional)
    serial NVARCHAR(100) NOT NULL,                     -- Número de serie del fabricante
    tipo_activo NVARCHAR(50) NOT NULL,                 -- Tipo de activo (Laptop, Monitor, etc.)
    marca NVARCHAR(100),                               -- Marca del equipo
    modelo NVARCHAR(100),                              -- Modelo del equipo
    imei NVARCHAR(50),                                 -- IMEI (para equipos móviles)
    especificaciones NVARCHAR(MAX),                    -- Especificaciones técnicas detalladas
    estado NVARCHAR(50) NOT NULL DEFAULT 'Disponible', -- Estado actual del activo
    -- Estados válidos: Disponible, Asignado, Con falla, En reparación, Baja, 
    -- Robado reportado, Robado confirmado, Sin trazabilidad, Merma administrativa
    ubicacion NVARCHAR(200),                           -- Ubicación física actual
    fecha_adquisicion DATE,                            -- Fecha de compra/adquisición
    valor_adquisicion DECIMAL(18,2),                   -- Valor de compra
    proveedor NVARCHAR(150),                           -- Proveedor del equipo
    garantia_hasta DATE,                               -- Fecha de vencimiento de garantía
    vida_util_anios INT,                               -- Vida útil estimada en años
    qr_generado BIT DEFAULT 0,                         -- Indica si se generó QR (1=Sí, 0=No)
    fecha_ultimo_movimiento DATETIME,                  -- Fecha del último movimiento
    observaciones NVARCHAR(MAX),                       -- Observaciones generales
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_modificacion DATETIME,                       -- Fecha de última modificación
    creado_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que creó el registro
);

-- Índice único para serial (evita duplicados)
CREATE UNIQUE INDEX IX_activos_serial ON activos(serial);
-- Índice para búsqueda por EQP
CREATE INDEX IX_activos_eqp ON activos(eqp);
-- Índice para filtrado por estado
CREATE INDEX IX_activos_estado ON activos(estado);
-- Índice para búsqueda por tipo
CREATE INDEX IX_activos_tipo ON activos(tipo_activo);
GO

-- ----------------------------------------------------------------------------
-- TABLA: movimientos
-- Descripción: Cabecera de movimientos (entregas, devoluciones, transferencias)
-- Cada movimiento puede incluir uno o más activos
-- ----------------------------------------------------------------------------
CREATE TABLE movimientos (
    id_movimiento INT PRIMARY KEY IDENTITY(1,1),       -- Identificador único del movimiento
    tipo_movimiento NVARCHAR(50) NOT NULL,             -- Tipo: Entrega, Devolución, Regularización, Transferencia
    numero_acta NVARCHAR(50) NOT NULL UNIQUE,          -- Número de acta institucional
    fecha_movimiento DATETIME NOT NULL DEFAULT GETDATE(), -- Fecha del movimiento
    id_responsable INT FOREIGN KEY REFERENCES responsables(id_responsable), -- Responsable involucrado
    id_responsable_origen INT FOREIGN KEY REFERENCES responsables(id_responsable), -- Responsable origen (transferencias)
    id_usuario INT FOREIGN KEY REFERENCES usuarios(id_usuario), -- Usuario que registra el movimiento
    ciudad NVARCHAR(100),                              -- Ciudad donde se realiza el movimiento
    observaciones NVARCHAR(MAX),                       -- Observaciones del movimiento
    firma_digital NVARCHAR(MAX),                       -- Firma digital (base64 o ruta)
    ruta_acta_pdf NVARCHAR(500),                       -- Ruta del PDF generado
    estado_movimiento NVARCHAR(50) DEFAULT 'Completado', -- Estado: Completado, Pendiente, Anulado
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_modificacion DATETIME                        -- Fecha de última modificación
);

-- Índice para búsqueda por número de acta
CREATE INDEX IX_movimientos_numero_acta ON movimientos(numero_acta);
-- Índice para filtrado por tipo
CREATE INDEX IX_movimientos_tipo ON movimientos(tipo_movimiento);
-- Índice para búsqueda por responsable
CREATE INDEX IX_movimientos_responsable ON movimientos(id_responsable);
-- Índice para filtrado por fecha
CREATE INDEX IX_movimientos_fecha ON movimientos(fecha_movimiento);
GO

-- ----------------------------------------------------------------------------
-- TABLA: movimiento_detalle
-- Descripción: Detalle de activos incluidos en cada movimiento
-- Relación muchos-a-muchos entre movimientos y activos
-- ----------------------------------------------------------------------------
CREATE TABLE movimiento_detalle (
    id_detalle INT PRIMARY KEY IDENTITY(1,1),          -- Identificador único del detalle
    id_movimiento INT FOREIGN KEY REFERENCES movimientos(id_movimiento) ON DELETE CASCADE, -- Movimiento padre
    id_activo INT FOREIGN KEY REFERENCES activos(id_activo), -- Activo involucrado
    estado_anterior NVARCHAR(50),                      -- Estado del activo antes del movimiento
    estado_nuevo NVARCHAR(50),                         -- Estado del activo después del movimiento
    observaciones NVARCHAR(MAX),                       -- Observaciones específicas del activo
    fecha_creacion DATETIME DEFAULT GETDATE()          -- Fecha de creación
);

-- Índice compuesto para consultas eficientes
CREATE INDEX IX_movimiento_detalle_movimiento ON movimiento_detalle(id_movimiento);
CREATE INDEX IX_movimiento_detalle_activo ON movimiento_detalle(id_activo);
GO

-- ----------------------------------------------------------------------------
-- TABLA: movimiento_accesorios
-- Descripción: Accesorios entregados o devueltos en cada movimiento
-- Los accesorios no son activos principales pero se registran para control
-- ----------------------------------------------------------------------------
CREATE TABLE movimiento_accesorios (
    id_accesorio_mov INT PRIMARY KEY IDENTITY(1,1),    -- Identificador único
    id_movimiento INT FOREIGN KEY REFERENCES movimientos(id_movimiento) ON DELETE CASCADE, -- Movimiento padre
    nombre_accesorio NVARCHAR(100) NOT NULL,           -- Nombre del accesorio (Mouse, Cargador, Bolso, etc.)
    cantidad INT NOT NULL DEFAULT 1,                   -- Cantidad entregada/devuelta
    estado NVARCHAR(50),                               -- Estado del accesorio
    observaciones NVARCHAR(MAX),                       -- Observaciones
    fecha_creacion DATETIME DEFAULT GETDATE()          -- Fecha de creación
);

-- Índice para consultas por movimiento
CREATE INDEX IX_movimiento_accesorios_movimiento ON movimiento_accesorios(id_movimiento);
GO

-- ----------------------------------------------------------------------------
-- TABLA: mantenciones
-- Descripción: Registro de mantenciones preventivas y correctivas
-- Permite seguimiento del historial de reparaciones
-- ----------------------------------------------------------------------------
CREATE TABLE mantenciones (
    id_mantencion INT PRIMARY KEY IDENTITY(1,1),       -- Identificador único
    id_activo INT FOREIGN KEY REFERENCES activos(id_activo), -- Activo mantenido
    tipo_mantencion NVARCHAR(50) NOT NULL,             -- Tipo: Preventiva, Correctiva, Mejora
    fecha_ingreso DATE NOT NULL,                       -- Fecha de ingreso a mantención
    fecha_salida DATE,                                 -- Fecha de salida de mantención
    proveedor NVARCHAR(150),                           -- Proveedor del servicio
    tecnico_responsable NVARCHAR(100),                 -- Técnico que realizó la mantención
    descripcion_falla NVARCHAR(MAX),                   -- Descripción de la falla reportada
    trabajo_realizado NVARCHAR(MAX),                   -- Descripción del trabajo realizado
    costo DECIMAL(18,2),                               -- Costo de la mantención
    garantia_mantencion DATE,                          -- Garantía del servicio
    ruta_orden_servicio NVARCHAR(500),                 -- Ruta de orden de servicio
    observaciones NVARCHAR(MAX),                       -- Observaciones adicionales
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_modificacion DATETIME,                       -- Fecha de última modificación
    creado_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que registró
);

-- Índice para búsqueda por activo
CREATE INDEX IX_mantenciones_activo ON mantenciones(id_activo);
-- Índice para filtrado por fecha
CREATE INDEX IX_mantenciones_fecha ON mantenciones(fecha_ingreso);
GO

-- ----------------------------------------------------------------------------
-- TABLA: adjuntos
-- Descripción: Archivos adjuntos a movimientos, mantenciones u otros registros
-- Almacena rutas de archivos y metadatos
-- ----------------------------------------------------------------------------
CREATE TABLE adjuntos (
    id_adjunto INT PRIMARY KEY IDENTITY(1,1),          -- Identificador único
    id_registro INT NOT NULL,                          -- ID del registro padre
    tipo_registro NVARCHAR(50) NOT NULL,               -- Tipo: Movimiento, Mantencion, Activo, Regularizacion
    nombre_archivo NVARCHAR(255) NOT NULL,             -- Nombre original del archivo
    ruta_archivo NVARCHAR(500) NOT NULL,               -- Ruta física del archivo
    tipo_archivo NVARCHAR(50),                         -- Tipo MIME (image/jpeg, application/pdf, etc.)
    tamano_bytes BIGINT,                               -- Tamaño del archivo en bytes
    descripcion NVARCHAR(MAX),                         -- Descripción del adjunto
    fecha_subida DATETIME DEFAULT GETDATE(),           -- Fecha de subida
    subido_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que subió el archivo
);

-- Índice para búsqueda por registro
CREATE INDEX IX_adjuntos_registro ON adjuntos(id_registro, tipo_registro);
GO

-- ----------------------------------------------------------------------------
-- TABLA: alertas
-- Descripción: Sistema de alertas institucionales
-- Notifica situaciones que requieren atención
-- ----------------------------------------------------------------------------
CREATE TABLE alertas (
    id_alerta INT PRIMARY KEY IDENTITY(1,1),           -- Identificador único
    tipo_alerta NVARCHAR(50) NOT NULL,                 -- Tipo de alerta
    titulo NVARCHAR(200) NOT NULL,                     -- Título descriptivo
    descripcion NVARCHAR(MAX),                         -- Descripción detallada
    severidad NVARCHAR(20) DEFAULT 'Media',            -- Severidad: Baja, Media, Alta, Crítica
    id_activo INT FOREIGN KEY REFERENCES activos(id_activo), -- Activo relacionado (si aplica)
    id_responsable INT FOREIGN KEY REFERENCES responsables(id_responsable), -- Responsable relacionado
    id_movimiento INT FOREIGN KEY REFERENCES movimientos(id_movimiento), -- Movimiento relacionado
    leida BIT DEFAULT 0,                               -- Indica si fue leída (1=Sí, 0=No)
    resuelta BIT DEFAULT 0,                            -- Indica si fue resuelta (1=Sí, 0=No)
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_resolucion DATETIME,                         -- Fecha de resolución
    resuelta_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que resolvió
);

-- Índice para filtrado por estado
CREATE INDEX IX_alertas_leida ON alertas(leida);
CREATE INDEX IX_alertas_severidad ON alertas(severidad);
GO

-- ----------------------------------------------------------------------------
-- TABLA: configuracion
-- Descripción: Parámetros configurables del sistema
-- Permite personalización sin modificar código
-- ----------------------------------------------------------------------------
CREATE TABLE configuracion (
    id_config INT PRIMARY KEY IDENTITY(1,1),           -- Identificador único
    clave NVARCHAR(100) NOT NULL UNIQUE,               -- Clave de configuración
    valor NVARCHAR(MAX),                               -- Valor de configuración
    tipo_dato NVARCHAR(20) DEFAULT 'string',           -- Tipo de dato: string, number, boolean, json
    categoria NVARCHAR(50),                            -- Categoría: General, Actas, QR, Alertas, etc.
    descripcion NVARCHAR(255),                         -- Descripción del parámetro
    editable BIT DEFAULT 1,                            -- Indica si es editable por usuario (1=Sí, 0=No)
    fecha_creacion DATETIME DEFAULT GETDATE(),         -- Fecha de creación
    fecha_modificacion DATETIME,                       -- Fecha de última modificación
    modificado_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que modificó
);
GO

-- ----------------------------------------------------------------------------
-- TABLA: regularizaciones_activos
-- Descripción: Regularizaciones históricas de activos
-- Permite cambiar estados manualmente sin acta de entrega/devolución
-- Para corregir inconsistencias del sistema anterior
-- ----------------------------------------------------------------------------
CREATE TABLE regularizaciones_activos (
    id_regularizacion INT PRIMARY KEY IDENTITY(1,1),   -- Identificador único
    id_activo INT FOREIGN KEY REFERENCES activos(id_activo), -- Activo regularizado
    estado_anterior NVARCHAR(50),                      -- Estado antes de la regularización
    estado_nuevo NVARCHAR(50) NOT NULL,                -- Estado después de la regularización
    motivo NVARCHAR(MAX) NOT NULL,                     -- Motivo obligatorio de la regularización
    observaciones NVARCHAR(MAX),                       -- Observaciones adicionales
    ruta_adjunto NVARCHAR(500),                        -- Ruta de documento justificativo (opcional)
    fecha_regularizacion DATETIME DEFAULT GETDATE(),   -- Fecha de la regularización
    id_usuario INT FOREIGN KEY REFERENCES usuarios(id_usuario), -- Usuario que realiza la regularización
    fecha_creacion DATETIME DEFAULT GETDATE()          -- Fecha de creación
);

-- Índice para búsqueda por activo
CREATE INDEX IX_regularizaciones_activo ON regularizaciones_activos(id_activo);
-- Índice para filtrado por fecha
CREATE INDEX IX_regularizaciones_fecha ON regularizaciones_activos(fecha_regularizacion);
GO

-- ----------------------------------------------------------------------------
-- TABLA: qr_historial
-- Descripción: Historial de códigos QR generados
-- Registra cada generación/reimpresión de QR
-- ----------------------------------------------------------------------------
CREATE TABLE qr_historial (
    id_qr_historial INT PRIMARY KEY IDENTITY(1,1),     -- Identificador único
    id_activo INT FOREIGN KEY REFERENCES activos(id_activo), -- Activo asociado
    contenido_qr NVARCHAR(MAX),                        -- Contenido codificado en el QR
    ruta_imagen NVARCHAR(500),                         -- Ruta de la imagen QR generada
    tipo_impresion NVARCHAR(50),                       -- Tipo: Individual, Masivo
    plantilla_usada NVARCHAR(100),                     -- Plantilla utilizada
    es_reimpresion BIT DEFAULT 0,                      -- Indica si es reimpresión (1=Sí, 0=No)
    id_qr_original INT,                                -- Referencia al QR original (si es reimpresión)
    fecha_generacion DATETIME DEFAULT GETDATE(),       -- Fecha de generación
    generado_por INT FOREIGN KEY REFERENCES usuarios(id_usuario)  -- Usuario que generó
);

-- Índice para búsqueda por activo
CREATE INDEX IX_qr_historial_activo ON qr_historial(id_activo);
GO

-- ----------------------------------------------------------------------------
-- TABLA: importaciones_csv
-- Descripción: Registro de importaciones desde archivos CSV
-- Permite auditoría y trazabilidad de migraciones
-- ----------------------------------------------------------------------------
CREATE TABLE importaciones_csv (
    id_importacion INT PRIMARY KEY IDENTITY(1,1),      -- Identificador único
    tipo_importacion NVARCHAR(50) NOT NULL,            -- Tipo: Activos, Responsables, Movimientos
    nombre_archivo NVARCHAR(255) NOT NULL,             -- Nombre del archivo CSV
    ruta_archivo NVARCHAR(500),                        -- Ruta del archivo procesado
    total_registros INT,                               -- Total de registros en el archivo
    registros_exitosos INT DEFAULT 0,                  -- Cantidad de registros importados correctamente
    registros_fallidos INT DEFAULT 0,                  -- Cantidad de registros con error
    registros_omitidos INT DEFAULT 0,                  -- Cantidad de registros omitidos (duplicados, incompletos)
    errores_detalle NVARCHAR(MAX),                     -- Detalle de errores encontrados (JSON)
    estado_importacion NVARCHAR(50) DEFAULT 'Procesando', -- Estado: Procesando, Completada, Fallida
    fecha_importacion DATETIME DEFAULT GETDATE(),      -- Fecha de importación
    id_usuario INT FOREIGN KEY REFERENCES usuarios(id_usuario), -- Usuario que importó
    fecha_creacion DATETIME DEFAULT GETDATE()          -- Fecha de creación
);

-- Índice para filtrado por fecha
CREATE INDEX IX_importaciones_csv_fecha ON importaciones_csv(fecha_importacion);
GO

-- ----------------------------------------------------------------------------
-- TABLA: logs
-- Descripción: Auditoría completa del sistema
-- Registra todas las operaciones importantes
-- ----------------------------------------------------------------------------
CREATE TABLE logs (
    id_log BIGINT PRIMARY KEY IDENTITY(1,1),           -- Identificador único (BIGINT para alto volumen)
    tipo_operacion NVARCHAR(50) NOT NULL,              -- Tipo: INSERT, UPDATE, DELETE, LOGIN, LOGOUT, ERROR
    tabla_afectada NVARCHAR(50),                       -- Tabla afectada por la operación
    id_registro_afectado INT,                          -- ID del registro afectado
    descripcion NVARCHAR(MAX),                         -- Descripción detallada de la operación
    datos_anteriores NVARCHAR(MAX),                    -- Datos antes del cambio (JSON, para UPDATE/DELETE)
    datos_nuevos NVARCHAR(MAX),                        -- Datos después del cambio (JSON, para INSERT/UPDATE)
    id_usuario INT FOREIGN KEY REFERENCES usuarios(id_usuario), -- Usuario que realizó la operación
    ip_origen NVARCHAR(50),                            -- IP desde donde se realizó
    user_agent NVARCHAR(500),                          -- Navegador/dispositivo utilizado
    fecha_operacion DATETIME DEFAULT GETDATE()         -- Fecha y hora de la operación
);

-- Índice para búsquedas eficientes
CREATE INDEX IX_logs_tipo ON logs(tipo_operacion);
CREATE INDEX IX_logs_tabla ON logs(tabla_afectada);
CREATE INDEX IX_logs_fecha ON logs(fecha_operacion);
CREATE INDEX IX_logs_usuario ON logs(id_usuario);
GO

-- ----------------------------------------------------------------------------
-- DATOS INICIALES - ROLES
-- ----------------------------------------------------------------------------
PRINT 'Insertando roles iniciales...';

INSERT INTO roles (nombre_rol, descripcion, permisos, activo) VALUES
('Administrador', 'Acceso completo a todas las funcionalidades del sistema', 
 '{"activos": "CRUD", "responsables": "CRUD", "movimientos": "CRUD", "mantenciones": "CRUD", "configuracion": "CRUD", "usuarios": "CRUD", "reportes": "ALL", "alertas": "ALL"}', 1),
('Supervisor TI', 'Supervisión y validación de operaciones', 
 '{"activos": "CRUD", "responsables": "CRUD", "movimientos": "CRUD", "mantenciones": "CRUD", "configuracion": "READ", "usuarios": "READ", "reportes": "ALL", "alertas": "ALL"}', 1),
('Técnico TI', 'Operación básica y registro de activos', 
 '{"activos": "CRUD", "responsables": "READ", "movimientos": "CREATE,READ", "mantenciones": "CRUD", "configuracion": "READ", "usuarios": "NONE", "reportes": "BASIC", "alertas": "READ"}', 1),
('RRHH', 'Consulta de responsables y validación de robos', 
 '{"activos": "READ", "responsables": "READ", "movimientos": "READ", "mantenciones": "NONE", "configuracion": "NONE", "usuarios": "NONE", "reportes": "BASIC", "alertas": "READ"}', 1),
('Finanzas', 'Consulta patrimonial y validación de bajas', 
 '{"activos": "READ", "responsables": "READ", "movimientos": "READ", "mantenciones": "NONE", "configuracion": "NONE", "usuarios": "NONE", "reportes": "BASIC", "alertas": "READ"}', 1);

GO

-- ----------------------------------------------------------------------------
-- DATOS INICIALES - USUARIO ADMINISTRADOR
-- ----------------------------------------------------------------------------
PRINT 'Insertando usuario administrador por defecto...';
-- NOTA: La contraseña debe ser encriptada con bcrypt en producción
-- Password temporal: Admin123! (debe cambiarse en primer acceso)
INSERT INTO usuarios (nombre_usuario, password_hash, nombre_completo, email, id_rol, activo) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'Administrador del Sistema', 'admin@escs.cl', 1, 1);

GO

-- ----------------------------------------------------------------------------
-- DATOS INICIALES - CONFIGURACIÓN
-- ----------------------------------------------------------------------------
PRINT 'Insertando configuración inicial...';

INSERT INTO configuracion (clave, valor, tipo_dato, categoria, descripcion, editable) VALUES
('INSTITUCION_NOMBRE', 'Instituto Profesional Del Comercio Spa.', 'string', 'General', 'Nombre de la institución', 1),
('INSTITUCION_LOGO_RUTA', '/templates/logo_escs.png', 'string', 'General', 'Ruta del logo institucional', 1),
('ACTA_NUMERO_INICIAL', '1', 'number', 'Actas', 'Número inicial para actas', 0),
('ACTA_NUMERO_ACTUAL', '1', 'number', 'Actas', 'Número actual de acta', 0),
('ACTA_CIUDAD_DEFAULT', 'Santiago', 'string', 'Actas', 'Ciudad por defecto para actas', 1),
('ACTA_DIRECTOR_TI', 'Director de Tecnología de la Información', 'string', 'Actas', 'Cargo del director TI', 1),
('QR_TAMANO', '300', 'number', 'QR', 'Tamaño de imagen QR en píxeles', 1),
('QR_FORMATO', 'png', 'string', 'QR', 'Formato de imagen QR', 1),
('ALERTAS_EMAIL_ENABLED', 'false', 'boolean', 'Alertas', 'Habilitar notificaciones por email', 1),
('PAGINACION_DEFAULT', '25', 'number', 'General', 'Cantidad de registros por página', 1),
('ESTADOS_ACTIVOS', '["Disponible","Asignado","Con falla","En reparación","Baja","Robado reportado","Robado confirmado","Sin trazabilidad","Merma administrativa"]', 'json', 'Activos', 'Estados válidos para activos', 0),
('ACCESORIOS_DEFAULT', '["Mouse","Cargador","Bolso","Dock","Teclado","Auriculares"]', 'json', 'Activos', 'Accesorios por defecto', 1);

GO

-- ----------------------------------------------------------------------------
-- VISTAS ÚTILES
-- ----------------------------------------------------------------------------

-- Vista: Activos con su estado actual y responsable actual
CREATE OR ALTER VIEW vw_activos_responsables AS
SELECT 
    a.id_activo,
    a.eqp,
    a.serial,
    a.tipo_activo,
    a.marca,
    a.modelo,
    a.estado,
    a.ubicacion,
    r.id_responsable,
    r.rut,
    r.nombre_completo as nombre_responsable,
    r.area,
    r.cargo,
    m.numero_acta as ultima_acta,
    m.fecha_movimiento as fecha_ultima_asignacion
FROM activos a
LEFT JOIN movimiento_detalle md ON a.id_activo = md.id_activo
LEFT JOIN movimientos m ON md.id_movimiento = m.id_movimiento AND m.tipo_movimiento = 'Entrega'
LEFT JOIN responsables r ON m.id_responsable = r.id_responsable
WHERE m.id_movimiento = (
    SELECT TOP 1 m2.id_movimiento 
    FROM movimientos m2
    INNER JOIN movimiento_detalle md2 ON m2.id_movimiento = md2.id_movimiento
    WHERE md2.id_activo = a.id_activo 
    AND m2.tipo_movimiento = 'Entrega'
    ORDER BY m2.fecha_movimiento DESC
);
GO

-- Vista: Alertas activas con información completa
CREATE OR ALTER VIEW vw_alertas_completas AS
SELECT 
    al.id_alerta,
    al.tipo_alerta,
    al.titulo,
    al.descripcion,
    al.severidad,
    al.leida,
    al.resuelta,
    al.fecha_creacion,
    a.eqp as activo_eqp,
    a.serial as activo_serial,
    r.nombre_completo as responsable_nombre,
    r.rut as responsable_rut
FROM alertas al
LEFT JOIN activos a ON al.id_activo = a.id_activo
LEFT JOIN responsables r ON al.id_responsable = r.id_responsable;
GO

-- ----------------------------------------------------------------------------
-- TRIGGERS PARA AUDITORÍA
-- ----------------------------------------------------------------------------

-- Trigger: Registrar cambios en activos
CREATE OR ALTER TRIGGER trg_activos_audit ON activos
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    DECLARE @tipo_operacion NVARCHAR(50);
    
    IF EXISTS(SELECT * FROM INSERTED) AND EXISTS(SELECT * FROM DELETED)
        SET @tipo_operacion = 'UPDATE';
    ELSE IF EXISTS(SELECT * FROM INSERTED)
        SET @tipo_operacion = 'INSERT';
    ELSE
        SET @tipo_operacion = 'DELETE';

    IF @tipo_operacion = 'DELETE'
    BEGIN
        INSERT INTO logs (tipo_operacion, tabla_afectada, id_registro_afectado, descripcion, datos_anteriores)
        SELECT 
            @tipo_operacion,
            'activos',
            d.id_activo,
            'Eliminación de activo: ' + ISNULL(d.eqp, ''),
            (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        FROM DELETED d;
    END
    ELSE IF @tipo_operacion = 'INSERT'
    BEGIN
        INSERT INTO logs (tipo_operacion, tabla_afectada, id_registro_afectado, descripcion, datos_nuevos)
        SELECT 
            @tipo_operacion,
            'activos',
            i.id_activo,
            'Creación de activo: ' + ISNULL(i.eqp, ''),
            (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        FROM INSERTED i;
    END
    ELSE
    BEGIN
        INSERT INTO logs (tipo_operacion, tabla_afectada, id_registro_afectado, descripcion, datos_anteriores, datos_nuevos)
        SELECT 
            @tipo_operacion,
            'activos',
            i.id_activo,
            'Actualización de activo: ' + ISNULL(i.eqp, ''),
            (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        FROM INSERTED i
        INNER JOIN DELETED d ON i.id_activo = d.id_activo;
    END
END;
GO

-- Trigger: Actualizar fecha de modificación
CREATE OR ALTER TRIGGER trg_activos_update_fecha ON activos
AFTER UPDATE
AS
BEGIN
    UPDATE a
    SET fecha_modificacion = GETDATE()
    FROM activos a
    INNER JOIN INSERTED i ON a.id_activo = i.id_activo;
END;
GO

-- ----------------------------------------------------------------------------
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ----------------------------------------------------------------------------

-- SP: Obtener dashboard general
CREATE OR ALTER PROCEDURE sp_dashboard_general
AS
BEGIN
    SET NOCOUNT ON;

    -- Total activos por estado
    SELECT estado, COUNT(*) as cantidad
    FROM activos
    GROUP BY estado;

    -- Total responsables activos
    SELECT COUNT(*) as total_responsables
    FROM responsables
    WHERE activo = 1;

    -- Movimientos del mes actual
    SELECT COUNT(*) as movimientos_mes
    FROM movimientos
    WHERE MONTH(fecha_movimiento) = MONTH(GETDATE())
    AND YEAR(fecha_movimiento) = YEAR(GETDATE());

    -- Alertas pendientes
    SELECT COUNT(*) as alertas_pendientes
    FROM alertas
    WHERE leida = 0 OR resuelta = 0;

    -- Activos en mantención
    SELECT COUNT(*) as activos_en_mantencion
    FROM activos a
    WHERE a.estado = 'En reparación';
END;
GO

-- SP: Buscar activos por responsable
CREATE OR ALTER PROCEDURE sp_buscar_activos_por_responsable
    @rut_responsable NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        a.id_activo,
        a.eqp,
        a.serial,
        a.tipo_activo,
        a.marca,
        a.modelo,
        a.estado,
        m.numero_acta,
        m.fecha_movimiento
    FROM activos a
    INNER JOIN movimiento_detalle md ON a.id_activo = md.id_activo
    INNER JOIN movimientos m ON md.id_movimiento = m.id_movimiento
    INNER JOIN responsables r ON m.id_responsable = r.id_responsable
    WHERE r.rut = @rut_responsable
    AND m.tipo_movimiento = 'Entrega'
    AND a.estado = 'Asignado'
    AND m.id_movimiento = (
        SELECT TOP 1 m2.id_movimiento
        FROM movimientos m2
        INNER JOIN movimiento_detalle md2 ON m2.id_movimiento = md2.id_movimiento
        WHERE md2.id_activo = a.id_activo
        AND m2.tipo_movimiento = 'Entrega'
        ORDER BY m2.fecha_movimiento DESC
    );
END;
GO

-- SP: Validar si un activo está disponible para entrega
CREATE OR ALTER PROCEDURE sp_validar_activo_disponible
    @id_activo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        CASE WHEN estado = 'Disponible' THEN 1 ELSE 0 END as disponible,
        estado,
        eqp,
        serial
    FROM activos
    WHERE id_activo = @id_activo;
END;
GO

-- ----------------------------------------------------------------------------
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ----------------------------------------------------------------------------

-- Índices compuestos para consultas frecuentes
CREATE INDEX IX_movimientos_fecha_tipo ON movimientos(fecha_movimiento, tipo_movimiento);
CREATE INDEX IX_activos_estado_tipo ON activos(estado, tipo_activo);
CREATE INDEX IX_responsables_area_activo ON responsables(area, activo);

GO

-- ----------------------------------------------------------------------------
-- FIN DEL SCRIPT
-- ----------------------------------------------------------------------------
PRINT 'Script de creación de base de datos completado exitosamente.';
PRINT 'Base de datos: InventarioESCS';
PRINT 'Versión: 1.0.0';
PRINT 'Fecha: ' + CONVERT(NVARCHAR, GETDATE(), 103);

GO
