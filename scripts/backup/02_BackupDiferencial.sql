/*
==============================================================================
 SCRIPT DE BACKUP DIFERENCIAL - ClubMaster
==============================================================================
 Descripción: Realiza un respaldo diferencial (cambios desde último FULL)
 Frecuencia recomendada: Cada 6 horas
 Requisito: Debe existir un backup FULL previo
 Responsable: Administrador de Base de Datos / DBA
 Retención: 7 días
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
SET @rutaBackup = 'C:\Backups\ClubMaster\Differential\';

-- Construir nombre del archivo
SET @nombreArchivo = 'ClubMaster_DIFF_' + @fechaHora + '.bak';
SET @rutaCompleta = @rutaBackup + @nombreArchivo;

-- Mostrar información del backup
PRINT '==================================================';
PRINT 'INICIANDO BACKUP DIFERENCIAL';
PRINT '==================================================';
PRINT 'Base de datos: ClubMaster';
PRINT 'Tipo: DIFFERENTIAL (Diferencial)';
PRINT 'Fecha/Hora: ' + CONVERT(NVARCHAR(50), GETDATE(), 120);
PRINT 'Ruta destino: ' + @rutaCompleta;
PRINT '==================================================';

-- Ejecutar backup diferencial
BACKUP DATABASE ClubMaster
TO DISK = @rutaCompleta
WITH 
    DIFFERENTIAL,               -- Tipo diferencial
    FORMAT,
    INIT,
    NAME = 'ClubMaster-Differential Database Backup',
    DESCRIPTION = 'Backup diferencial de ClubMaster',
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
    PRINT '✓ BACKUP DIFERENCIAL COMPLETADO EXITOSAMENTE';
    PRINT '✓ VERIFICACIÓN EXITOSA';
    PRINT 'Archivo: ' + @nombreArchivo;
    PRINT '==================================================';
END
ELSE
BEGIN
    PRINT '==================================================';
    PRINT '✗ ERROR EN EL BACKUP DIFERENCIAL';
    PRINT '==================================================';
END

GO
