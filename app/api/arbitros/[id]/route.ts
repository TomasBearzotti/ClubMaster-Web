import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = await getConnection()
    const id = parseInt(params.id)

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          IdArbitro,
          Nombre,
          Email,
          Telefono,
          Disponibilidad
        FROM Arbitros
        WHERE IdArbitro = @id
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Árbitro no encontrado" }, { status: 404 })
    }

    return NextResponse.json(result.recordset[0])
  } catch (error) {
    console.error("Error fetching arbitro:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    const { nombre, email, telefono, disponibilidad } = await request.json()

    if (!nombre || !email) {
      return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.NVarChar, nombre)
      .input("email", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null)
      .input("disponibilidad", sql.NVarChar, disponibilidad || null)
      .query(`
        UPDATE Arbitros
        SET 
          Nombre = @nombre,
          Email = @email,
          Telefono = @telefono,
          Disponibilidad = @disponibilidad
        WHERE IdArbitro = @id
      `)

    return NextResponse.json({ message: "Árbitro actualizado correctamente" })
  } catch (error) {
    console.error("Error actualizando arbitro:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}