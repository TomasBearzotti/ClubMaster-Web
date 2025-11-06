/**
 * API para eliminar todos los fixtures y partidos de un torneo
 * DELETE /api/fixture/eliminar - Eliminar fixtures de un torneo (solo si está pendiente)
 */

import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function DELETE(request: NextRequest) {
  try {
    const { torneoId } = await request.json();

    if (!torneoId) {
      return NextResponse.json(
        { error: "TorneoId es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar que el torneo existe y está en estado Pendiente
    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId).query(`
        SELECT IdTorneo, Nombre, Estado, TipoTorneo
        FROM Torneos 
        WHERE IdTorneo = @torneoId
      `);

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      );
    }

    const torneo = torneoResult.recordset[0];

    // Validar que el torneo esté en estado Pendiente (0)
    if (torneo.Estado !== 0) {
      return NextResponse.json(
        {
          error:
            "Solo se puede regenerar el fixture de torneos en estado Pendiente. Este torneo ya está en curso o finalizado.",
        },
        { status: 400 }
      );
    }

    // Verificar si tiene fixtures
    const fixturesCount = await pool
      .request()
      .input("torneoId", sql.Int, torneoId).query(`
        SELECT COUNT(*) as Total 
        FROM Fixtures 
        WHERE TorneoId = @torneoId
      `);

    if (fixturesCount.recordset[0].Total === 0) {
      return NextResponse.json(
        {
          error: "No hay fixtures para eliminar en este torneo",
        },
        { status: 400 }
      );
    }

    // Iniciar transacción para eliminar fixtures y partidos
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Obtener IDs de fixtures del torneo
      const fixturesResult = await transaction
        .request()
        .input("torneoId", sql.Int, torneoId).query(`
          SELECT IdFixture 
          FROM Fixtures 
          WHERE TorneoId = @torneoId
        `);

      const fixtureIds = fixturesResult.recordset.map((f) => f.IdFixture);

      // 2. Eliminar partidos asociados a estos fixtures
      if (fixtureIds.length > 0) {
        await transaction.request().input("torneoId", sql.Int, torneoId).query(`
            DELETE FROM Partidos 
            WHERE TorneoId = @torneoId
          `);
      }

      // 3. Eliminar fixtures
      await transaction.request().input("torneoId", sql.Int, torneoId).query(`
          DELETE FROM Fixtures 
          WHERE TorneoId = @torneoId
        `);

      // 4. Resetear TipoTorneo a NULL
      await transaction.request().input("torneoId", sql.Int, torneoId).query(`
          UPDATE Torneos 
          SET TipoTorneo = NULL 
          WHERE IdTorneo = @torneoId
        `);

      await transaction.commit();

      return NextResponse.json({
        success: true,
        message: `Fixture del torneo "${torneo.Nombre}" eliminado exitosamente`,
        fixturesEliminados: fixtureIds.length,
        torneoId: torneoId,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error("Error eliminando fixtures:", error);
    return NextResponse.json(
      {
        error: "Error al eliminar fixtures",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
