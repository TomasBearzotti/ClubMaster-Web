import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";
import sql from "mssql";
import fs from "fs";
import path from "path";

/**
 * API para gestión de backups de la base de datos ClubMaster
 * 
 * GET  - Obtener historial de backups
 * POST - Ejecutar un backup
 */

export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection();
    
    // Determinar la ruta base de backups del proyecto
    const projectRoot = process.cwd();
    const projectBackupPath = path.join(projectRoot, 'backups');
    
    // Obtener historial de backups de los últimos 30 días SOLO de la carpeta del proyecto
    const result = await pool.request().query(`
      SELECT TOP 50
        database_name AS DatabaseName,
        CASE type
          WHEN 'D' THEN 'FULL'
          WHEN 'I' THEN 'DIFFERENTIAL'
          WHEN 'L' THEN 'LOG'
          ELSE 'OTHER'
        END AS BackupType,
        backup_start_date AS StartDate,
        backup_finish_date AS FinishDate,
        DATEDIFF(SECOND, backup_start_date, backup_finish_date) AS DurationSeconds,
        CAST(backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS SizeMB,
        CAST(compressed_backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS CompressedSizeMB,
        physical_device_name AS FilePath,
        user_name AS UserName,
        server_name AS ServerName,
        recovery_model AS RecoveryModel
      FROM msdb.dbo.backupset bs
      INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
      WHERE database_name = 'ClubMaster'
        AND backup_start_date >= DATEADD(day, -30, GETDATE())
        AND physical_device_name LIKE '${projectBackupPath}%'
      ORDER BY backup_start_date DESC
    `);
    
    // Filtrar solo los backups cuyos archivos existen físicamente y actualizar fechas
    const existingBackups = result.recordset
      .filter((backup: any) => {
        try {
          return fs.existsSync(backup.FilePath);
        } catch {
          return false;
        }
      })
      .map((backup: any) => {
        try {
          // Usar la fecha de modificación del archivo real (en hora local del servidor)
          const stats = fs.statSync(backup.FilePath);
          // stats.mtime ya está en la hora local del sistema
          return {
            ...backup,
            StartDate: stats.mtime,
            FinishDate: stats.mtime,
          };
        } catch {
          return backup;
        }
      });

    // Calcular último backup por tipo desde los archivos existentes
    const lastBackupsByType: { [key: string]: any } = {};
    existingBackups.forEach((backup: any) => {
      const type = backup.BackupType;
      if (!lastBackupsByType[type] || new Date(backup.FinishDate) > new Date(lastBackupsByType[type].LastBackup)) {
        const finishDate = new Date(backup.FinishDate);
        const now = new Date();
        const hoursSinceLast = Math.floor((now.getTime() - finishDate.getTime()) / (1000 * 60 * 60));
        
        lastBackupsByType[type] = {
          BackupType: type,
          LastBackup: backup.FinishDate,
          HoursSinceLast: hoursSinceLast,
        };
      }
    });

    // Ordenar por tipo: FULL primero, luego DIFFERENTIAL, luego LOG
    const typeOrder: { [key: string]: number } = { 'FULL': 1, 'DIFFERENTIAL': 2, 'LOG': 3 };
    const lastBackups = Object.values(lastBackupsByType).sort((a: any, b: any) => 
      (typeOrder[a.BackupType] || 99) - (typeOrder[b.BackupType] || 99)
    );

    // Obtener información de la base de datos
    const dbInfo = await pool.request().query(`
      SELECT 
        name AS DatabaseName,
        recovery_model_desc AS RecoveryModel,
        state_desc AS State,
        CAST((
          SELECT SUM(size * 8.0 / 1024)
          FROM sys.master_files
          WHERE database_id = DB_ID('ClubMaster')
        ) AS DECIMAL(10,2)) AS TotalSizeMB
      FROM sys.databases
      WHERE name = 'ClubMaster'
    `);
    
    // Calcular tamaño total de la carpeta de backups
    let totalBackupSizeMB = 0;
    if (fs.existsSync(projectBackupPath)) {
      const calculateFolderSize = (dirPath: string): number => {
        let size = 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            size += stats.size;
          } else if (stats.isDirectory()) {
            size += calculateFolderSize(filePath);
          }
        }
        return size;
      };
      
      const totalBytes = calculateFolderSize(projectBackupPath);
      totalBackupSizeMB = Number((totalBytes / 1024 / 1024).toFixed(2));
    }

    return NextResponse.json({
      success: true,
      history: existingBackups,
      lastBackups: lastBackups,
      databaseInfo: {
        ...dbInfo.recordset[0],
        TotalBackupSizeMB: totalBackupSizeMB,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener información de backups:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { backupType, description } = await request.json();

    // Validar tipo de backup
    const validTypes = ["FULL", "DIFFERENTIAL", "LOG"];
    if (!validTypes.includes(backupType)) {
      return NextResponse.json(
        { success: false, message: "Tipo de backup inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Validar que existe un backup FULL antes de hacer DIFFERENTIAL o LOG
    if (backupType === "DIFFERENTIAL" || backupType === "LOG") {
      const lastFullBackup = await pool.request().query(`
        SELECT TOP 1 backup_finish_date
        FROM msdb.dbo.backupset
        WHERE database_name = 'ClubMaster' AND type = 'D'
        ORDER BY backup_finish_date DESC
      `);

      if (!lastFullBackup.recordset || lastFullBackup.recordset.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: `No se puede hacer backup ${backupType}. Primero debe realizar un backup FULL.` 
          },
          { status: 400 }
        );
      }
    }

    // Validar modo de recuperación para backups de LOG
    if (backupType === "LOG") {
      const dbInfo = await pool.request().query(`
        SELECT recovery_model_desc 
        FROM sys.databases 
        WHERE name = 'ClubMaster'
      `);
      
      if (dbInfo.recordset[0]?.recovery_model_desc === "SIMPLE") {
        return NextResponse.json(
          { 
            success: false, 
            message: "No se puede hacer backup de LOG en modo SIMPLE. Cambie a modo FULL primero." 
          },
          { status: 400 }
        );
      }
    }

    // Generar nombre de archivo con timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];

    // Usar la carpeta backups del proyecto (ruta absoluta)
    const path = require("path");
    const projectRoot = process.cwd();
    let basePath = path.join(projectRoot, "backups");
    let fileName = "";
    let extension = ".bak";

    switch (backupType) {
      case "FULL":
        fileName = `ClubMaster_FULL_${timestamp}${extension}`;
        break;
      case "DIFFERENTIAL":
        basePath = path.join(basePath, "Differential");
        fileName = `ClubMaster_DIFF_${timestamp}${extension}`;
        break;
      case "LOG":
        basePath = path.join(basePath, "Logs");
        extension = ".trn";
        fileName = `ClubMaster_LOG_${timestamp}${extension}`;
        break;
    }

    // Crear directorios si no existen
    const fs = require("fs");
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    const fullPath = path.join(basePath, fileName);

    // Construir query SQL según tipo de backup
    let backupQuery = "";
    const backupName = `ClubMaster-${backupType} Database Backup`;
    const backupDescription = description || `Backup ${backupType} de ClubMaster`;

    if (backupType === "LOG") {
      // Verificar que la base de datos esté en modo FULL recovery
      const recoveryCheck = await pool.request().query(`
        SELECT recovery_model_desc 
        FROM sys.databases 
        WHERE name = 'ClubMaster'
      `);

      if (recoveryCheck.recordset[0].recovery_model_desc !== "FULL") {
        return NextResponse.json(
          {
            success: false,
            message: "La base de datos debe estar en modo FULL recovery para backups de LOG",
          },
          { status: 400 }
        );
      }

      backupQuery = `
        BACKUP LOG ClubMaster
        TO DISK = '${fullPath}'
        WITH 
          FORMAT,
          INIT,
          NAME = '${backupName}',
          DESCRIPTION = '${backupDescription}',
          CHECKSUM,
          CONTINUE_AFTER_ERROR
      `;
    } else {
      backupQuery = `
        BACKUP DATABASE ClubMaster
        TO DISK = '${fullPath}'
        WITH 
          ${backupType === "DIFFERENTIAL" ? "DIFFERENTIAL," : ""}
          FORMAT,
          INIT,
          NAME = '${backupName}',
          DESCRIPTION = '${backupDescription}',
          CHECKSUM,
          CONTINUE_AFTER_ERROR
      `;
    }

    // Ejecutar backup
    await pool.request().query(backupQuery);

    // No verificamos el backup en Express Edition para evitar problemas de permisos
    // El backup se creó correctamente si no hubo errores

    return NextResponse.json({
      success: true,
      message: "Backup realizado exitosamente",
      backupType,
      fileName,
      filePath: fullPath,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Error al realizar backup:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        details: "Verifique que existan los directorios de backup configurados",
      },
      { status: 500 }
    );
  }
}
