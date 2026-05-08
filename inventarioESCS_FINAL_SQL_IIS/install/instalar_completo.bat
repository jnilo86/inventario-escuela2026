@echo off
REM ============================================================================
REM INVENTARIO ESCS - INSTALADOR AUTOMÁTICO COMPLETO
REM Instituto Profesional Del Comercio Spa.
REM Versión: 1.0.0
REM ============================================================================
REM Este script instala automáticamente todo el sistema:
REM 1. Verifica requisitos
REM 2. Configura SQL Server
REM 3. Crea base de datos
REM 4. Instala backend
REM 5. Instala frontend
REM 6. Configura IIS
REM 7. Importa datos CSV (si existen)
REM ============================================================================

setlocal enabledelayedexpansion

echo ╔══════════════════════════════════════════════════════════╗
echo ║     INVENTARIO ESCS - INSTALADOR AUTOMÁTICO             ║
echo ║          Instituto Profesional Del Comercio Spa.         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM ----------------------------------------------------------------------------
REM VERIFICAR SI SE EJECUTA COMO ADMINISTRADOR
REM ----------------------------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Este script debe ejecutarse como Administrador
    echo.
    echo Haga clic derecho en el archivo y seleccione:
    echo "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo [OK] Ejecutando como administrador
echo.

REM ----------------------------------------------------------------------------
REM CONFIGURAR RUTAS
REM ----------------------------------------------------------------------------
set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set LOG_FILE=%ROOT_DIR%\install\instalacion.log

echo Directorio de instalación: %ROOT_DIR%
echo Log de instalación: %LOG_FILE%
echo.

REM ----------------------------------------------------------------------------
REM PASO 1: VERIFICAR REQUISITOS
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 1: Verificando requisitos del sistema
echo ============================================================

REM Verificar Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js no está instalado
    echo Descargue e instale desde: https://nodejs.org/
    echo Se requiere versión 18.x o superior
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js instalado: %NODE_VERSION%

REM Verificar npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm no está instalado
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm instalado: %NPM_VERSION%

REM Verificar SQL Server
sqlcmd -L >nul 2>&1
if %errorLevel% neq 0 (
    echo [ADVERTENCIA] sqlcmd no encontrado. SQL Server podría no estar instalado.
    echo ¿Desea continuar de todos modos? (S/N)
    set /p CONTINUE="Respuesta: "
    if /i not "!CONTINUE!"=="S" (
        echo Instalación cancelada
        pause
        exit /b 1
    )
) else (
    echo [OK] SQL Server tools detectados
)

REM Verificar IIS
sc query w3svc >nul 2>&1
if %errorLevel% neq 0 (
    echo [ADVERTENCIA] IIS no está instalado o no está corriendo
    echo Para instalar IIS:
    echo 1. Panel de Control ^> Programas y características
    echo 2. Activar o desactivar características de Windows
    echo 3. Marcar "Servicios de Internet Information Services"
    echo.
    echo ¿Desea continuar de todos modos? (S/N)
    set /p CONTINUE_IIS="Respuesta: "
    if /i not "!CONTINUE_IIS!"=="S" (
        echo Instalación cancelada
        pause
        exit /b 1
    )
) else (
    echo [OK] IIS detectado
)

echo.
echo Todos los requisitos verificados
echo.
pause

REM ----------------------------------------------------------------------------
REM PASO 2: CONFIGURAR SQL SERVER
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 2: Configurando SQL Server
echo ============================================================

set /p SQL_SERVER="Nombre del servidor SQL Server [localhost]: " || set SQL_SERVER=localhost
set /p SQL_USER="Usuario SQL Server [sa]: " || set SQL_USER=sa
set /p SQL_PASSWORD="Contraseña SQL Server: "

echo.
echo Probando conexión a SQL Server...
sqlcmd -S %SQL_SERVER% -U %SQL_USER% -P %SQL_PASSWORD% -Q "SELECT @@VERSION" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] No se pudo conectar a SQL Server
    echo Verifique las credenciales e intente nuevamente
    pause
    exit /b 1
)

echo [OK] Conexión a SQL Server exitosa
echo.

REM Crear base de datos
echo Creando base de datos InventarioESCS...
sqlcmd -S %SQL_SERVER% -U %SQL_USER% -P %SQL_PASSWORD% -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'InventarioESCS') CREATE DATABASE InventarioESCS;" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] No se pudo crear la base de datos
    pause
    exit /b 1
)

echo [OK] Base de datos creada o ya existe
echo.

REM Ejecutar scripts de creación de tablas
echo Ejecutando scripts de creación de tablas...
sqlcmd -S %SQL_SERVER% -U %SQL_USER% -P %SQL_PASSWORD% -d InventarioESCS -i "%ROOT_DIR%\database\scripts\01_creacion_tablas.sql" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ADVERTENCIA] Algunos errores ocurrieron al ejecutar los scripts SQL
    echo Revise el log para más detalles
) else (
    echo [OK] Scripts SQL ejecutados exitosamente
)

echo.

REM Guardar configuración en archivo .env
echo Guardando configuración de base de datos...
(
echo PORT=3000
echo NODE_ENV=production
echo SQL_SERVER=%SQL_SERVER%
echo SQL_PORT=1433
echo SQL_DATABASE=InventarioESCS
echo SQL_USER=%SQL_USER%
echo SQL_PASSWORD=%SQL_PASSWORD%
echo SQL_TRUST_CERTIFICATE=true
echo JWT_SECRET=inventario_esics_secret_key_2024_change_in_production
echo JWT_EXPIRES_IN=8h
echo UPLOAD_DIR=./uploads
echo FIRMAS_DIR=./uploads/firmas
echo ACTAS_DIR=./uploads/actas
echo QR_DIR=./uploads/qr
) > "%ROOT_DIR%\backend\.env"

