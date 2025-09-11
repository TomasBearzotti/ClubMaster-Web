import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { estado } = await request.json();

    if (!id || !estado) {
      return NextResponse.json(
        { error: "Faltan parámetros: id o estado" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    await pool
      .request()
      .input("IdPartido", sql.Int, id)
      .input("EstadoPartido", sql.NVarChar, estado).query(`
        UPDATE Partidos
        SET EstadoPartido = @EstadoPartido
        WHERE IdPartido = @IdPartido
      `);

    return NextResponse.json({
      message: "Estado del partido actualizado correctamente",
      id,
      estado,
    });
  } catch (error) {
    console.error("Error al actualizar estado del partido:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar estado del partido" },
      { status: 500 }
    );
  }
}
