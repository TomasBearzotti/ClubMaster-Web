/**
 * API para manejar fixtures individuales
 * GET /api/fixture/[id] - Obtener detalles de un fixture
 * PUT /api/fixture/[id] - Actualizar un fixture
 * DELETE /api/fixture/[id] - Eliminar un fixture y sus partidos
 */

import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fixtureId = Number.parseInt(params.id);

    if (isNaN(fixtureId)) {
      return NextResponse.json(
        { error: "ID de fixture inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Obtener detalles del fixture
    const fixtureResult = await pool
      .request()
      .input("fixtureId", sql.Int, fixtureId).query(`
        SELECT 
          f.IdFixture,
          f.Tipo,
          f.TorneoId,
          f.Nombre,
          f.NumeroRonda,
          f.Grupo,
          f.FechaInicio,
          f.FechaFin,
          t.Nombre as TorneoNombre,
          t.TipoTorneo
        FROM Fixtures f
        INNER JOIN Torneos t ON f.TorneoId = t.IdTorneo
        WHERE f.IdFixture = @fixtureId
      `);

    if (fixtureResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Fixture no encontrado" },
        { status: 404 }
      );
    }

    const fixture = fixtureResult.recordset[0];

    // Obtener partidos del fixture
    const partidosResult = await pool
      .request()
      .input("fixtureId", sql.Int, fixtureId).query(`
        SELECT 
          p.IdPartido,
          p.ParticipanteAId,
          p.ParticipanteBId,
          pa.Nombre as ParticipanteA,
          pb.Nombre as ParticipanteB,
          p.FechaHora,
          p.Lugar,
          p.Estado,
          p.EstadoPartido,
          p.ArbitroId,
          a.IdPersona as ArbitroPersonaId,
          per.Nombre as ArbitroNombre,
          per.Apellido as ArbitroApellido
        FROM Partidos p
        INNER JOIN Participantes pa ON p.ParticipanteAId = pa.IdParticipante
        LEFT JOIN Participantes pb ON p.ParticipanteBId = pb.IdParticipante
        LEFT JOIN Arbitros a ON p.ArbitroId = a.IdArbitro
        LEFT JOIN Personas per ON a.IdPersona = per.IdPersona
        WHERE p.FixtureIdFixture = @fixtureId
        ORDER BY p.FechaHora ASC, p.IdPartido ASC
      `);

    return NextResponse.json({
      fixture,
      partidos: partidosResult.recordset,
      totalPartidos: partidosResult.recordset.length,
    });
  } catch (error) {
    console.error("Error obteniendo fixture:", error);
    return NextResponse.json(
      { error: "Error al obtener fixture" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fixtureId = Number.parseInt(params.id);
    const { Nombre, NumeroRonda, Grupo, FechaInicio, FechaFin } =
      await request.json();

    if (isNaN(fixtureId)) {
      return NextResponse.json(
        { error: "ID de fixture inválido" },
        { status: 400 }
      );
    }

    if (!Nombre) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    await pool
      .request()
      .input("fixtureId", sql.Int, fixtureId)
      .input("nombre", sql.NVarChar, Nombre)
      .input("numeroRonda", sql.Int, NumeroRonda ?? null)
      .input("grupo", sql.NVarChar, Grupo ?? null)
      .input(
        "fechaInicio",
        sql.DateTime2,
        FechaInicio ? new Date(FechaInicio) : null
      )
      .input("fechaFin", sql.DateTime2, FechaFin ? new Date(FechaFin) : null)
      .query(`
        UPDATE Fixtures
        SET Nombre = @nombre,
            NumeroRonda = @numeroRonda,
            Grupo = @grupo,
            FechaInicio = @fechaInicio,
            FechaFin = @fechaFin
        WHERE IdFixture = @fixtureId
      `);

    return NextResponse.json({
      success: true,
      message: "Fixture actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error actualizando fixture:", error);
    return NextResponse.json(
      { error: "Error al actualizar fixture" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fixtureId = Number.parseInt(params.id);

    if (isNaN(fixtureId)) {
      return NextResponse.json(
        { error: "ID de fixture inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar que el fixture existe
    const fixtureCheck = await pool
      .request()
      .input("fixtureId", sql.Int, fixtureId)
      .query(`SELECT IdFixture FROM Fixtures WHERE IdFixture = @fixtureId`);

    if (fixtureCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "Fixture no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el fixture (los partidos se eliminan en cascada por FK)
    await pool
      .request()
      .input("fixtureId", sql.Int, fixtureId)
      .query(`DELETE FROM Fixtures WHERE IdFixture = @fixtureId`);

    return NextResponse.json({
      success: true,
      message: "Fixture y sus partidos eliminados exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando fixture:", error);
    return NextResponse.json(
      { error: "Error al eliminar fixture" },
      { status: 500 }
    );
  }
}
