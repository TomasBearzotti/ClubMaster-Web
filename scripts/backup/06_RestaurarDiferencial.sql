/*
==============================================================================
 SCRIPT DE RESTAURACIÓN CON DIFERENCIAL - ClubMaster
==============================================================================
 Descripción: Restaura desde backup FULL + DIFFERENTIAL
 Escenario: Recuperación usando backup completo + diferencial
 Responsable: Administrador de Base de Datos / DBA
 ADVERTENCIA: Este proceso sobrescribe la base de datos actual
==============================================================================
*/

USE master;
GO

-- Variables de configuración
DECLARE @rutaBackupFull NVARCHAR(1000);
DECLARE @rutaBackupDiff NVARCHAR(1000);
DECLARE @nombreBD NVARCHAR(100) = 'ClubMaster';

-- ⚠ CONFIGURAR ESTAS RUTAS CON LOS ARCHIVOS A RESTAURAR
SET @rutaBackupFull = 'C:\Backups\ClubMaster\ClubMaster_FULL_20241206_000000.bak';
SET @rutaBackupDiff = 'C:\Backups\ClubMaster\Differential\ClubMaster_DIFF_20241206_120000.bak';

PRINT '==================================================';
PRINT 'INICIANDO RESTAURACIÓN FULL + DIFFERENTIAL';
PRINT '==================================================';
PRINT 'Base de datos: ' + @nombreBD;
PRINT 'Archivo FULL: ' + @rutaBackupFull;
PRINT 'Archivo DIFF: ' + @rutaBackupDiff;
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT '==================================================';
PRINT '';

-- Verificar archivos
PRINT 'Verificando archivos de backup...';
RESTORE VERIFYONLY FROM DISK = @rutaBackupFull;
RESTORE VERIFYONLY FROM DISK = @rutaBackupDiff;

IF @@ERROR = 0
    PRINT '✓ Archivos de backup válidos';
ELSE
BEGIN
    PRINT '✗ ERROR: Archivos de backup inválidos';
    RETURN;
END

-- Poner en modo SINGLE_USER
PRINT '';
PRINT 'Desconectando usuarios...';
ALTER DATABASE ClubMaster SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
PRINT '✓ Usuarios desconectados';

-- PASO 1: Restaurar backup FULL con NORECOVERY
PRINT '';
PRINT '==================================================';
PRINT 'PASO 1: Restaurando backup FULL...';
PRINT '==================================================';

RESTORE DATABASE ClubMaster
FROM DISK = @rutaBackupFull
WITH 
    REPLACE,
    NORECOVERY,                 -- No completar, esperar diferencial
    STATS = 10,
    CHECKSUM;

IF @@ERROR = 0
    PRINT '✓ Backup FULL restaurado (modo NORECOVERY)';
ELSE
BEGIN
    PRINT '✗ ERROR en restauración FULL';
    ALTER DATABASE ClubMaster SET MULTI_USER;
    RETURN;
END

-- PASO 2: Restaurar backup DIFFERENTIAL con RECOVERY
PRINT '';
PRINT '==================================================';
PRINT 'PASO 2: Restaurando backup DIFFERENTIAL...';
PRINT '==================================================';

RESTORE DATABASE ClubMaster
FROM DISK = @rutaBackupDiff
WITH 
    RECOVERY,                   -- Completar restauración
    STATS = 10,
    CHECKSUM;

IF @@ERROR = 0
    PRINT '✓ Backup DIFFERENTIAL restaurado';
ELSE
BEGIN
    PRINT '✗ ERROR en restauración DIFFERENTIAL';
    -- Intentar recuperar la base de datos
    RESTORE DATABASE ClubMaster WITH RECOVERY;
    ALTER DATABASE ClubMaster SET MULTI_USER;
    RETURN;
END

-- Volver a modo MULTI_USER
PRINT '';
PRINT 'Restaurando acceso multiusuario...';
ALTER DATABASE ClubMaster SET MULTI_USER;
PRINT '✓ Base de datos disponible';

PRINT '';
PRINT '==================================================';
PRINT '✓ RESTAURACIÓN COMPLETA EXITOSA';
PRINT '==================================================';
PRINT 'Base de datos restaurada con FULL + DIFFERENTIAL';
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT '==================================================';

GO
