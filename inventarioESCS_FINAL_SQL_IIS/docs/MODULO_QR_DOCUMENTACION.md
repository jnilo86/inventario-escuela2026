# 📱 MÓDULO DE CÓDIGOS QR - DOCUMENTACIÓN TÉCNICA

## Descripción General

El módulo de códigos QR permite generar, gestionar e imprimir etiquetas de identificación patrimonial para activos tecnológicos del Instituto Profesional Del Comercio Spa.

## ⚠️ REGLA CRÍTICA

**Los QR NO se generan automáticamente al crear activos.**  
Solo se generan cuando el usuario selecciona explícitamente "Imprimir plantilla" o "Generar QR".

---

## 🎯 Características Principales

### 1. Información Codificada en el QR

Cada código QR contiene la siguiente información institucional:

```
EQUIPO: {Tipo de activo}
MARCA: {Marca}
MODELO: {Modelo}
SERIAL: {Número de serie}
EQP: {Código EQP institucional}
INSTITUTO PROFESIONAL DEL COMERCIO SPA.
```

**Opcionalmente** puede incluir URL al detalle del activo en el sistema.

### 2. Tamaños de Pegatina Disponibles

El sistema ofrece 6 tamaños predefinidos:

| ID | Nombre | Dimensiones (mm) | DPI | Margen (mm) |
|----|--------|------------------|-----|-------------|
| 1 | Pequeña | 20x20 | 300 | 2 |
| 2 | Mediana | 30x30 | 300 | 3 |
| 3 | Grande | 40x40 | 300 | 4 |
| 4 | Rectangular Pequeña | 40x25 | 300 | 3 |
| 5 | Rectangular Mediana | 60x40 | 300 | 4 |
| 6 | Etiqueta A4 Completa | 210x297 | 300 | 10 |

**Tamaño por defecto:** Mediana (30x30mm) - ID 2

### 3. Formatos de Salida Soportados

- **PNG** (recomendado para impresión)
- **SVG** (vectorial, escalable)
- **PDF** (pendiente implementación completa)

---

## 📡 ENDPOINTS DE LA API

### Base URL
```
http://localhost:3000/api/qr
```

### 1. Generación Masiva de QR

**Endpoint:** `POST /api/qr/generar-masivo`

**Descripción:** Genera códigos QR para múltiples activos seleccionados simultáneamente.

#### Request Body

```json
{
  "activosIds": [1, 2, 3],
  "tamanoId": 2,
  "incluirURL": false,
  "urlBase": "https://sistema.instituto.cl",
  "formatoSalida": "png",
  "observaciones": "Impresión inicial de activos"
}
```

#### Campos del Request

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `activosIds` | number[] | ✅ Sí | - | IDs de activos a procesar (1 o más) |
| `tamanoId` | number | ❌ No | 2 | ID de tamaño de pegatina (1-6) |
| `incluirURL` | boolean | ❌ No | false | Si incluye URL institucional |
| `urlBase` | string | ❌ No | - | URL base del sistema |
| `formatoSalida` | string | ❌ No | "png" | Formato: png, svg, pdf |
| `observaciones` | string | ❌ No | - | Observaciones opcionales |

#### Response Exitosa

```json
{
  "exito": true,
  "mensaje": "Se generaron exitosamente 3 código(s) QR",
  "totalProcesados": 3,
  "totalExitosos": 3,
  "totalFallidos": 0,
  "resultados": [
    {
      "activoId": 1,
      "eqp": "EQP-2024-00123",
      "exito": true,
      "qrPath": "/uploads/qr/QR_EQP-2024-00123_2025-01-15T10-30-00.png",
      "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
      "tamanio": {
        "nombre": "Mediana (30x30mm)",
        "ancho_mm": 30,
        "alto_mm": 30,
        "dpi": 300,
        "margen_mm": 3
      }
    }
  ],
  "fechaGeneracion": "2025-01-15T10:30:00.000Z",
  "usuarioResponsable": "Usuario_5"
}
```

#### Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | Generación exitosa (al menos 1 QR) |
| 400 | Request inválido (sin activosIds) |
| 401 | No autorizado (token inválido) |
| 500 | Error interno del servidor |

---

### 2. Generación Individual de QR

**Endpoint:** `POST /api/qr/generar/:activoId`

**Descripción:** Genera QR para un solo activo (método conveniente).

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `activoId` | number | ID del activo a procesar |

#### Query Parameters (Opcionales)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `tamanoId` | number | 2 | ID de tamaño de pegatina |
| `formato` | string | "png" | Formato de salida |

#### Ejemplo de Uso

```bash
curl -X POST http://localhost:3000/api/qr/generar/123?tamanoId=3&formato=png \
  -H "Authorization: Bearer TOKEN_JWT"
```

---

### 3. Obtener Historial de QR

**Endpoint:** `GET /api/qr/historial/:activoId`

**Descripción:** Obtiene historial completo de QR generados para un activo específico.

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `activoId` | number | ID del activo |

#### Response

```json
{
  "exito": true,
  "activoId": 123,
  "totalRegistros": 5,
  "historial": [
    {
      "id_historial": 45,
      "activo_id": 123,
      "eqp": "EQP-2024-00123",
      "fecha_generacion": "2025-01-15T10:30:00.000Z",
      "usuario_id": 5,
      "tamano_nombre": "Mediana (30x30mm)",
      "formato_salida": "png",
      "ruta_archivo": "/uploads/qr/QR_EQP-2024-00123_2025-01-15T10-30-00.png",
      "observaciones": "Impresión inicial",
      "reimpresion": false
    }
  ]
}
```

---

### 4. Obtener Tamaños Disponibles

**Endpoint:** `GET /api/qr/tamanos-disponibles`

**Descripción:** Lista todos los tamaños de pegatina disponibles para selección del usuario.

#### Response

```json
{
  "exito": true,
  "total": 6,
  "tamanos": [
    {
      "nombre": "Pequeña (20x20mm)",
      "ancho_mm": 20,
      "alto_mm": 20,
      "dpi": 300,
      "margen_mm": 2
    },
    ...
  ]
}
```

---

### 5. Reimpresión de QR

**Endpoint:** `POST /api/qr/reimprimir/:activoId`

**Descripción:** Genera QR de reimpresión, registrando como tal en el historial para auditoría.

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `activoId` | number | ID del activo |

#### Request Body (Opcional)

```json
{
  "tamanoId": 3,
  "formato": "png",
  "observaciones": "Reimpresión por deterioro de etiqueta"
}
```

#### Response

```json
{
  "exito": true,
  "mensaje": "QR reimprimido exitosamente",
  "resultado": {
    "activoId": 123,
    "eqp": "EQP-2024-00123",
    "exito": true,
    "qrPath": "/uploads/qr/QR_EQP-2024-00123_2025-01-15T14-20-00.png",
    "tamanio": { ... }
  }
}
```

---

## 💾 ESTRUCTURA DE BASE DE DATOS

### Tabla: `qr_historial`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_historial` | INT | Primary Key, autoincremental |
| `activo_id` | INT | ID del activo asociado |
| `eqp` | NVARCHAR(50) | Código EQP institucional |
| `fecha_generacion` | DATETIME | Fecha/hora de generación |
| `usuario_id` | INT | Usuario que generó el QR |
| `tamano_nombre` | NVARCHAR(100) | Nombre del tamaño usado |
| `formato_salida` | NVARCHAR(20) | Formato: png, svg, pdf |
| `ruta_archivo` | NVARCHAR(500) | Ruta relativa del archivo |
| `observaciones` | NVARCHAR(MAX) | Observaciones opcionales |
| `reimpresion` | BIT | 1=Sí, 0=No |

