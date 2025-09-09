import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deporteId = searchParams.get("deporteId");

    if (!deporteId) {
      return NextResponse.json(
        { error: "DeporteId es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 🔎 Equipos por disciplina con capitán desde Personas
    const equiposResult = await pool
      .request()
      .input("disciplina", sql.NVarChar, deporteId).query(`
        SELECT 
          e.IdEquipo,
          e.Nombre,
          e.Disciplina,
          CONCAT(p.Nombre, ' ', p.Apellido) AS Capitan,
          e.FechaCreacion,
          COUNT(ie.SocioId) AS TotalIntegrantes
        FROM Equipos e
        INNER JOIN Socios s ON e.CapitanId = s.IdSocio
        INNER JOIN Personas p ON s.IdPersona = p.IdPersona
        LEFT JOIN IntegrantesEquipo ie ON e.IdEquipo = ie.EquipoId
        WHERE e.Disciplina = @disciplina
        GROUP BY e.IdEquipo, e.Nombre, e.Disciplina, p.Nombre, p.Apellido, e.FechaCreacion
        ORDER BY e.Nombre
      `);

    return NextResponse.json(equiposResult.recordset);
  } catch (error) {
    console.error("Error fetching equipos por deporte:", error);
    return NextResponse.json(
      { error: "Error al obtener equipos" },
      { status: 500 }
    );
  }
}
