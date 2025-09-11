import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const IdDeporte = Number(body.IdDeporte);

    if (isNaN(IdDeporte) || IdDeporte <= 0) {
      return NextResponse.json(
        { error: "Se requiere un IdDeporte válido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const result = await pool.request().input("IdDeporte", sql.Int, IdDeporte)
      .query(`
        SELECT IdPlantilla, NombreCampo, TipoDato, EsObligatorio, Orden
        FROM PlantillasEstadisticas
        WHERE IdDeporte = @IdDeporte
        ORDER BY Orden
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        {
          error: `No se encontraron campos de plantilla para el deporte con Id ${IdDeporte}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      IdDeporte,
      campos: result.recordset,
    });
  } catch (error) {
    console.error("Error obteniendo plantilla:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener la plantilla" },
      { status: 500 }
    );
  }
}
