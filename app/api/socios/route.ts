import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT 
        s.IdSocio,
        s.Nombre,
        s.Dni,
        s.Email,
        s.Telefono,
        s.Estado,
        s.TipoMembresiaId,
        tm.Descripcion as TipoMembresia,
        tm.MontoMensual
      FROM Socios s
      LEFT JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      ORDER BY s.Nombre
    `)

    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching socios:", error)
    return NextResponse.json({ error: "Error al obtener socios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, dni, email, telefono, tipoMembresiaId } = await request.json()

    if (!nombre || !dni || !email || !tipoMembresiaId) {
      return NextResponse.json(
        { error: "Datos requeridos faltantes: nombre, DNI, email, tipoMembresiaId" },
        { status: 400 },
      )
    }

    const pool = await getConnection()

    // Verificar si el DNI o email ya existen
    const existingCheck = await pool
      .request()
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .query("SELECT COUNT(*) as count FROM Socios WHERE Dni = @dni OR Email = @email")

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json({ error: "Ya existe un socio con ese DNI o email" }, { status: 400 })
    }

    const result = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null)
      .input("estado", sql.Int, 1) // Activo por defecto
      .input("tipoMembresiaId", sql.Int, tipoMembresiaId)
      .query(`
        INSERT INTO Socios (Nombre, Dni, Email, Telefono, Estado, TipoMembresiaId)
        OUTPUT INSERTED.IdSocio
        VALUES (@nombre, @dni, @email, @telefono, @estado, @tipoMembresiaId)
      `)

    return NextResponse.json({
      success: true,
      socioId: result.recordset[0].IdSocio,
      message: "Socio creado exitosamente",
    })
  } catch (error) {
    console.error("Error creating socio:", error)
    return NextResponse.json({ error: "Error interno del servidor al crear socio" }, { status: 500 })
  }
}
