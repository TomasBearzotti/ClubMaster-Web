import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function POST(request: NextRequest) {
  //console.log("=== API Plantillas POST ===");

  try {
    const body = await request.json();
    //console.log("Request body:", body);

    const { deporteId } = body;

    if (!deporteId) {
      console.error("deporteId es requerido");
      return NextResponse.json(
        { error: "deporteId es requerido" },
        { status: 400 }
      );
    }

    //console.log("deporteId recibido:", deporteId, "tipo:", typeof deporteId);

    const pool = await getConnection();

    const plantillaResult = await pool
      .request()
      .input("deporteId", sql.Int, deporteId).query(`
        SELECT NombreCampo, TipoDato, EsObligatorio, Orden
        FROM PlantillasEstadisticas
        WHERE IdDeporte = @deporteId
        ORDER BY Orden
      `);

    // console.log("Resultado plantilla:", plantillaResult.recordset);

    const plantilla = plantillaResult.recordset;

    // Generar estructura de plantilla Excel
    const plantillaExcel = {
      headers: ["Participante", "Tipo", ...plantilla.map((p) => p.NombreCampo)],
      campos: plantilla,
      instrucciones: [
        "Complete los datos de estadísticas para cada participante",
        'Tipo: "Equipo" o "Individual"',
        "Deje en blanco los campos que no apliquen",
        "Los campos marcados como obligatorios deben completarse",
      ],
    };

    //console.log("Respuesta generada:", plantillaExcel);

    return NextResponse.json({
      success: true,
      plantilla: plantillaExcel,
      message: "Plantilla generada correctamente",
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Error al generar plantilla" },
      { status: 500 }
    );
  }
}