### Índices

```sql
CREATE INDEX IX_qr_historial_activo ON qr_historial(activo_id);
CREATE INDEX IX_qr_historial_eqp ON qr_historial(eqp);
CREATE INDEX IX_qr_historial_fecha ON qr_historial(fecha_generacion);
CREATE INDEX IX_qr_historial_usuario ON qr_historial(usuario_id);
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

### Backend

```
backend/src/
├── services/
│   └── qr.service.ts          # Lógica principal de generación QR
├── routes/
│   └── qr.routes.ts           # Endpoints de la API
└── config/
    └── database.ts            # Conexión SQL Server
```

### Frontend (Pendiente Implementación)

```
frontend/src/
├── pages/
│   └── QRGestionPage.tsx      # Página de gestión de QR
├── components/
│   ├── QRGenerator.tsx        # Componente generador
│   ├── QRSizeSelector.tsx     # Selector de tamaños
│   └── QRHistory.tsx          # Historial de QR
└── services/
    └── qr.service.ts          # Cliente API QR
```

### Archivos Generados

```
uploads/qr/
├── QR_EQP-2024-00123_2025-01-15T10-30-00.png
├── QR_EQP-2024-00124_2025-01-15T10-30-01.png
└── QR_EQP-2024-00125_2025-01-15T10-30-02.svg
```

---

## 🔧 CONFIGURACIÓN TÉCNICA

### Dependencias Requeridas

El backend utiliza las siguientes librerías:

```json
{
  "qrcode": "^1.5.3",           // Generación de códigos QR
  "mssql": "^10.0.1",           // Conexión SQL Server
  "uuid": "^9.0.0"              // Generación de UUIDs
}
```

### Instalación de Dependencias

```bash
cd backend
npm install qrcode uuid
npm install --save-dev @types/qrcode @types/uuid
```

### Variables de Entorno

No se requieren variables adicionales específicas para QR. El servicio usa:

- `process.cwd()` para determinar ruta base
- Pool de conexiones existente de SQL Server

---

## 🎨 FLUJO DE USO TÍPICO

### Escenario 1: Impresión Inicial de Activos Nuevos

1. Usuario navega a lista de activos
2. Selecciona checkboxes de activos recién ingresados
3. Click en botón "Imprimir Plantillas QR"
4. Sistema muestra modal con:
   - Vista previa de activos seleccionados
   - Selector de tamaño de pegatina
   - Selector de formato (PNG/SVG)
   - Campo de observaciones
5. Usuario confirma generación
6. Backend:
   - Valida existencia de activos
   - Obtiene información (EQP, serial, modelo, tipo)
   - Genera archivos QR individuales
   - Guarda en `uploads/qr/`
   - Registra en `qr_historial`
7. Frontend muestra resultados y ofrece descarga individual o paquete ZIP

### Escenario 2: Reimpresión por Deterioro

1. Usuario busca activo por EQP o serial
2. En detalle del activo, click en "Reimprimir QR"
3. Sistema muestra historial de QR previos
4. Usuario selecciona tamaño (puede ser diferente al original)
5. Ingresa motivo de reimpresión
6. Sistema genera nuevo QR marcándolo como reimpresión
7. Historial mantiene ambos registros para auditoría

### Escenario 3: Auditoría de QR Generados

1. Supervisor TI accede a reporte de QR
2. Filtra por fecha, usuario o activo
3. Sistema muestra:
   - Total QR generados en período
   - QR por usuario responsable
   - Reimpresiones realizadas
   - Tamaños más utilizados
4. Exporta reporte a Excel/PDF

---

## ✅ VALIDACIONES Y REGLAS DE NEGOCIO

### Validaciones de Entrada

1. **ActivosIds no vacío**: Debe proporcionar al menos 1 ID
2. **IDs numéricos positivos**: Todos los IDs deben ser > 0
3. **TamanoId válido**: Si se proporciona, debe estar entre 1-6
4. **Formato soportado**: Solo png, svg, pdf permitidos

### Reglas de Negocio

1. **No generación automática**: QR solo se genera por acción explícita del usuario
2. **Historial obligatorio**: Toda generación debe registrarse en BD
3. **Reimpresión trazable**: Reimpresiones deben marcarse como tal
4. **Información consistente**: QR debe reflejar datos actuales del activo

### Manejo de Errores

| Situación | Comportamiento |
|-----------|---------------|
| Activo no existe | Marca como fallido, continúa con demás |
| Sin código EQP | Usa "S/EQP" en contenido QR |
| Sin serial | Usa "S/Serial" en contenido QR |
| Error de BD | Loguea error, no lanza excepción al usuario |
| Archivo no se guarda | Registra en historial igual, alerta en logs |

---

## 🔐 SEGURIDAD

### Autenticación

Todos los endpoints requieren autenticación JWT vía header:

```
Authorization: Bearer <token_jwt>
```

### Autorización

Roles recomendados para operaciones QR:

| Operación | Roles Permitidos |
|-----------|-----------------|
| Generar QR | Técnico TI, Supervisor TI, Administrador |
| Reimprimir QR | Técnico TI, Supervisor TI, Administrador |
| Ver historial | Todos los roles autenticados |
| Configurar plantillas | Solo Administrador |

### Auditoría

El sistema registra:
- Usuario que genera cada QR
- Fecha y hora exacta
- Tamaño y formato utilizado
- Si es reimpresión o primera vez
- Observaciones proporcionadas

---

## 📊 MÉTRICAS Y REPORTES

### Consultas Útiles

#### Total QR generados por mes

```sql
SELECT 
  YEAR(fecha_generacion) AS anio,
  MONTH(fecha_generacion) AS mes,
  COUNT(*) as total_qr
