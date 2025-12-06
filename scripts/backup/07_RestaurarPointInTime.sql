/*
==============================================================================
 SCRIPT DE RESTAURACIÓN POINT-IN-TIME - ClubMaster
==============================================================================
 Descripción: Restaura la BD a un momento específico en el tiempo
 Escenario: Recuperación desde FULL + DIFF + LOGs hasta un punto exacto
 Uso: Cuando se necesita recuperar antes de un error o pérdida de datos
 Responsable: Administrador de Base de Datos / DBA
 Requisito: Base de datos en modo FULL recovery con backups de log
==============================================================================
*/

USE master;
GO

-- Variables de configuración
DECLARE @rutaBackupFull NVARCHAR(1000);
DECLARE @rutaBackupDiff NVARCHAR(1000);
DECLARE @rutaBackupLog1 NVARCHAR(1000);
DECLARE @rutaBackupLog2 NVARCHAR(1000);
DECLARE @fechaHoraRecuperacion DATETIME;
DECLARE @nombreBD NVARCHAR(100) = 'ClubMaster';

-- ⚠ CONFIGURAR ESTAS RUTAS Y FECHA/HORA OBJETIVO
SET @rutaBackupFull = 'C:\Backups\ClubMaster\ClubMaster_FULL_20241206_000000.bak';
SET @rutaBackupDiff = 'C:\Backups\ClubMaster\Differential\ClubMaster_DIFF_20241206_120000.bak';
SET @rutaBackupLog1 = 'C:\Backups\ClubMaster\Logs\ClubMaster_LOG_20241206_130000.trn';
SET @rutaBackupLog2 = 'C:\Backups\ClubMaster\Logs\ClubMaster_LOG_20241206_140000.trn';

-- ⚠ ESPECIFICAR PUNTO EN EL TIEMPO A RECUPERAR (formato: 'YYYY-MM-DD HH:MM:SS')
SET @fechaHoraRecuperacion = '2024-12-06 14:30:00';

PRINT '==================================================';
PRINT 'RESTAURACIÓN POINT-IN-TIME';
PRINT '==================================================';
PRINT 'Base de datos: ' + @nombreBD;
PRINT 'Punto de recuperación: ' + CONVERT(NVARCHAR(50), @fechaHoraRecuperacion, 120);
PRINT 'Fecha/Hora actual: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT '==================================================';
PRINT '';
PRINT '⚠ IMPORTANTE: Se perderán transacciones posteriores a:';
PRINT '   ' + CONVERT(NVARCHAR(50), @fechaHoraRecuperacion, 120);
PRINT '';

-- Verificar archivos
PRINT 'Verificando archivos de backup...';
RESTORE VERIFYONLY FROM DISK = @rutaBackupFull;
IF @@ERROR != 0 BEGIN PRINT '✗ Error en FULL'; RETURN; END

RESTORE VERIFYONLY FROM DISK = @rutaBackupDiff;
IF @@ERROR != 0 BEGIN PRINT '✗ Error en DIFF'; RETURN; END

RESTORE VERIFYONLY FROM DISK = @rutaBackupLog1;
IF @@ERROR != 0 BEGIN PRINT '✗ Error en LOG1'; RETURN; END

RESTORE VERIFYONLY FROM DISK = @rutaBackupLog2;
IF @@ERROR != 0 BEGIN PRINT '✗ Error en LOG2'; RETURN; END

PRINT '✓ Todos los archivos son válidos';

-- Desconectar usuarios
PRINT '';
PRINT 'Desconectando usuarios...';
ALTER DATABASE ClubMaster SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
PRINT '✓ Usuarios desconectados';

-- PASO 1: Restaurar FULL con NORECOVERY
PRINT '';
PRINT '==================================================';
PRINT 'PASO 1/4: Restaurando backup FULL...';
PRINT '==================================================';

RESTORE DATABASE ClubMaster
FROM DISK = @rutaBackupFull
WITH 
    REPLACE,
    NORECOVERY,
    STATS = 10;

PRINT '✓ FULL restaurado';

-- PASO 2: Restaurar DIFFERENTIAL con NORECOVERY
PRINT '';
PRINT '==================================================';
PRINT 'PASO 2/4: Restaurando backup DIFFERENTIAL...';
PRINT '==================================================';

RESTORE DATABASE ClubMaster
FROM DISK = @rutaBackupDiff
WITH 
    NORECOVERY,
    STATS = 10;

PRINT '✓ DIFFERENTIAL restaurado';

-- PASO 3: Restaurar LOG 1 con NORECOVERY
PRINT '';
PRINT '==================================================';
PRINT 'PASO 3/4: Restaurando backup de LOG 1...';
PRINT '==================================================';

RESTORE LOG ClubMaster
FROM DISK = @rutaBackupLog1
WITH 
    NORECOVERY,
    STATS = 10;

PRINT '✓ LOG 1 restaurado';

-- PASO 4: Restaurar LOG 2 hasta el punto específico con RECOVERY
PRINT '';
PRINT '==================================================';
PRINT 'PASO 4/4: Restaurando LOG 2 hasta punto específico...';
PRINT '==================================================';

RESTORE LOG ClubMaster
FROM DISK = @rutaBackupLog2
WITH 
    RECOVERY,
    STOPAT = @fechaHoraRecuperacion,    -- Detener en este punto
    STATS = 10;

PRINT '✓ LOG 2 restaurado hasta ' + CONVERT(NVARCHAR(50), @fechaHoraRecuperacion, 120);

-- Volver a modo MULTI_USER
PRINT '';
PRINT 'Restaurando acceso multiusuario...';
ALTER DATABASE ClubMaster SET MULTI_USER;
PRINT '✓ Base de datos disponible';

PRINT '';
PRINT '==================================================';
PRINT '✓ RESTAURACIÓN POINT-IN-TIME EXITOSA';
PRINT '==================================================';
PRINT 'Base de datos restaurada al: ' + CONVERT(NVARCHAR(50), @fechaHoraRecuperacion, 120);
PRINT 'Todas las transacciones hasta ese momento han sido recuperadas';
PRINT '==================================================';

GO
