/*
==============================================================================
 SCRIPT DE BACKUP COMPLETO - ClubMaster
==============================================================================
 Descripción: Realiza un respaldo completo de la base de datos ClubMaster
 Frecuencia recomendada: Diario (00:00 hs)
 Responsable: Administrador de Base de Datos / DBA
 Retención: 30 días
==============================================================================
*/

USE master;
GO

-- Variables de configuración
DECLARE @rutaBackup NVARCHAR(500);
DECLARE @nombreArchivo NVARCHAR(500);
DECLARE @fechaHora NVARCHAR(50);
DECLARE @rutaCompleta NVARCHAR(1000);

-- Generar timestamp para el nombre del archivo
SET @fechaHora = CONVERT(NVARCHAR(20), GETDATE(), 112) + '_' + 
                 REPLACE(CONVERT(NVARCHAR(20), GETDATE(), 108), ':', '');

-- Configurar ruta base (ajustar según su servidor)
SET @rutaBackup = 'C:\Backups\ClubMaster\';

-- Construir nombre del archivo
SET @nombreArchivo = 'ClubMaster_FULL_' + @fechaHora + '.bak';
SET @rutaCompleta = @rutaBackup + @nombreArchivo;

-- Mostrar información del backup
PRINT '==================================================';
PRINT 'INICIANDO BACKUP COMPLETO';
PRINT '==================================================';
PRINT 'Base de datos: ClubMaster';
PRINT 'Tipo: FULL (Completo)';
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT 'Ruta destino: ' + @rutaCompleta;
PRINT '==================================================';

-- Ejecutar backup completo
BACKUP DATABASE ClubMaster
TO DISK = @rutaCompleta
WITH 
    FORMAT,                     -- Inicializa el medio
    INIT,                       -- Sobrescribe backups existentes en el medio
    NAME = 'ClubMaster-Full Database Backup',
    DESCRIPTION = 'Backup completo de ClubMaster',
    COMPRESSION,                -- Compresión para reducir tamaño
    STATS = 10,                 -- Mostrar progreso cada 10%
    CHECKSUM,                   -- Verificar integridad
    CONTINUE_AFTER_ERROR;       -- Continuar si hay errores menores

-- Verificar el backup
RESTORE VERIFYONLY 
FROM DISK = @rutaCompleta
WITH CHECKSUM;

-- Mostrar resultado
IF @@ERROR = 0
BEGIN
    PRINT '==================================================';
    PRINT '✓ BACKUP COMPLETADO EXITOSAMENTE';
    PRINT '✓ VERIFICACIÓN EXITOSA';
    PRINT 'Archivo: ' + @nombreArchivo;
    PRINT '==================================================';
END
ELSE
BEGIN
    PRINT '==================================================';
    PRINT '✗ ERROR EN EL BACKUP';
    PRINT '==================================================';
END

GO
