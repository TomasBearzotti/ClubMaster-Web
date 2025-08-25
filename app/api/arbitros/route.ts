import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT 
        a.IdArbitro,
        a.Nombre,
        a.Email,
        a.Telefono,
        a.Disponibilidad,
        COUNT(p.IdPartido) as PartidosAsignados
      FROM Arbitros a
      LEFT JOIN Partidos p ON a.IdArbitro = p.ArbitroId
      GROUP BY a.IdArbitro, a.Nombre, a.Email, a.Telefono, a.Disponibilidad
      ORDER BY a.Nombre
    `)

    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching arbitros:", error)
    return NextResponse.json({ error: "Error al obtener árbitros" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, telefono, disponibilidad } = await request.json()

    if (!nombre || !email) {
      return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar si el email ya existe
    const existingCheck = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT COUNT(*) as count FROM Arbitros WHERE Email = @email")

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json({ error: "Ya existe un árbitro con ese email" }, { status: 400 })
    }

    const result = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("email", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null)
      .input("disponibilidad", sql.NVarChar, disponibilidad || null) // Ejemplo: "2025-01-15,2025-01-16"
      .query(`
        INSERT INTO Arbitros (Nombre, Email, Telefono, Disponibilidad)
        OUTPUT INSERTED.IdArbitro
        VALUES (@nombre, @email, @telefono, @disponibilidad)
      `)

    return NextResponse.json({
      success: true,
      arbitroId: result.recordset[0].IdArbitro,
      message: "Árbitro creado exitosamente",
    })
  } catch (error) {
    console.error("Error creating arbitro:", error)
    return NextResponse.json({ error: "Error interno del servidor al crear árbitro" }, { status: 500 })
  }
}
