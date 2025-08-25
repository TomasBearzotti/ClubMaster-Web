import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const pool = await getConnection()
    const result = await pool
      .request()
      .input("id", sql.Int, Number.parseInt(id))
      .query(`
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
      WHERE s.IdSocio = @id
    `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    return NextResponse.json(result.recordset[0])
  } catch (error) {
    console.error("Error fetching socio by ID:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { nombre, dni, email, telefono, estado, tipoMembresiaId } = await request.json()

    if (!nombre || !dni || !email || estado === undefined || !tipoMembresiaId) {
      return NextResponse.json({ error: "Datos requeridos faltantes" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar si el DNI o email ya existen para otro socio
    const existingCheck = await pool
      .request()
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .input("id", sql.Int, Number.parseInt(id))
      .query("SELECT COUNT(*) as count FROM Socios WHERE (Dni = @dni OR Email = @email) AND IdSocio != @id")

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json({ error: "Ya existe otro socio con ese DNI o email" }, { status: 400 })
    }

    const result = await pool
      .request()
      .input("id", sql.Int, Number.parseInt(id))
      .input("nombre", sql.NVarChar, nombre)
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null)
      .input("estado", sql.Int, estado)
      .input("tipoMembresiaId", sql.Int, tipoMembresiaId)
      .query(`
        UPDATE Socios
        SET Nombre = @nombre, Dni = @dni, Email = @email, Telefono = @telefono, Estado = @estado, TipoMembresiaId = @tipoMembresiaId
        WHERE IdSocio = @id
      `)

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Socio no encontrado o no se realizaron cambios" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Socio actualizado exitosamente" })
  } catch (error) {
    console.error("Error updating socio:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const pool = await getConnection()

    // Opcional: Verificar si el socio tiene cuotas o registros asociados antes de eliminar
    // const checkCuotas = await pool.request().input("socioId", sql.Int, Number.parseInt(id)).query("SELECT COUNT(*) as count FROM Cuotas WHERE SocioId = @socioId");
    // if (checkCuotas.recordset[0].count > 0) {
    //   return NextResponse.json({ error: "No se puede eliminar el socio porque tiene cuotas asociadas." }, { status: 400 });
    // }

    const result = await pool
      .request()
      .input("id", sql.Int, Number.parseInt(id))
      .query(`
        UPDATE Socios
        SET Estado = 0
        WHERE IdSocio = @id AND Estado = 1
    `)

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Socio eliminado exitosamente" })
  } catch (error) {
    console.error("Error deleting socio:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
