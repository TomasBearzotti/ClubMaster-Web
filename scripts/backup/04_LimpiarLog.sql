/*
==============================================================================
 SCRIPT DE LIMPIEZA DE LOG - ClubMaster
==============================================================================
 Descripción: Reduce el tamaño del archivo de log de transacciones
 Frecuencia recomendada: Semanal o cuando el log crezca excesivamente
 Responsable: Administrador de Base de Datos / DBA
 ADVERTENCIA: Solo ejecutar en ambientes de desarrollo/test
              En producción, usar backups de log regularmente
==============================================================================
*/

USE ClubMaster;
GO

-- Mostrar tamaño actual del log
PRINT '==================================================';
PRINT 'INFORMACIÓN DEL LOG ANTES DE LIMPIEZA';
PRINT '==================================================';

SELECT 
    name AS 'Archivo',
    size * 8 / 1024 AS 'Tamaño (MB)',
    CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024 AS 'Espacio Usado (MB)',
    (size * 8 / 1024) - (CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024) AS 'Espacio Libre (MB)'
FROM sys.database_files
WHERE type_desc = 'LOG';

PRINT '';
PRINT 'Iniciando proceso de limpieza...';
PRINT '';

-- Cambiar a modo de recuperación SIMPLE (permite truncar el log)
ALTER DATABASE ClubMaster
SET RECOVERY SIMPLE;
GO

PRINT '✓ Modo de recuperación cambiado a SIMPLE';

-- Reducir el archivo de log a 10 MB
DBCC SHRINKFILE (ClubMaster_Log, 10);
GO

PRINT '✓ Log reducido a 10 MB';

-- Volver a modo FULL (recomendado para producción)
ALTER DATABASE ClubMaster
SET RECOVERY FULL;
GO

PRINT '✓ Modo de recuperación restaurado a FULL';
PRINT '';

-- Mostrar tamaño después de limpieza
PRINT '==================================================';
PRINT 'INFORMACIÓN DEL LOG DESPUÉS DE LIMPIEZA';
PRINT '==================================================';

SELECT 
    name AS 'Archivo',
    size * 8 / 1024 AS 'Tamaño (MB)',
    CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024 AS 'Espacio Usado (MB)',
    (size * 8 / 1024) - (CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024) AS 'Espacio Libre (MB)'
FROM sys.database_files
WHERE type_desc = 'LOG';

PRINT '';
PRINT '==================================================';
PRINT '✓ LIMPIEZA DE LOG COMPLETADA';
PRINT '==================================================';
PRINT 'RECORDATORIO: En producción, es mejor realizar';
PRINT 'backups de log regularmente en lugar de limpiar';
PRINT '==================================================';

GO
