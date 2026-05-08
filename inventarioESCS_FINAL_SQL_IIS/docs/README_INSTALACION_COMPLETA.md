# Inventario ESCS - Sistema de Gestión Patrimonial TI

## Descripción General

**Inventario ESCS** es un sistema institucional completo para la gestión patrimonial de activos tecnológicos, diseñado específicamente para el Instituto Profesional Del Comercio Spa.

### Características Principales

- ✅ Gestión completa de activos tecnológicos (TI)
- ✅ Control de responsables y asignaciones
- ✅ Entregas y devoluciones con actas oficiales
- ✅ Generación de códigos QR institucionales
- ✅ Migración desde sistema heredado CSV
- ✅ Trazabilidad completa de movimientos
- ✅ Reportes y alertas institucionales
- ✅ Instalación automatizada para usuarios no técnicos

## Requisitos del Sistema

### Hardware Mínimo
- Procesador: Intel Core i3 o equivalente
- RAM: 8 GB mínimo (16 GB recomendado)
- Almacenamiento: 50 GB libres
- Conexión a red local

### Software Requerido
- **Sistema Operativo**: Windows Server 2019/2022 o Windows 10/11 Pro
- **Base de Datos**: SQL Server 2019/2022 Express o superior
- **Servidor Web**: IIS (Internet Information Services)
- **Runtime**: Node.js 18.x o superior
- **Navegador**: Chrome, Edge o Firefox (últimas versiones)

## Instalación Automática

### Opción 1: Script PowerShell (Recomendado)

```powershell
# Ejecutar como Administrador
.\install\instalar_completo.ps1
```

### Opción 2: Script Batch

```batch
# Ejecutar como Administrador
install\instalar_completo.bat
```

### Pasos de Instalación Manual

Si prefiere instalar manualmente, siga estos pasos:

#### 1. Configurar SQL Server

```sql
-- Ejecutar en SQL Server Management Studio
CREATE DATABASE InventarioESCS;
GO

USE InventarioESCS;
GO

-- Ejecutar scripts de creación de tablas
-- Ver database/scripts/01_creacion_tablas.sql
```

#### 2. Instalar Backend

```bash
cd backend
npm install
npm run build
```

#### 3. Instalar Frontend

```bash
cd frontend
npm install
npm run build
```

#### 4. Configurar IIS

1. Abrir IIS Manager
2. Crear nuevo sitio web
3. Apuntar a `frontend/dist`
4. Configurar application pool para Node.js
5. Establecer permisos de lectura/escritura

#### 5. Configurar Variables de Entorno

Crear archivo `.env` en `backend/`:

```env
PORT=3000
SQL_SERVER=localhost
SQL_DATABASE=InventarioESCS
SQL_USER=sa
SQL_PASSWORD=SuPasswordSeguro
NODE_ENV=production
```

## Estructura del Proyecto

```
inventarioESCS_FINAL_SQL_IIS/
├── frontend/              # Aplicación React + Vite + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── services/      # Servicios API
│   │   ├── utils/         # Utilidades
│   │   └── styles/        # Estilos CSS
│   └── dist/              # Build de producción
├── backend/               # API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/   # Controladores
│   │   ├── middleware/    # Middleware (auth, validaciones)
│   │   ├── models/        # Modelos de datos
│   │   ├── routes/        # Rutas API
│   │   ├── services/      # Servicios de negocio
│   │   └── utils/         # Utilidades
│   └── dist/              # Build de producción
├── database/              # Scripts SQL
│   └── scripts/           # Scripts de creación y migración
├── install/               # Scripts de instalación
├── templates/             # Plantillas de documentos
│   └── actas/             # Plantillas de actas
├── uploads/               # Archivos subidos
│   ├── firmas/            # Firmas digitales
│   ├── actas/             # Actas generadas
│   └── qr/                # Códigos QR
└── docs/                  # Documentación
```

## Módulos del Sistema

### 1. Gestión de Activos

- CRUD completo de activos tecnológicos
- Estados institucionales:
  - Disponible
  - Asignado
  - Con falla
  - En reparación
  - Baja
  - Robado reportado
  - Robado confirmado
  - Sin trazabilidad
  - Merma administrativa
- Validación de serial único
- Generación automática de EQP
- Carga masiva desde CSV
- Escaneo QR y código de barras

### 2. Gestión de Responsables

- CRUD de responsables
- Activar/Desactivar responsables
- Historial de asignaciones
- Filtros avanzados
- Exportación de datos

### 3. Entregas

- Actas de entrega con múltiples activos
- Validación: solo activos "Disponibles"
- Selección de accesorios
- Generación de acta PDF institucional
- Firma digital
- Cambio automático de estado a "Asignado"

### 4. Devoluciones

- Devolución de activos asignados
- Selección de estado final por activo
- Acta de devolución institucional
- Registro de observaciones
- Validación por RUT

### 5. Códigos QR

