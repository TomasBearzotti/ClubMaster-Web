/*
==============================================================================
 SCRIPT DE RESTAURACIÓN COMPLETA - ClubMaster
==============================================================================
 Descripción: Restaura la base de datos desde un backup FULL
 Escenario: Recuperación total de la base de datos
 Responsable: Administrador de Base de Datos / DBA
 ADVERTENCIA: Este proceso sobrescribe la base de datos actual
==============================================================================
*/

USE master;
GO

-- Variables de configuración
DECLARE @rutaBackupFull NVARCHAR(1000);
DECLARE @nombreBD NVARCHAR(100) = 'ClubMaster';

-- ⚠ CONFIGURAR ESTA RUTA CON EL ARCHIVO DE BACKUP A RESTAURAR
SET @rutaBackupFull = 'C:\Backups\ClubMaster\ClubMaster_FULL_20241206_000000.bak';

PRINT '==================================================';
PRINT 'INICIANDO PROCESO DE RESTAURACIÓN COMPLETA';
PRINT '==================================================';
PRINT 'Base de datos: ' + @nombreBD;
PRINT 'Archivo backup: ' + @rutaBackupFull;
PRINT 'Tipo: Restauración FULL (Completa)';
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT '==================================================';
PRINT '';

-- Verificar que el archivo existe y es válido
PRINT 'Verificando integridad del archivo de backup...';
RESTORE VERIFYONLY FROM DISK = @rutaBackupFull;

IF @@ERROR = 0
    PRINT '✓ Archivo de backup válido';
ELSE
BEGIN
    PRINT '✗ ERROR: Archivo de backup inválido o corrupto';
    RETURN;
END

PRINT '';

-- Obtener información del backup
PRINT 'Información del backup:';
RESTORE HEADERONLY FROM DISK = @rutaBackupFull;

PRINT '';
PRINT '⚠ ADVERTENCIA: Se desconectarán todos los usuarios activos';
PRINT 'Presione Ctrl+C para cancelar o Enter para continuar...';
-- WAITFOR DELAY '00:00:10'; -- Descomentar para dar tiempo de cancelar

-- Poner la base de datos en modo SINGLE_USER (desconecta usuarios)
PRINT '';
PRINT 'Configurando base de datos en modo SINGLE_USER...';
ALTER DATABASE ClubMaster SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
PRINT '✓ Usuarios desconectados';

-- Restaurar el backup
PRINT '';
PRINT 'Iniciando restauración...';
RESTORE DATABASE ClubMaster
FROM DISK = @rutaBackupFull
WITH 
    REPLACE,                    -- Sobrescribir base de datos existente
    RECOVERY,                   -- Base de datos lista para usar
    STATS = 10,                 -- Mostrar progreso cada 10%
    CHECKSUM;                   -- Verificar integridad

-- Verificar resultado
IF @@ERROR = 0
BEGIN
    PRINT '';
    PRINT '✓ Restauración completada exitosamente';
END
ELSE
BEGIN
    PRINT '';
    PRINT '✗ ERROR en la restauración';
END

-- Volver a modo MULTI_USER
PRINT '';
PRINT 'Restaurando acceso multiusuario...';
ALTER DATABASE ClubMaster SET MULTI_USER;
PRINT '✓ Base de datos disponible para usuarios';

PRINT '';
PRINT '==================================================';
PRINT '✓ PROCESO DE RESTAURACIÓN FINALIZADO';
PRINT '==================================================';
PRINT 'La base de datos ClubMaster ha sido restaurada';
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT '==================================================';

GO
