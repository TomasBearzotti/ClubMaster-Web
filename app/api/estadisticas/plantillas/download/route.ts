import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const IdPartido = searchParams.get("IdPartido");

    if (!IdPartido) {
      return NextResponse.json(
        { error: "IdPartido es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 1. Obtener partido
    const partidoResult = await pool
      .request()
      .input("IdPartido", sql.Int, Number(IdPartido))
      .query(`SELECT TOP 1 * FROM Partidos WHERE IdPartido = @IdPartido`);

    const partido = partidoResult.recordset[0];
    if (!partido) {
      return NextResponse.json(
        { error: "No se encontró el partido" },
        { status: 404 }
      );
    }

    // 2. Obtener disciplina del torneo
    const torneoResult = await pool
      .request()
      .input("IdTorneo", sql.Int, partido.TorneoId)
      .query(
        `SELECT TOP 1 Disciplina, Nombre FROM Torneos WHERE IdTorneo = @IdTorneo`
      );

    const torneo = torneoResult.recordset[0];
    if (!torneo) {
      return NextResponse.json(
        { error: "No se encontró el torneo" },
        { status: 404 }
      );
    }
    const disciplina = torneo.Disciplina;

    // 3. Obtener IdDeporte
    const deporteResult = await pool
      .request()
      .input("Disciplina", sql.NVarChar, disciplina)
      .query(
        `SELECT TOP 1 IdDeporte, Nombre FROM Deportes WHERE Nombre = @Disciplina`
      );

    const deporte = deporteResult.recordset[0];
    if (!deporte) {
      return NextResponse.json(
        { error: "No se encontró el deporte correspondiente a la disciplina" },
        { status: 404 }
      );
    }

    const IdDeporte = deporte.IdDeporte;
    const sportName = deporte.Nombre;

    // 4. Traer campos de plantilla
    const plantillaResult = await pool
      .request()
      .input("deporteId", sql.Int, IdDeporte).query(`
        SELECT NombreCampo, TipoDato, EsObligatorio, Orden
        FROM PlantillasEstadisticas
        WHERE IdDeporte = @deporteId
        ORDER BY Orden
      `);

    const campos = plantillaResult.recordset;
    if (campos.length === 0) {
      return NextResponse.json(
        { error: "No hay plantilla configurada para este deporte" },
        { status: 404 }
      );
    }

    // 5. Obtener nombres de participantes
    const participantesResult = await pool
      .request()
      .input("ParticipanteAId", sql.Int, partido.ParticipanteAId)
      .input("ParticipanteBId", sql.Int, partido.ParticipanteBId).query(`
        SELECT IdParticipante, Nombre
        FROM Participantes
        WHERE IdParticipante IN (@ParticipanteAId, @ParticipanteBId)
      `);

    const participantesMap = Object.fromEntries(
      participantesResult.recordset.map((p: any) => [
        p.IdParticipante,
        p.Nombre,
      ])
    );

    const participantes = [
      participantesMap[partido.ParticipanteAId] || "ParticipanteA",
      participantesMap[partido.ParticipanteBId] || "ParticipanteB",
    ];

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Plantilla de estadísticas
    const headers = [
      "Participante",
      ...campos.map((c) =>
        c.EsObligatorio ? `${c.NombreCampo} *` : c.NombreCampo
      ),
    ];
    const data = [headers];

    participantes.forEach((nombre) => {
      const fila = [
        nombre,
        ...campos.map((c) => {
          if (c.EsObligatorio)
            return c.TipoDato === "int"
              ? 0
              : c.TipoDato === "decimal"
              ? 0.0
              : "FALTANTE";
          return c.TipoDato === "int" ? 0 : c.TipoDato === "decimal" ? 0.0 : "";
        }),
      ];
      data.push(fila);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar ancho de columnas
    const colWidths = headers.map((h, i) => {
      const maxLen = data.reduce(
        (max, row) => Math.max(max, row[i]?.toString()?.length || 0),
        0
      );
      return { wch: Math.max(15, maxLen + 2) };
    });
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

    // Hoja 2: Tabla explicativa de campos con ajuste de columnas
    const explicacion = [
      ["Campo", "Tipo de dato", "Obligatorio", "Comentario / Ejemplo"],
      ...campos.map((c) => [
        c.NombreCampo,
        c.TipoDato,
        c.EsObligatorio ? "Sí" : "No",
        c.TipoDato === "int"
          ? "Número entero"
          : c.TipoDato === "decimal"
          ? "Número decimal"
          : "Texto",
      ]),
    ];

    const worksheetExplicacion = XLSX.utils.aoa_to_sheet(explicacion);

    // Ajustar ancho de columnas automáticamente
    const colWidthsExplicacion = explicacion[0].map((_, i) => {
      const maxLen = explicacion.reduce(
        (max, row) => Math.max(max, row[i]?.toString()?.length || 0),
        0
      );
      return { wch: Math.max(15, maxLen + 2) }; // ancho mínimo 15 + padding
    });
    worksheetExplicacion["!cols"] = colWidthsExplicacion;

    XLSX.utils.book_append_sheet(workbook, worksheetExplicacion, "Explicacion");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Función para limpiar acentos y caracteres especiales
    function sanitizeName(name: string) {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
    }

    const torneoNombreSeguro = (torneo.Nombre || "Torneo").replace(/\s+/g, "");
    const participantesSeguro = `${sanitizeName(
      participantes[0]
    )}_VS_${sanitizeName(participantes[1])}`;
    const fase = (partido.Fase || "Fase").replace(/\s+/g, "");

    const filename = `${torneoNombreSeguro}_${participantesSeguro}_${fase}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generando plantilla Excel:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