- Generación individual y masiva
- Plantillas imprimibles
- Historial de QR generados
- Reimpresión de pegatinas
- NO se genera automáticamente al crear activo

### 6. Regularización Histórica

- Cambio manual de estados sin acta previa
- Motivo obligatorio
- Auditoría permanente
- Adjuntos opcionales

### 7. Migración CSV

- Importación desde sistema heredado
- Mapeo de campos
- Validación de duplicados
- Reporte de errores
- Regularización posterior

### 8. Reportes

- Dashboard general
- Activos por estado
- Responsables
- Entregas y devoluciones
- Incumplimientos
- Mantenciones
- Regularizaciones
- Exportación: CSV, Excel, PDF

### 9. Alertas

- Activos asignados sin acta
- Serial duplicado
- Desactivados con activos
- Activos sin trazabilidad
- Robados
- Sin devolución
- Importación fallida

### 10. Configuración

- Estados personalizables
- Tipos de activos
- Accesorios
- Motivos de regularización
- Áreas y cargos
- Plantillas QR y actas

## Seguridad y Roles

### Roles Disponibles

1. **Técnico TI**: Operación básica, registro de activos
2. **Supervisor TI**: Validaciones, reportes, alertas
3. **RRHH**: Consulta de responsables, validación de robos
4. **Finanzas**: Consulta patrimonial, validación de bajas
5. **Administrador**: Configuración completa, usuarios, roles

## Base de Datos

### Tablas Principales

- `activos`: Registro de activos tecnológicos
- `responsables`: Personas responsables de activos
- `movimientos`: Cabecera de movimientos (entregas/devoluciones)
- `movimiento_detalle`: Detalle de activos por movimiento
- `movimiento_accesorios`: Accesorios por movimiento
- `mantenciones`: Registro de mantenciones
- `adjuntos`: Archivos adjuntos a movimientos
- `alertas`: Alertas del sistema
- `configuracion`: Parámetros configurables
- `regularizaciones_activos`: Regularizaciones históricas
- `qr_historial`: Historial de QR generados
- `importaciones_csv`: Registro de importaciones
- `usuarios`: Usuarios del sistema
- `roles`: Roles de seguridad
- `logs`: Auditoría del sistema

Ver `docs/DICCIONARIO_TECNICO.md` para detalle completo.

## Uso del Sistema

### Primer Acceso

1. Navegar a `http://localhost:3000` (o URL configurada)
2. Usuario inicial: `admin`
3. Contraseña inicial: `Admin123!` (cambiar inmediatamente)

### Flujo Básico de Operación

#### Registrar Nuevo Activo

1. Ir a módulo "Activos"
2. Click en "Nuevo Activo"
3. Completar información requerida
4. Guardar (estado inicial: "Disponible")
5. Opcional: Generar QR posteriormente

#### Realizar Entrega

1. Ir a módulo "Entregas"
2. Buscar responsable por RUT
3. Seleccionar uno o más activos disponibles
4. Seleccionar accesorios (checkbox)
5. Generar acta
6. Adjuntar firma
7. Confirmar entrega

#### Realizar Devolución

1. Ir a módulo "Devoluciones"
2. Buscar responsable por RUT
3. Sistema muestra SOLO activos asignados a ese responsable
4. Seleccionar activos a devolver
5. Elegir estado final para cada activo
6. Registrar observaciones
7. Generar acta de devolución

#### Generar QR

1. Ir a módulo "Activos"
2. Seleccionar activo(s)
3. Click en "Imprimir plantilla QR"
4. Elegir formato de impresión
5. Imprimir pegatina

## Migración desde Sistema Anterior

Ver `docs/MIGRACION_SISTEMA_ANTERIOR.md` para guía detallada.

### Pasos Generales

1. Preparar archivos CSV heredados
2. Ir a módulo "Importación CSV"
3. Seleccionar tipo de importación
4. Cargar archivo CSV
5. Revisar vista previa
6. Corregir errores si existen
7. Confirmar importación
8. Regularizar estados si es necesario

## Soporte y Mantenimiento

### Logs del Sistema

Los logs se encuentran en:
- Backend: `backend/logs/`
- Base de datos: tabla `logs`
- IIS: `C:\inetpub\logs\LogFiles\`

### Backup de Base de Datos

```sql
-- Ejecutar regularmente
BACKUP DATABASE InventarioESCS
TO DISK = 'C:\Backups\InventarioESCS_YYYYMMDD.bak'
WITH FORMAT, INIT, SKIP;
```

### Actualizaciones

1. Detener servicio IIS
2. Realizar backup de base de datos
3. Ejecutar scripts de migración en `database/scripts/migrations/`
4. Reemplazar archivos de frontend y backend
5. Reiniciar servicio IIS

## Contacto

Para soporte técnico, contactar al Departamento de TI.

---

**Instituto Profesional Del Comercio Spa.**  
**Departamento de Tecnología de la Información**  
**Versión 1.0.0 - 2024**
