import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";

/**
 * API para limpiar el log de transacciones de ClubMaster
 * 
 * POST - Ejecutar limpieza de log
 */

export async function POST(request: NextRequest) {
  try {
    const pool = await getConnection();

    // Obtener tamaño del log antes de la limpieza
    const beforeResult = await pool.request().query(`
      USE ClubMaster;
      SELECT 
        name AS FileName,
        size * 8 / 1024 AS SizeMB,
        CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024 AS UsedMB,
        (size * 8 / 1024) - (CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024) AS FreeMB
      FROM sys.database_files
      WHERE type_desc = 'LOG'
    `);

    const sizeBefore = beforeResult.recordset[0];

    // Cambiar a modo SIMPLE, reducir log, volver a FULL
    await pool.request().query(`
      ALTER DATABASE ClubMaster SET RECOVERY SIMPLE;
      DBCC SHRINKFILE (ClubMaster_Log, 10);
      ALTER DATABASE ClubMaster SET RECOVERY FULL;
    `);

    // Obtener tamaño después de la limpieza
    const afterResult = await pool.request().query(`
      USE ClubMaster;
      SELECT 
        name AS FileName,
        size * 8 / 1024 AS SizeMB,
        CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024 AS UsedMB,
        (size * 8 / 1024) - (CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024) AS FreeMB
      FROM sys.database_files
      WHERE type_desc = 'LOG'
    `);

    const sizeAfter = afterResult.recordset[0];
    const spaceRecovered = sizeBefore.SizeMB - sizeAfter.SizeMB;

    return NextResponse.json({
      success: true,
      message: "Log limpiado exitosamente",
      before: sizeBefore,
      after: sizeAfter,
      spaceRecoveredMB: Math.round(spaceRecovered * 100) / 100,
    });
  } catch (error: any) {
    console.error("Error al limpiar log:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
