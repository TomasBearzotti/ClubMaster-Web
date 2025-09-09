import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const partidoId = formData.get("partidoId");

    if (!file || !partidoId) {
      return NextResponse.json(
        { error: "Se requiere un archivo Excel y el partidoId" },
        { status: 400 }
      );
    }

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

    // Insertar estadísticas
    for (const row of rows) {
      const participanteNombre = row["Participante"];

      if (!participanteNombre) continue;

      // Buscar ParticipanteId según nombre (equipo o socio)
      const participanteResult = await pool
        .request()
        .input("nombre", sql.NVarChar, participanteNombre).query(`
          SELECT TOP 1 p.IdParticipante
          FROM Participantes p
          LEFT JOIN Equipos e ON p.EquipoId = e.IdEquipo
          LEFT JOIN Socios s ON p.SocioId = s.IdSocio
          LEFT JOIN Personas per ON s.IdPersona = per.IdPersona
          WHERE e.Nombre = @nombre OR CONCAT(per.Nombre, ' ', per.Apellido) = @nombre
        `);

      if (participanteResult.recordset.length === 0) {
        console.warn(`Participante no encontrado: ${participanteNombre}`);
        continue;
      }

      const participanteId = participanteResult.recordset[0].IdParticipante;

      // Insertar todas las columnas de la fila (excepto "Participante")
      for (const [campo, valor] of Object.entries(row)) {
        if (campo === "Participante") continue;

        if (valor !== null && valor !== "") {
          await pool
            .request()
            .input("partidoId", sql.Int, Number(partidoId))
            .input("participanteId", sql.Int, participanteId)
            .input("nombreCampo", sql.NVarChar, campo)
            .input("valor", sql.NVarChar, String(valor)).query(`
              INSERT INTO EstadisticasPartido (PartidoId, ParticipanteId, NombreCampo, Valor, FechaRegistro)
              VALUES (@partidoId, @participanteId, @nombreCampo, @valor, SYSDATETIME())
            `);
        }
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
