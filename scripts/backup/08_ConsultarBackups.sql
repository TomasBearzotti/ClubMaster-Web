/*
==============================================================================
 SCRIPT DE CONSULTA DE INFORMACIÓN DE BACKUPS - ClubMaster
==============================================================================
 Descripción: Muestra información detallada sobre backups existentes
 Uso: Verificar qué backups están disponibles y su información
==============================================================================
*/

USE master;
GO

PRINT '==================================================';
PRINT 'INFORMACIÓN DE BACKUPS - ClubMaster';
PRINT '==================================================';
PRINT '';

-- Historial de backups desde las tablas del sistema
PRINT 'HISTORIAL DE BACKUPS (Últimos 30 días):';
PRINT '--------------------------------------------------';

SELECT TOP 50
    database_name AS 'Base de Datos',
    CASE type
        WHEN 'D' THEN 'FULL (Completo)'
        WHEN 'I' THEN 'DIFFERENTIAL (Diferencial)'
        WHEN 'L' THEN 'LOG (Transacciones)'
        ELSE 'Otro'
    END AS 'Tipo',
    backup_start_date AS 'Inicio',
    backup_finish_date AS 'Fin',
    DATEDIFF(SECOND, backup_start_date, backup_finish_date) AS 'Duración (seg)',
    CAST(backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS 'Tamaño (MB)',
    CAST(compressed_backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS 'Comprimido (MB)',
    physical_device_name AS 'Ubicación',
    user_name AS 'Usuario',
    server_name AS 'Servidor',
    recovery_model AS 'Modelo Recuperación'
FROM msdb.dbo.backupset bs
INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
WHERE database_name = 'ClubMaster'
    AND backup_start_date >= DATEADD(day, -30, GETDATE())
ORDER BY backup_start_date DESC;

PRINT '';
PRINT '';

-- Último backup de cada tipo
PRINT 'ÚLTIMO BACKUP POR TIPO:';
PRINT '--------------------------------------------------';

SELECT 
    CASE type
        WHEN 'D' THEN 'FULL (Completo)'
        WHEN 'I' THEN 'DIFFERENTIAL (Diferencial)'
        WHEN 'L' THEN 'LOG (Transacciones)'
    END AS 'Tipo Backup',
    MAX(backup_finish_date) AS 'Último Backup',
    DATEDIFF(HOUR, MAX(backup_finish_date), GETDATE()) AS 'Horas desde último'
FROM msdb.dbo.backupset
WHERE database_name = 'ClubMaster'
GROUP BY type
ORDER BY type;

PRINT '';
PRINT '';

-- Información de la base de datos
PRINT 'CONFIGURACIÓN ACTUAL DE ClubMaster:';
PRINT '--------------------------------------------------';

SELECT 
    name AS 'Base de Datos',
    recovery_model_desc AS 'Modelo de Recuperación',
    state_desc AS 'Estado',
    compatibility_level AS 'Nivel Compatibilidad',
    CAST((size * 8.0 / 1024) AS DECIMAL(10,2)) AS 'Tamaño (MB)',
    create_date AS 'Fecha Creación'
FROM sys.databases
WHERE name = 'ClubMaster';

PRINT '';
PRINT '';

-- Tamaño de archivos de datos y log
PRINT 'TAMAÑO DE ARCHIVOS:';
PRINT '--------------------------------------------------';

USE ClubMaster;
SELECT 
    name AS 'Archivo',
    type_desc AS 'Tipo',
    CAST(size * 8.0 / 1024 AS DECIMAL(10,2)) AS 'Tamaño (MB)',
    CAST(FILEPROPERTY(name, 'SpaceUsed') * 8.0 / 1024 AS DECIMAL(10,2)) AS 'Usado (MB)',
    CAST((size - FILEPROPERTY(name, 'SpaceUsed')) * 8.0 / 1024 AS DECIMAL(10,2)) AS 'Libre (MB)',
    CAST(FILEPROPERTY(name, 'SpaceUsed') * 100.0 / size AS DECIMAL(5,2)) AS '% Usado',
    physical_name AS 'Ubicación Física'
FROM sys.database_files;

PRINT '';
PRINT '==================================================';
PRINT 'FIN DEL REPORTE';
PRINT '==================================================';

GO
