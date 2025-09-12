import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// ✅ GET - Listar jerarquía de roles
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        rr.IdRolesRoles,
        rr.PadreRolId,
        padre.Nombre AS PadreNombre,
        rr.HijoRolId,
        hijo.Nombre AS HijoNombre,
        rr.TipoRelacion
      FROM RolesRoles rr
      INNER JOIN Roles padre ON rr.PadreRolId = padre.IdRol
      INNER JOIN Roles hijo ON rr.HijoRolId = hijo.IdRol
    `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("❌ Error obteniendo roles-roles:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ POST - Crear relación padre-hijo entre roles
export async function POST(req: NextRequest) {
  try {
    const { padreRolId, hijoRolId, tipoRelacion } = await req.json();

    if (!padreRolId || !hijoRolId) {
      return NextResponse.json(
        { error: "PadreRolId y HijoRolId son obligatorios" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("padre", sql.Int, padreRolId)
      .input("hijo", sql.Int, hijoRolId)
      .input("tipo", sql.NVarChar, tipoRelacion || "incluye").query(`
        INSERT INTO RolesRoles (PadreRolId, HijoRolId, TipoRelacion)
        VALUES (@padre, @hijo, @tipo)
      `);

    return NextResponse.json({ success: true, message: "Relación creada" });
  } catch (error) {
    console.error("❌ Error creando relación:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ PUT - Editar relación
export async function PUT(req: NextRequest) {
  try {
    const { id, padreRolId, hijoRolId, tipoRelacion } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id de la relación es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("padre", sql.Int, padreRolId)
      .input("hijo", sql.Int, hijoRolId)
      .input("tipo", sql.NVarChar, tipoRelacion).query(`
        UPDATE RolesRoles
        SET PadreRolId = @padre, HijoRolId = @hijo, TipoRelacion = @tipo
        WHERE IdRolesRoles = @id
      `);

    return NextResponse.json({
      success: true,
      message: "Relación actualizada",
    });
  } catch (error) {
    console.error("❌ Error actualizando relación:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ DELETE - Eliminar relación
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id de la relación es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool.request().input("id", sql.Int, id).query(`
      DELETE FROM RolesRoles WHERE IdRolesRoles = @id
    `);

    return NextResponse.json({ success: true, message: "Relación eliminada" });
  } catch (error) {
    console.error("❌ Error eliminando relación:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
