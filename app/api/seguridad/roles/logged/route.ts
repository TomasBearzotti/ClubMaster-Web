import { NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookie = cookies().get("session")?.value;
    if (!cookie) {
      return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
    }

    const session = JSON.parse(cookie);
    const rolId = session.idRol;

    const pool = await getConnection();
    const result = await pool.request().input("rolId", sql.Int, rolId).query(`
        SELECT 
          r.IdRol, r.Nombre, r.Descripcion, r.EstadoRol,
          p.IdPermiso, p.Nombre AS PermisoNombre, p.Descripcion AS PermisoDescripcion
        FROM Roles r
        LEFT JOIN RolesPermisos rp ON r.IdRol = rp.IdRol
        LEFT JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
        WHERE r.IdRol = @rolId
      `);

    const role = {
      id: result.recordset[0]?.IdRol,
      nombre: result.recordset[0]?.Nombre,
      descripcion: result.recordset[0]?.Descripcion,
      estadoRol: result.recordset[0]?.EstadoRol,
      permisos: result.recordset
        .filter((row) => row.IdPermiso)
        .map((row) => ({
          id: row.IdPermiso,
          nombre: row.PermisoNombre,
          descripcion: row.PermisoDescripcion,
        })),
    };

    // ✅ ahora devolvemos también info del usuario desde la cookie
    return NextResponse.json({
      ...role,
      idUsuario: session.idUsuario,
      email: session.email,
    });
  } catch (error) {
    console.error("❌ Error obteniendo rol del usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
