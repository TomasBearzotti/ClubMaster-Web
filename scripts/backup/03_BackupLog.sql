/*
==============================================================================
 SCRIPT DE BACKUP DE LOG DE TRANSACCIONES - ClubMaster
==============================================================================
 Descripción: Realiza un respaldo del log de transacciones
 Frecuencia recomendada: Cada 1 hora (horario laboral)
 Requisito: Base de datos en modo FULL recovery
 Responsable: Administrador de Base de Datos / DBA
 Retención: 3 días
 Nota: Este backup permite recuperación point-in-time
==============================================================================
*/

USE master;
GO

-- Verificar modelo de recuperación
DECLARE @recoveryModel NVARCHAR(50);
SELECT @recoveryModel = recovery_model_desc 
FROM sys.databases 
WHERE name = 'ClubMaster';

IF @recoveryModel != 'FULL'
BEGIN
    PRINT '⚠ ADVERTENCIA: La base de datos no está en modo FULL recovery';
    PRINT 'Modelo actual: ' + @recoveryModel;
    PRINT 'Para habilitar backups de log, ejecute:';
    PRINT 'ALTER DATABASE ClubMaster SET RECOVERY FULL;';
    -- RETURN; -- Descomentar si desea forzar modo FULL
END

-- Variables de configuración
DECLARE @rutaBackup NVARCHAR(500);
DECLARE @nombreArchivo NVARCHAR(500);
DECLARE @fechaHora NVARCHAR(50);
DECLARE @rutaCompleta NVARCHAR(1000);

-- Generar timestamp para el nombre del archivo
SET @fechaHora = CONVERT(NVARCHAR(20), GETDATE(), 112) + '_' + 
                 REPLACE(CONVERT(NVARCHAR(20), GETDATE(), 108), ':', '');

-- Configurar ruta base (ajustar según su servidor)
SET @rutaBackup = 'C:\Backups\ClubMaster\Logs\';

-- Construir nombre del archivo
SET @nombreArchivo = 'ClubMaster_LOG_' + @fechaHora + '.trn';
SET @rutaCompleta = @rutaBackup + @nombreArchivo;

-- Mostrar información del backup
PRINT '==================================================';
PRINT 'INICIANDO BACKUP DE LOG DE TRANSACCIONES';
PRINT '==================================================';
PRINT 'Base de datos: ClubMaster';
PRINT 'Tipo: LOG (Transacciones)';
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT 'Ruta destino: ' + @rutaCompleta;
PRINT '==================================================';

-- Ejecutar backup de log
BACKUP LOG ClubMaster
TO DISK = @rutaCompleta
WITH 
    FORMAT,
    INIT,
    NAME = 'ClubMaster-Transaction Log Backup',
    DESCRIPTION = 'Backup de log de transacciones de ClubMaster',
    COMPRESSION,
    STATS = 10,
    CHECKSUM,
    CONTINUE_AFTER_ERROR;

-- Verificar el backup
RESTORE VERIFYONLY 
FROM DISK = @rutaCompleta
WITH CHECKSUM;

-- Mostrar resultado
IF @@ERROR = 0
BEGIN
    PRINT '==================================================';
    PRINT '✓ BACKUP DE LOG COMPLETADO EXITOSAMENTE';
    PRINT '✓ VERIFICACIÓN EXITOSA';
    PRINT 'Archivo: ' + @nombreArchivo;
    PRINT '==================================================';
END
ELSE
BEGIN
    PRINT '==================================================';
    PRINT '✗ ERROR EN EL BACKUP DE LOG';
    PRINT '==================================================';
END

GO
