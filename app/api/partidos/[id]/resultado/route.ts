import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const partidoIdFromUrl = request.url.split("/").slice(-2)[0]; // o usar params si definís el handler así
    if (!file) {
      return NextResponse.json(
        { error: "Se requiere un archivo Excel" },
        { status: 400 }
      );
    }
    const partidoId = Number(partidoIdFromUrl);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 🔎 Leer Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertir a JSON (una fila = participante)
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "El archivo Excel está vacío" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 🔎 Buscar IdDeporte del partido
    const partidoResult = await pool
      .request()
      .input("IdPartido", sql.Int, Number(partidoId))
      .query(`SELECT TorneoId FROM Partidos WHERE IdPartido = @IdPartido`);

    const torneoId = partidoResult.recordset[0].TorneoId;

    const torneoResult = await pool
      .request()
      .input("IdTorneo", sql.Int, torneoId)
      .query(`SELECT IdDeporte FROM Torneos WHERE IdTorneo = @IdTorneo`);

    const idDeporte = torneoResult.recordset[0].IdDeporte;

    // 🔎 Obtener plantilla completa
    const plantillaResult = await pool
      .request()
      .input("IdDeporte", sql.Int, idDeporte)
      .query(
        `SELECT IdPlantilla, NombreCampo FROM PlantillasEstadisticas WHERE IdDeporte = @IdDeporte`
      );

    const plantillaMap = Object.fromEntries(
      plantillaResult.recordset.map(
        (p: any) =>
          [p.NombreCampo.toLowerCase(), p.IdPlantilla] as [string, number]
      )
    );

    // 🔎 Guardar último participante por si la celda está vacía en Excel
    let lastParticipanteNombre: string | null = null;

    for (const row of rows) {
      const participanteNombreRaw: string =
        row["Participante"] || lastParticipanteNombre || "";
      if (!participanteNombreRaw) continue;
      lastParticipanteNombre = participanteNombreRaw;

      const participanteNombre = participanteNombreRaw
        .toString()
        .trim()
        .toLowerCase();

      // Buscar ParticipanteId según nombre (equipo o socio)
      const participanteResult = await pool
        .request()
        .input("nombre", sql.NVarChar, participanteNombre).query(`
          SELECT TOP 1 p.IdParticipante
          FROM Participantes p
          LEFT JOIN Equipos e ON p.EquipoId = e.IdEquipo
          LEFT JOIN Socios s ON p.SocioId = s.IdSocio
          LEFT JOIN Personas per ON s.IdPersona = per.IdPersona
          WHERE LOWER(e.Nombre) = @nombre 
             OR LOWER(CONCAT(per.Nombre, ' ', per.Apellido)) = @nombre
        `);

      if (participanteResult.recordset.length === 0) {
        console.warn(`Participante no encontrado: ${participanteNombreRaw}`);
        continue;
      }

      const participanteId = participanteResult.recordset[0].IdParticipante;

      // Insertar todas las columnas de la fila (excepto "Participante")
      for (const [campo, valor] of Object.entries(row)) {
        if (campo === "Participante") continue;
        if (valor === null || valor === "") continue;

        let cleanCampo = campo.trim();
        if (cleanCampo.endsWith("*")) {
          cleanCampo = cleanCampo.slice(0, -1).trim();
        }

        const idPlantilla = plantillaMap[cleanCampo.toLowerCase()];
        if (!idPlantilla) {
          console.warn(`Campo no encontrado en plantilla: ${cleanCampo}`);
          continue;
        }

        await pool
          .request()
          .input("partidoId", sql.Int, Number(partidoId))
          .input("participanteId", sql.Int, participanteId)
          .input("idPlantilla", sql.Int, idPlantilla)
          .input("valor", sql.NVarChar, String(valor)).query(`
          MERGE EstadisticasPartido AS target
          USING (
          SELECT @partidoId AS PartidoId, @participanteId AS ParticipanteId, @idPlantilla AS IdPlantilla
          ) AS source
          ON target.PartidoId = source.PartidoId
            AND target.ParticipanteId = source.ParticipanteId
            AND target.IdPlantilla = source.IdPlantilla
          WHEN MATCHED THEN
            UPDATE SET Valor = @valor, FechaRegistro = SYSDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (PartidoId, ParticipanteId, IdPlantilla, Valor, FechaRegistro)
            VALUES (@partidoId, @participanteId, @idPlantilla, @valor, SYSDATETIME());
        `);
      }
    }
    return NextResponse.json({
      success: true,
      message: "Estadísticas importadas correctamente",
    });
  } catch (error) {
    console.error("Error importando estadísticas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al importar estadísticas" },
      { status: 500 }
    );
  }
}
