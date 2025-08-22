import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get("socioId")

    const pool = await getConnection()
    let query = `
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
      WHERE s.Estado = 1
    `

    const request_obj = pool.request()

    if (socioId) {
      query += " AND e.CapitanId = @socioId"
      request_obj.input("socioId", sql.Int, Number.parseInt(socioId))
    }

    query +=
      " GROUP BY e.IdEquipo, e.Nombre, e.Disciplina, e.CapitanId, s.Nombre, e.FechaCreacion ORDER BY e.FechaCreacion DESC"

    const result = await request_obj.query(query)
    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching equipos:", error)
    return NextResponse.json({ error: "Error al obtener equipos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, disciplina, capitanId, integrantes } = await request.json()

    if (!nombre || !disciplina || !capitanId) {
      return NextResponse.json({ error: "Nombre, disciplina y capitán son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar que el capitán existe y está activo
    const capitanExists = await pool
      .request()
      .input("capitanId", sql.Int, capitanId)
      .query(`SELECT COUNT(*) as count FROM Socios WHERE IdSocio = @capitanId AND Estado = 1`)

    if (capitanExists.recordset[0].count === 0) {
      return NextResponse.json({ error: "Capitán no encontrado o inactivo" }, { status: 404 })
    }

    // Verificar que no existe un equipo con el mismo nombre para este capitán
    const equipoExists = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("capitanId", sql.Int, capitanId)
      .query(`SELECT COUNT(*) as count FROM Equipos WHERE Nombre = @nombre AND CapitanId = @capitanId`)

    if (equipoExists.recordset[0].count > 0) {
      return NextResponse.json({ error: "Ya tienes un equipo con ese nombre" }, { status: 400 })
    }

    // Crear el equipo
    const equipoResult = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("disciplina", sql.NVarChar, disciplina)
      .input("capitanId", sql.Int, capitanId)
      .input("fechaCreacion", sql.DateTime2, new Date())
      .query(`
        INSERT INTO Equipos (Nombre, Disciplina, CapitanId, FechaCreacion)
        OUTPUT INSERTED.IdEquipo
        VALUES (@nombre, @disciplina, @capitanId, @fechaCreacion)
      `)

    const equipoId = equipoResult.recordset[0].IdEquipo

    // Agregar integrantes si los hay
    if (integrantes && integrantes.length > 0) {
      for (const integranteId of integrantes) {
        // Verificar que el integrante existe y está activo
        const integranteExists = await pool
          .request()
          .input("integranteId", sql.Int, integranteId)
          .query(`SELECT COUNT(*) as count FROM Socios WHERE IdSocio = @integranteId AND Estado = 1`)

        if (integranteExists.recordset[0].count > 0) {
          await pool
            .request()
            .input("equipoId", sql.Int, equipoId)
            .input("socioId", sql.Int, integranteId)
            .input("fechaIngreso", sql.DateTime2, new Date())
            .query(`
              INSERT INTO IntegrantesEquipo (EquipoId, SocioId, FechaIngreso)
              VALUES (@equipoId, @socioId, @fechaIngreso)
            `)
        }
      }
    }

    return NextResponse.json({
      success: true,
      equipoId,
      message: "Equipo creado exitosamente",
    })
  } catch (error) {
    console.error("Error creating equipo:", error)
    return NextResponse.json({ error: "Error interno del servidor al crear equipo" }, { status: 500 })
  }
}
