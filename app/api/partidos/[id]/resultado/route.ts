import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import * as XLSX from "xlsx";

export const config = {
  api: { bodyParser: false },
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const IdPartido = parseInt(params.id, 10);
    if (!IdPartido) {
      return NextResponse.json(
        { error: "IdPartido inválido" },
        { status: 400 }
      );
    }

    // Obtener file del formData
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    if (!file) {
      return NextResponse.json(
        { error: "No se subió ningún archivo" },
        { status: 400 }
      );
    }

    // Leer excel desde arrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    type ExcelRow = { Participante?: string; [key: string]: unknown };

    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
    }) as ExcelRow[];

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return NextResponse.json(
        { error: "Excel vacío o formato inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Iniciar transacción
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1) Borrar las estadísticas antiguas del partido
      await transaction.request().input("PartidoId", sql.Int, IdPartido).query(`
          DELETE FROM EstadisticasPartido
          WHERE PartidoId = @PartidoId
        `);

      let insertCount = 0;
      const missingParticipants: string[] = [];

      // Recorremos cada fila del excel y hacemos inserts
      for (const row of jsonData) {
        // Nombre del participante (columna exacta "Participante")
        const participanteNombreRaw = row["Participante"];
        const participanteNombre =
          typeof participanteNombreRaw === "string"
            ? participanteNombreRaw.trim()
            : String(participanteNombreRaw || "").trim();

        if (!participanteNombre) {
          // si no viene nombre, la fila no se procesa
          continue;
        }

        // Buscar IdParticipante por nombre (TOP 1)
        const participanteResult = await transaction
          .request()
          .input("Nombre", sql.NVarChar, participanteNombre)
          .query(
            "SELECT TOP 1 IdParticipante FROM Participantes WHERE Nombre = @Nombre"
          );

        if (participanteResult.recordset.length === 0) {
          // Si no existe el participante lo registramos en missing y saltamos
          missingParticipants.push(participanteNombre);
          continue;
        }

        const participanteId = participanteResult.recordset[0].IdParticipante;

        // Insertar cada campo de la fila excepto la columna "Participante"
        for (const key of Object.keys(row)) {
          if (key === "Participante") continue;

          const rawValor = row[key];
          const valor = rawValor == null ? null : String(rawValor);

          await transaction
            .request()
            .input("PartidoId", sql.Int, IdPartido)
            .input("ParticipanteId", sql.Int, participanteId)
            .input("NombreCampo", sql.NVarChar, key)
            .input("Valor", sql.NVarChar, valor)
            .query(
              `
                INSERT INTO EstadisticasPartido (PartidoId, ParticipanteId, NombreCampo, Valor, FechaRegistro)
                VALUES (@PartidoId, @ParticipanteId, @NombreCampo, @Valor, GETDATE())
              `
            );

          insertCount++;
        }
      }

      // 2) Actualizar estado del partido a finalizado
      await transaction
        .request()
        .input("PartidoId", sql.Int, IdPartido)
        .input("EstadoPartido", sql.NVarChar, "Finalizado")
        .input("EstadoNum", sql.Int, 2).query(`
          UPDATE Partidos
          SET EstadoPartido = @EstadoPartido,
              -- Si la columna Estado existe, la actualizamos; si no existe se ignorará en ejecución si DB la tiene
              Estado = @EstadoNum
          WHERE IdPartido = @PartidoId
        `);

      await transaction.commit();

      return NextResponse.json({
        success: true,
        inserted: insertCount,
        missingParticipants,
        message: "Estadísticas importadas y partido marcado como Finalizado",
      });
    } catch (txErr) {
      await transaction.rollback();
      console.error("Error en transacción al procesar Excel:", txErr);
      return NextResponse.json(
        { error: "Error al procesar e insertar estadísticas" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error procesando Excel:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
