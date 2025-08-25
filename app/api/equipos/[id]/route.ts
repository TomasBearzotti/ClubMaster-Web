import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

// GET -> obtener un equipo específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const equipoId = Number(params.id)
    const pool = await getConnection()

    const result = await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .query(`
        SELECT 
          e.IdEquipo,
          e.Nombre,
          e.Disciplina,
          e.CapitanId,
          s.Nombre as NombreCapitan,
          e.FechaCreacion,
          COUNT(ie.SocioId) as CantidadIntegrantes
        FROM Equipos e
        INNER JOIN Socios s ON e.CapitanId = s.IdSocio
        LEFT JOIN IntegrantesEquipo ie ON e.IdEquipo = ie.EquipoId
        WHERE e.IdEquipo = @equipoId
        GROUP BY e.IdEquipo, e.Nombre, e.Disciplina, e.CapitanId, s.Nombre, e.FechaCreacion
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
    }

    return NextResponse.json(result.recordset[0])
  } catch (error) {
    console.error("Error obteniendo equipo:", error)
    return NextResponse.json({ error: "Error al obtener equipo" }, { status: 500 })
  }
}

// PUT -> actualizar equipo
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const equipoId = Number(params.id)
    const { nombre, disciplina } = await request.json()

    if (!nombre || !disciplina) {
      return NextResponse.json({ error: "Nombre y disciplina son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    const result = await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .input("nombre", sql.NVarChar, nombre)
      .input("disciplina", sql.NVarChar, disciplina)
      .query(`
        UPDATE Equipos
        SET Nombre = @nombre, Disciplina = @disciplina
        WHERE IdEquipo = @equipoId
      `)

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Equipo actualizado correctamente" })
  } catch (error) {
    console.error("Error actualizando equipo:", error)
    return NextResponse.json({ error: "Error interno del servidor al actualizar equipo" }, { status: 500 })
  }
}