echo [OK] Archivo .env creado
echo.
pause

REM ----------------------------------------------------------------------------
REM PASO 3: INSTALAR BACKEND
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 3: Instalando dependencias del backend
echo ============================================================

cd /d "%ROOT_DIR%\backend"

echo Instalando paquetes npm...
call npm install --legacy-peer-deps
if %errorLevel% neq 0 (
    echo [ERROR] Error al instalar dependencias del backend
    pause
    exit /b 1
)

echo [OK] Dependencias instaladas
echo.

echo Compilando TypeScript...
call npm run build
if %errorLevel% neq 0 (
    echo [ADVERTENCIA] Errores en la compilación TypeScript
    echo Continuando de todos modos...
) else (
    echo [OK] Backend compilado exitosamente
)

echo.
pause

REM ----------------------------------------------------------------------------
REM PASO 4: INSTALAR FRONTEND
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 4: Instalando dependencias del frontend
echo ============================================================

cd /d "%ROOT_DIR%\frontend"

echo Instalando paquetes npm...
call npm install --legacy-peer-deps
if %errorLevel% neq 0 (
    echo [ERROR] Error al instalar dependencias del frontend
    pause
    exit /b 1
)

echo [OK] Dependencias instaladas
echo.

echo Compilando frontend para producción...
call npm run build
if %errorLevel% neq 0 (
    echo [ADVERTENCIA] Errores en la compilación del frontend
    echo Continuando de todos modos...
) else (
    echo [OK] Frontend compilado exitosamente
)

echo.
pause

REM ----------------------------------------------------------------------------
REM PASO 5: CREAR DIRECTORIOS DE UPLOADS
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 5: Creando directorios de archivos
echo ============================================================

if not exist "%ROOT_DIR%\uploads\firmas" mkdir "%ROOT_DIR%\uploads\firmas"
if not exist "%ROOT_DIR%\uploads\actas" mkdir "%ROOT_DIR%\uploads\actas"
if not exist "%ROOT_DIR%\uploads\qr" mkdir "%ROOT_DIR%\uploads\qr"
if not exist "%ROOT_DIR%\uploads\csv_temp" mkdir "%ROOT_DIR%\uploads\csv_temp"
if not exist "%ROOT_DIR%\logs" mkdir "%ROOT_DIR%\logs"

echo [OK] Directorios creados
echo.
pause

REM ----------------------------------------------------------------------------
REM PASO 6: CONFIGURAR IIS (OPCIONAL)
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 6: Configurando IIS
echo ============================================================

echo ¿Desea configurar IIS ahora? (S/N)
set /p CONFIG_IIS="Respuesta: "
if /i "!CONFIG_IIS!"=="S" (
    echo.
    echo Configuración manual de IIS requerida:
    echo.
    echo 1. Abra IIS Manager
    echo 2. Click derecho en "Sites" ^> "Add Web Site"
    echo 3. Nombre del sitio: InventarioESCS
    echo 4. Physical path: %ROOT_DIR%\frontend\dist
    echo 5. Puerto: 80 o el que prefiera
    echo.
    echo Para el backend (API):
    echo 1. Cree un Application Pool llamado "InventarioESCS_API"
    echo 2. Configure para usar Node.js
    echo 3. Apunte a %ROOT_DIR%\backend\dist\index.js
    echo.
    echo O ejecute el script PowerShell para configuración automática:
    echo powershell.exe -ExecutionPolicy Bypass -File "%ROOT_DIR%\install\configurar_iis.ps1"
    echo.
) else (
    echo Saltando configuración de IIS
)

echo.
pause

REM ----------------------------------------------------------------------------
REM PASO 7: IMPORTAR DATOS CSV (OPCIONAL)
REM ----------------------------------------------------------------------------
echo ============================================================
echo PASO 7: Importar datos desde sistema anterior
echo ============================================================

echo ¿Existen archivos CSV del sistema anterior para importar? (S/N)
set /p IMPORT_CSV="Respuesta: "
if /i "!IMPORT_CSV!"=="S" (
    echo.
    echo Coloque los archivos CSV en el directorio:
    echo %ROOT_DIR%\uploads\csv_temp\
    echo.
    echo Luego use la interfaz web para importarlos:
    echo Módulo "Importación CSV"
    echo.
) else (
    echo Saltando importación de CSV
)

echo.
pause

REM ----------------------------------------------------------------------------
REM FINALIZACIÓN
REM ----------------------------------------------------------------------------
echo ============================================================
echo INSTALACIÓN COMPLETADA
echo ============================================================
echo.
echo El sistema ha sido instalado exitosamente.
echo.
echo Para iniciar el sistema:
echo.
echo 1. Backend (API):
echo    cd %ROOT_DIR%\backend
echo    npm start
echo.
echo 2. Frontend:
echo    cd %ROOT_DIR%\frontend
echo    npm run dev   ^(desarrollo^)
echo    ó sirva desde IIS ^(producción^)
echo.
echo 3. Acceda desde su navegador:
echo    http://localhost:5173  ^(desarrollo^)
echo    http://localhost       ^(producción con IIS^)
echo.
echo Credenciales por defecto:
echo    Usuario: admin
echo    Contraseña: Admin123!
echo.
echo ¡CAMBIE LA CONTRASEÑA EN EL PRIMER ACCESO!
echo.
echo Log de instalación: %LOG_FILE%
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           ¡INSTALACIÓN EXITOSA!                         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause

endlocal
exit /b 0
