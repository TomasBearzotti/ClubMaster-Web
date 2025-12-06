# GUÍA RÁPIDA DE BACKUPS - CLUBMASTER

## 🚀 INICIO RÁPIDO

### Opción 1: Desde la Aplicación Web (Recomendado)

1. Ingresar a: `https://clubmaster.com/backups`
2. Seleccionar tipo de backup (FULL / DIFFERENTIAL / LOG)
3. Click en "Ejecutar"
4. ✓ Listo

### Opción 2: Scripts SQL Manuales

```bash
# Ubicación de scripts
/scripts/backup/

01_BackupCompleto.sql       → Backup FULL
02_BackupDiferencial.sql    → Backup DIFFERENTIAL
03_BackupLog.sql            → Backup LOG
04_LimpiarLog.sql           → Limpieza de log
05_RestaurarCompleto.sql    → Restaurar FULL
06_RestaurarDiferencial.sql → Restaurar FULL + DIFF
07_RestaurarPointInTime.sql → Restaurar a punto específico
08_ConsultarBackups.sql     → Ver historial
```

## 📅 FRECUENCIA RECOMENDADA

| Tipo | Frecuencia | Horario |
|------|------------|---------|
| **FULL** | Diario | 00:00 hs |
| **DIFFERENTIAL** | Cada 6 horas | 06:00, 12:00, 18:00 |
| **LOG** | Cada 1 hora | 08:00-20:00 (horario laboral) |

## 📂 UBICACIÓN DE ARCHIVOS

```
C:\Backups\ClubMaster\
├── ClubMaster_FULL_YYYYMMDD_HHMMSS.bak
├── Differential\
│   └── ClubMaster_DIFF_YYYYMMDD_HHMMSS.bak
└── Logs\
    └── ClubMaster_LOG_YYYYMMDD_HHMMSS.trn
```

## 🔄 RESTAURACIÓN RÁPIDA

### Escenario 1: Restaurar solo FULL
```sql
RESTORE DATABASE ClubMaster
FROM DISK = 'C:\Backups\ClubMaster\ClubMaster_FULL_20241206_000000.bak'
WITH REPLACE, RECOVERY;
```

### Escenario 2: Restaurar FULL + DIFFERENTIAL
```sql
-- Paso 1: FULL con NORECOVERY
RESTORE DATABASE ClubMaster
FROM DISK = 'C:\Backups\ClubMaster\ClubMaster_FULL_20241206_000000.bak'
WITH REPLACE, NORECOVERY;

-- Paso 2: DIFF con RECOVERY
RESTORE DATABASE ClubMaster
FROM DISK = 'C:\Backups\ClubMaster\Differential\ClubMaster_DIFF_20241206_120000.bak'
WITH RECOVERY;
```

## 📋 CHECKLIST PRE-BACKUP

- [ ] Verificar espacio en disco: `EXEC sp_spaceused;`
- [ ] Verificar modelo: `SELECT recovery_model_desc FROM sys.databases WHERE name = 'ClubMaster';`
- [ ] Crear directorios si no existen
- [ ] Verificar permisos de escritura

## 📋 CHECKLIST POST-RESTAURACIÓN

- [ ] Base de datos ONLINE: `SELECT state_desc FROM sys.databases WHERE name = 'ClubMaster';`
- [ ] Verificar integridad: `DBCC CHECKDB('ClubMaster');`
- [ ] Contar registros: `SELECT COUNT(*) FROM Socios;`
- [ ] Probar login en la aplicación web
- [ ] Crear un socio de prueba

## 🆘 EMERGENCIA - RESTAURACIÓN RÁPIDA

```sql
-- 1. Identificar último backup
SELECT TOP 1 
    backup_finish_date, 
    physical_device_name
FROM msdb.dbo.backupset bs
INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
WHERE database_name = 'ClubMaster' AND type = 'D'
ORDER BY backup_finish_date DESC;

-- 2. Restaurar
-- Usar script 05_RestaurarCompleto.sql con la ruta obtenida
```

## 📊 VERIFICAR ESTADO DE BACKUPS

```sql
-- Últimos backups por tipo
SELECT 
    CASE type
        WHEN 'D' THEN 'FULL'
        WHEN 'I' THEN 'DIFFERENTIAL'
        WHEN 'L' THEN 'LOG'
    END AS Tipo,
    MAX(backup_finish_date) AS UltimoBackup,
    DATEDIFF(HOUR, MAX(backup_finish_date), GETDATE()) AS HorasDesde
FROM msdb.dbo.backupset
WHERE database_name = 'ClubMaster'
GROUP BY type;
```

## 🔧 AUTOMATIZACIÓN (SQL Server Agent)

1. Abrir SSMS → SQL Server Agent → Jobs
2. New Job → Name: `ClubMaster - Backup FULL Diario`
3. Steps → New → Copiar contenido de `01_BackupCompleto.sql`
4. Schedules → New → Daily, 00:00
5. Repetir para DIFFERENTIAL y LOG

## 📞 SOPORTE

- Ver documentación completa: `/docs/POLITICAS_BACKUP_RESTAURACION.md`
- Panel web de backups: `/backups`
- API endpoints: `/api/backups`, `/api/backups/limpiar-log`

## ⚠️ IMPORTANTE

- Nunca ejecutar restauraciones en **producción** sin autorización
- Siempre **probar backups** mensualmente
- Mantener backups en **3 ubicaciones** (local, NAS, nube)
- Documentar todas las restauraciones en bitácora

---

**Última actualización**: 2024-12-06  
**Responsable**: Equipo ClubMaster
