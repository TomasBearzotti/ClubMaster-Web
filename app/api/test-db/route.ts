import { NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()

    // Probar la conexión y obtener información de las tablas
    const result = await pool.request().query(`
      SELECT 
        @@VERSION as version, 
        GETDATE() as currentTime,
        DB_NAME() as database_name
    `)

    // Contar registros en tablas principales
    const tablesInfo = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Socios) as total_socios,
        (SELECT COUNT(*) FROM Cuotas) as total_cuotas,
        (SELECT COUNT(*) FROM Torneos) as total_torneos,
        (SELECT COUNT(*) FROM Arbitros) as total_arbitros,
        (SELECT COUNT(*) FROM TiposMembresia) as total_tipos_membresia
    `)

    return NextResponse.json({
      success: true,
      message: "Conexión exitosa a ClubMaster",
      server_info: result.recordset[0],
      database_stats: tablesInfo.recordset[0],
      server: "TOMIPC\\SQLEXPRESS",
      database: "ClubMaster",
    })
  } catch (error) {
    console.error("Error de conexión:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        details: "Verifica que SQL Server esté ejecutándose y las credenciales sean correctas",
      },
      { status: 500 },
    )
  }
}
