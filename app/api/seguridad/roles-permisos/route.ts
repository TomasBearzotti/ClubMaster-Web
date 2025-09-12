import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// ✅ GET - Listar todos los permisos por rol
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        rp.IdRolesPermiso,
        rp.IdRol,
        r.Nombre AS RolNombre,
        rp.IdPermiso,
        p.Nombre AS PermisoNombre,
        p.Descripcion AS PermisoDescripcion,
        rp.FechaAsignacion,
        rp.EstadoPermiso
      FROM RolesPermiso rp
      INNER JOIN Roles r ON rp.IdRol = r.IdRol
      INNER JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
    `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("❌ Error obteniendo roles-permisos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ POST - Asignar un permiso a un rol
export async function POST(req: NextRequest) {
  try {
    const { rolId, permisoId } = await req.json();

    if (!rolId || !permisoId) {
      return NextResponse.json(
        { error: "RolId y PermisoId son obligatorios" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("rolId", sql.Int, rolId)
      .input("permisoId", sql.Int, permisoId).query(`
        INSERT INTO RolesPermiso (IdRol, IdPermiso, FechaAsignacion, EstadoPermiso)
        VALUES (@rolId, @permisoId, GETDATE(), 1)
      `);

    return NextResponse.json({
      success: true,
      message: "Permiso asignado al rol",
    });
  } catch (error) {
    console.error("❌ Error asignando permiso:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ PATCH - Actualizar estado de un permiso en un rol (switch ON/OFF)
export async function PATCH(req: NextRequest) {
  try {
    const { id, estado } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id de la relación rol-permiso es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Int, estado).query(`
        UPDATE RolesPermiso
        SET EstadoPermiso = @estado
        WHERE IdRolesPermiso = @id
      `);

    return NextResponse.json({
      success: true,
      message: "Estado de permiso actualizado",
    });
  } catch (error) {
    console.error("❌ Error actualizando estado de rol-permiso:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ DELETE - Quitar permiso de un rol (baja lógica)
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id de la relación rol-permiso es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool.request().input("id", sql.Int, id).query(`
        UPDATE RolesPermiso
        SET EstadoPermiso = 0
        WHERE IdRolesPermiso = @id
      `);

    return NextResponse.json({
      success: true,
      message: "Permiso quitado del rol (inactivo)",
    });
  } catch (error) {
    console.error("❌ Error quitando permiso de rol:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
