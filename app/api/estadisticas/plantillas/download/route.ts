import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partidoId = searchParams.get("partidoId");

    if (!partidoId) {
      return NextResponse.json(
        { error: "Se requiere partidoId" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 🔎 Datos del partido
    const partidoResult = await pool
      .request()
      .input("partidoId", sql.Int, Number(partidoId)).query(`
        SELECT 
          p.IdPartido,
          p.ParticipanteAId,
          p.ParticipanteBId,
          t.Disciplina
        FROM Partidos p
        INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
        WHERE p.IdPartido = @partidoId
      `);

    if (partidoResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Partido no encontrado" },
        { status: 404 }
      );
    }

    const partido = partidoResult.recordset[0];

    // 🔎 Participantes con nombres correctos
    const participantesResult = await pool
      .request()
      .input("ParticipanteAId", sql.Int, partido.ParticipanteAId)
      .input("ParticipanteBId", sql.Int, partido.ParticipanteBId).query(`
        SELECT 
          p.IdParticipante,
          COALESCE(e.Nombre, CONCAT(per.Nombre, ' ', per.Apellido)) as NombreParticipante
        FROM Participantes p
        LEFT JOIN Equipos e ON p.EquipoId = e.IdEquipo
        LEFT JOIN Socios s ON p.SocioId = s.IdSocio
        LEFT JOIN Personas per ON s.IdPersona = per.IdPersona
        WHERE p.IdParticipante IN (@ParticipanteAId, @ParticipanteBId)
      `);

    const participantesMap = Object.fromEntries(
      participantesResult.recordset.map((p: any) => [
        p.IdParticipante,
        p.NombreParticipante,
      ])
    );

    // 🔎 Campos de plantilla
    const plantillaResult = await pool
      .request()
      .input("disciplina", sql.NVarChar, partido.Disciplina).query(`
        SELECT NombreCampo
        FROM PlantillasEstadisticas
        WHERE Disciplina = @disciplina
        ORDER BY IdCampo
      `);

    const campos = plantillaResult.recordset.map((c: any) => c.NombreCampo);

    // 🔎 Crear hoja con encabezados
    const data: any[][] = [];
    data.push(["Participante", ...campos]);

    // Filas por participante
    [partido.ParticipanteAId, partido.ParticipanteBId].forEach((id: number) => {
      const nombre = participantesMap[id] || `Participante ${id}`;
      data.push([nombre, ...campos.map(() => "")]);
    });

    // Generar workbook
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estadísticas");

    // Escribir buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename=plantilla_partido_${partidoId}.xlsx`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error descargando plantilla:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al generar plantilla" },
      { status: 500 }
    );
  }
}
