import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const torneoId = Number.parseInt(params.id);

    const pool = await getConnection();

    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId).query(`
        SELECT 
          t.IdTorneo,
          t.Nombre,
          t.IdDeporte,
          d.Nombre AS NombreDeporte,
          t.FechaInicio,
          t.Estado,
          t.Descripcion,
          t.MaxParticipantes,
          t.FechaFin,
          t.PremioGanador,
          t.TipoTorneo,
        COUNT(p.IdParticipante) as Participantes
        FROM Torneos t
        INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
        LEFT JOIN Participantes p ON t.IdTorneo = p.TorneoId
        WHERE t.IdTorneo = @torneoId
        GROUP BY t.IdTorneo, t.Nombre, t.IdDeporte, d.Nombre, 
         t.FechaInicio, t.Estado, t.Descripcion, t.MaxParticipantes, 
         t.FechaFin, t.PremioGanador, t.TipoTorneo
      `);

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      );
    }

    const torneo = torneoResult.recordset[0];

    return NextResponse.json({
      IdTorneo: torneo.IdTorneo,
      Nombre: torneo.Nombre,
      IdDeporte: torneo.IdDeporte,
      NombreDeporte: torneo.NombreDeporte,
      FechaInicio: torneo.FechaInicio,
      Estado: torneo.Estado,
      Descripcion: torneo.Descripcion,
      MaxParticipantes: torneo.MaxParticipantes,
      FechaFin: torneo.FechaFin,
      PremioGanador: torneo.PremioGanador,
      TipoTorneo: torneo.TipoTorneo,
      Participantes: torneo.Participantes,
    });
  } catch (error) {
    console.error("Error obteniendo torneo:", error);
    return NextResponse.json(
      { error: "Error al obtener torneo" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const torneoId = Number.parseInt(params.id);
    const { estado } = await request.json();

    if (estado === undefined) {
      return NextResponse.json(
        { error: "Estado es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("estado", sql.Int, estado)
      .query("UPDATE Torneos SET Estado = @estado WHERE IdTorneo = @torneoId");

    return NextResponse.json({
      success: true,
      message: "Torneo actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error actualizando torneo:", error);
    return NextResponse.json(
      { error: "Error al actualizar torneo" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const torneoId = Number.parseInt(params.id);
    const {
      Nombre,
      IdDeporte,
      FechaInicio,
      Descripcion,
      MaxParticipantes,
      FechaFin,
      PremioGanador,
      Estado,
    } = await request.json();

    if (!Nombre || !IdDeporte || !FechaInicio) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios: nombre, idDeporte, fechaInicio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // TipoTorneo NO se puede editar manualmente, se define al generar el fixture
    await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("nombre", sql.NVarChar, Nombre)
      .input("idDeporte", sql.Int, IdDeporte)
      .input("fechaInicio", sql.DateTime2, new Date(FechaInicio))
      .input("descripcion", sql.NVarChar, Descripcion || null)
      .input("maxParticipantes", sql.Int, MaxParticipantes || null)
      .input("fechaFin", sql.DateTime2, FechaFin ? new Date(FechaFin) : null)
      .input("premioGanador", sql.NVarChar, PremioGanador || null)
      .input("estado", sql.Int, Estado ?? 0).query(`
      UPDATE Torneos
        SET Nombre = @nombre,
            IdDeporte = @idDeporte,
            FechaInicio = @fechaInicio,
            Descripcion = @descripcion,
            MaxParticipantes = @maxParticipantes,
            FechaFin = @fechaFin,
            PremioGanador = @premioGanador,
            Estado = @estado
        WHERE IdTorneo = @torneoId
        `);

    return NextResponse.json({
      success: true,
      message: "Torneo actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error actualizando torneo (PUT):", error);
    return NextResponse.json(
      { error: "Error al actualizar torneo" },
      { status: 500 }
    );
  }
}
