import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// GET -> lista de integrantes de un equipo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const equipoId = Number(params.id);

    if (isNaN(equipoId)) {
      return NextResponse.json(
        { error: "ID de equipo inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const result = await pool.request().input("equipoId", sql.Int, equipoId)
      .query(`
        SELECT s.IdSocio, p.Nombre, p.Apellido, p.Dni, p.Mail AS Email, ie.FechaIngreso
        FROM IntegrantesEquipo ie
        INNER JOIN Socios s ON ie.SocioId = s.IdSocio
        INNER JOIN Personas p ON s.IdPersona = p.IdPersona
        WHERE ie.EquipoId = @equipoId AND s.Estado = 1
        ORDER BY p.Nombre, p.Apellido
      `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error obteniendo integrantes:", error);
    return NextResponse.json(
      { error: "Error al obtener integrantes" },
      { status: 500 }
    );
  }
}

// POST -> agregar un integrante
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const equipoId = Number(params.id);

    if (isNaN(equipoId)) {
      return NextResponse.json(
        { error: "ID de equipo inválido" },
        { status: 400 }
      );
    }

    const { socioId } = await request.json();

    if (!socioId || isNaN(Number(socioId))) {
      return NextResponse.json(
        { error: "ID de socio requerido y válido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar que el equipo existe
    const equipoExists = await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .query(
        `SELECT COUNT(*) as count FROM Equipos WHERE IdEquipo = @equipoId`
      );

    if (equipoExists.recordset[0].count === 0) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el socio existe y está activo
    const socioExists = await pool
      .request()
      .input("socioId", sql.Int, Number(socioId))
      .query(
        `SELECT COUNT(*) as count FROM Socios WHERE IdSocio = @socioId AND Estado = 1`
      );

    if (socioExists.recordset[0].count === 0) {
      return NextResponse.json(
        { error: "Socio no encontrado o inactivo" },
        { status: 404 }
      );
    }

    // Verificar si el integrante ya existe en el equipo
    const existingResult = await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .input("socioId", sql.Int, Number(socioId)).query(`
        SELECT COUNT(*) as count
        FROM IntegrantesEquipo
        WHERE EquipoId = @equipoId AND SocioId = @socioId
      `);

    if (existingResult.recordset[0].count > 0) {
      return NextResponse.json(
        { error: "El socio ya es integrante de este equipo" },
        { status: 400 }
      );
    }

    // Agregar el integrante
    await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .input("socioId", sql.Int, Number(socioId))
      .input("fechaIngreso", sql.DateTime2, new Date()).query(`
        INSERT INTO IntegrantesEquipo (EquipoId, SocioId, FechaIngreso)
        VALUES (@equipoId, @socioId, @fechaIngreso)
      `);

    return NextResponse.json({
      success: true,
      message: "Integrante agregado exitosamente",
    });
  } catch (error) {
    console.error("Error agregando integrante:", error);
    return NextResponse.json(
      { error: "Error al agregar integrante" },
      { status: 500 }
    );
  }
}

// DELETE -> eliminar un integrante
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const socioId = searchParams.get("socioId");

    if (!socioId || isNaN(Number(socioId))) {
      return NextResponse.json(
        { error: "ID de socio requerido y válido" },
        { status: 400 }
      );
    }

    const equipoId = Number(params.id);
    if (isNaN(equipoId)) {
      return NextResponse.json(
        { error: "ID de equipo inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 🔎 Validar que el socio NO sea el capitán
    const capitanCheck = await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .input("socioId", sql.Int, Number(socioId)).query(`
        SELECT COUNT(*) as count
        FROM Equipos
        WHERE IdEquipo = @equipoId AND CapitanId = @socioId
      `);

    if (capitanCheck.recordset[0].count > 0) {
      return NextResponse.json(
        { error: "El capitán no puede ser eliminado del equipo" },
        { status: 400 }
      );
    }

    // Eliminar integrante
    const result = await pool
      .request()
      .input("equipoId", sql.Int, equipoId)
      .input("socioId", sql.Int, Number(socioId)).query(`
        DELETE FROM IntegrantesEquipo
        WHERE EquipoId = @equipoId AND SocioId = @socioId
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "Integrante no encontrado en el equipo" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Integrante eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando integrante:", error);
    return NextResponse.json(
      { error: "Error al eliminar integrante" },
      { status: 500 }
    );
  }
}
