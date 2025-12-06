import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";
import sql from "mssql";

/**
 * API para gestión de backups de la base de datos ClubMaster
 * 
 * GET  - Obtener historial de backups
 * POST - Ejecutar un backup
 */

export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection();
    
    // Obtener historial de backups de los últimos 30 días
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
      ORDER BY backup_start_date DESC
    `);

    // Obtener último backup por tipo
    const lastBackups = await pool.request().query(`
      SELECT 
        CASE type
          WHEN 'D' THEN 'FULL'
          WHEN 'I' THEN 'DIFFERENTIAL'
          WHEN 'L' THEN 'LOG'
        END AS BackupType,
        MAX(backup_finish_date) AS LastBackup,
        DATEDIFF(HOUR, MAX(backup_finish_date), GETDATE()) AS HoursSinceLast
      FROM msdb.dbo.backupset
      WHERE database_name = 'ClubMaster'
      GROUP BY type
      ORDER BY type
    `);

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

    return NextResponse.json({
      success: true,
      history: result.recordset,
      lastBackups: lastBackups.recordset,
      databaseInfo: dbInfo.recordset[0],
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

    // Generar nombre de archivo con timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];

    // Determinar ruta según tipo de backup
    let basePath = "C:\\Backups\\ClubMaster\\";
    let fileName = "";
    let extension = ".bak";

    switch (backupType) {
      case "FULL":
        fileName = `ClubMaster_FULL_${timestamp}${extension}`;
        break;
      case "DIFFERENTIAL":
        basePath += "Differential\\";
        fileName = `ClubMaster_DIFF_${timestamp}${extension}`;
        break;
      case "LOG":
        basePath += "Logs\\";
        extension = ".trn";
        fileName = `ClubMaster_LOG_${timestamp}${extension}`;
        break;
    }

    const fullPath = basePath + fileName;

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
          COMPRESSION,
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
          COMPRESSION,
          CHECKSUM,
          CONTINUE_AFTER_ERROR
      `;
    }

    // Ejecutar backup
    await pool.request().query(backupQuery);

    // Verificar el backup
    await pool.request().query(`
      RESTORE VERIFYONLY 
      FROM DISK = '${fullPath}'
      WITH CHECKSUM
    `);

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
