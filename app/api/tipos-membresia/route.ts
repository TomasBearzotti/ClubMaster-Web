import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT IdTipo, Descripcion, MontoMensual
      FROM TiposMembresia
      ORDER BY Descripcion
    `)

    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching tipos membresia:", error)
    return NextResponse.json({ error: "Error al obtener tipos de membresía" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { descripcion, montoMensual } = await request.json()

    if (!descripcion || montoMensual === undefined || montoMensual === null) {
      return NextResponse.json({ error: "Descripción y monto son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()
    const result = await pool
      .request()
      .input("descripcion", sql.NVarChar, descripcion)
      .input("montoMensual", sql.Decimal(10, 2), montoMensual)
      .query(`
        INSERT INTO TiposMembresia (Descripcion, MontoMensual)
        OUTPUT INSERTED.IdTipo
        VALUES (@descripcion, @montoMensual)
      `)

    return NextResponse.json({
      success: true,
      tipoId: result.recordset[0].IdTipo,
      message: "Tipo de membresía creado exitosamente",
    })
  } catch (error) {
    console.error("Error creando tipo de membresía:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