FROM qr_historial
GROUP BY YEAR(fecha_generacion), MONTH(fecha_generacion)
ORDER BY anio DESC, mes DESC;
```

#### QR por usuario

```sql
SELECT 
  u.nombre,
  u.rut,
  COUNT(qh.id_historial) as total_qr_generados
FROM qr_historial qh
INNER JOIN usuarios u ON qh.usuario_id = u.id_usuario
GROUP BY u.nombre, u.rut
ORDER BY total_qr_generados DESC;
```

#### Reimpresiones por activo

```sql
SELECT 
  qh.activo_id,
  a.eqp,
  COUNT(*) as veces_reimpreso
FROM qr_historial qh
INNER JOIN activos a ON qh.activo_id = a.id_activo
WHERE qh.reimpresion = 1
GROUP BY qh.activo_id, a.eqp
HAVING COUNT(*) > 1
ORDER BY veces_reimpreso DESC;
```

---

## 🚀 PRÓXIMAS MEJORAS (PENDIENTES)

1. **Paquete ZIP**: Crear archivo ZIP con múltiples QR para descarga masiva
2. **Plantillas PDF**: Diseño de plantillas de impresión con logos institucional
3. **Código de Barras**: Soporte adicional para código de barras lineal
4. **Vista Previa**: Mostrar vista previa de QR antes de imprimir
5. **Editor de Plantillas**: Interfaz para personalizar diseño de pegatinas
6. **Lotes de Impresión**: Agrupar QR por lotes para impresión eficiente
7. **Escáner QR**: Módulo para escanear QR y mostrar información del activo

---

## 📞 SOPORTE TÉCNICO

Para problemas o consultas sobre este módulo:

- **Email**: soporte.ti@instituto.cl
- **Extensión**: 1234
- **Horario**: Lunes a Viernes, 9:00 - 18:00

---

**Última Actualización:** Enero 2025  
**Versión del Módulo:** 1.0.0  
**Autor:** Departamento TI - Instituto Profesional Del Comercio Spa.
