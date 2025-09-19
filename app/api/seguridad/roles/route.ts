import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import { cookies } from "next/headers";

// ✅ GET - Listar roles con sus permisos
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        r.IdRol, 
        r.Nombre, 
        r.Descripcion, 
        r.EstadoRol,
        p.IdPermiso, 
        p.Nombre AS PermisoNombre, 
        p.Descripcion AS PermisoDescripcion
      FROM Roles r
      LEFT JOIN RolesPermisos rp ON r.IdRol = rp.IdRol
      LEFT JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
    `);

    // Agrupar permisos por rol
    const roles: any = {};
    result.recordset.forEach((row) => {
      if (!roles[row.IdRol]) {
        roles[row.IdRol] = {
          id: row.IdRol,
          nombre: row.Nombre,
          descripcion: row.Descripcion,
          estadoRol: row.EstadoRol, // 👈 ahora se devuelve con el nombre correcto
          permisos: [],
        };
      }
      if (row.IdPermiso) {
        roles[row.IdRol].permisos.push({
          id: row.IdPermiso,
          nombre: row.PermisoNombre,
          descripcion: row.PermisoDescripcion,
        });
      }
    });

    return NextResponse.json(Object.values(roles));
  } catch (error) {
    console.error("❌ Error obteniendo roles:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ POST - Crear rol
export async function POST(req: NextRequest) {
  try {
    const { nombre, descripcion, permisos } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("descripcion", sql.NVarChar, descripcion || null).query(`
        INSERT INTO Roles (Nombre, Descripcion)
        OUTPUT INSERTED.IdRol
        VALUES (@nombre, @descripcion)
      `);

    const newRoleId = result.recordset[0].IdRol;

    // Insertar permisos si vienen
    if (permisos && permisos.length > 0) {
      for (const permisoId of permisos) {
        await pool
          .request()
          .input("rolId", sql.Int, newRoleId)
          .input("permisoId", sql.Int, permisoId).query(`
            INSERT INTO RolesPermisos (IdRol, IdPermiso, FechaAsignacion, EstadoPermiso)
            VALUES (@rolId, @permisoId, GETDATE(), 1)
          `);
      }
    }

    return NextResponse.json({
      success: true,
      id: newRoleId,
      message: "Rol creado",
    });
  } catch (error) {
    console.error("❌ Error creando rol:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ PUT - Editar rol y actualizar permisos
export async function PUT(req: NextRequest) {
  try {
    const { id, nombre, descripcion, permisos } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Actualizar nombre/descripcion
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.NVarChar, nombre)
      .input("descripcion", sql.NVarChar, descripcion || null).query(`
        UPDATE Roles
        SET Nombre = @nombre, Descripcion = @descripcion
        WHERE IdRol = @id
      `);

    // Resetear permisos
    await pool
      .request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM RolesPermisos WHERE IdRol = @id`);

    // Insertar permisos de nuevo
    if (permisos && permisos.length > 0) {
      for (const permisoId of permisos) {
        await pool
          .request()
          .input("rolId", sql.Int, id)
          .input("permisoId", sql.Int, permisoId).query(`
            INSERT INTO RolesPermisos (IdRol, IdPermiso, FechaAsignacion, EstadoPermiso)
            VALUES (@rolId, @permisoId, GETDATE(), 1)
          `);
      }
    }

    return NextResponse.json({ success: true, message: "Rol actualizado" });
  } catch (error) {
    console.error("❌ Error actualizando rol:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ DELETE - Baja lógica de rol
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // En lugar de borrar, marcamos el rol como inactivo
    await pool.request().input("id", sql.Int, id).query(`
        UPDATE Roles
        SET EstadoRol = 0 -- Inactivo
        WHERE IdRol = @id
      `);

    return NextResponse.json({
      success: true,
      message: "Rol desactivado (inactivo)",
    });
  } catch (error) {
    console.error("❌ Error desactivando rol:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ Cambiar estado de rol (switch ON/OFF)
export async function PATCH(req: NextRequest) {
  try {
    const { id, estado } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id del rol es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Int, estado).query(`
        UPDATE Roles
        SET EstadoRol = @estado
        WHERE IdRol = @id
      `);

    return NextResponse.json({
      success: true,
      message: "Estado de rol actualizado",
    });
  } catch (error) {
    console.error("❌ Error actualizando estado de rol:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ GET - Rol del usuario logueado (según cookie)
export async function GET_LOGGED_ROLE() {
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
          r.IdRol, 
          r.Nombre, 
          r.Descripcion, 
          r.EstadoRol,
          p.IdPermiso, 
          p.Nombre AS PermisoNombre, 
          p.Descripcion AS PermisoDescripcion
        FROM Roles r
        LEFT JOIN RolesPermisos rp ON r.IdRol = rp.IdRol
        LEFT JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
        WHERE r.IdRol = @rolId
      `);

    // Agrupar permisos del rol
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

    return NextResponse.json(role);
  } catch (error) {
    console.error("❌ Error obteniendo rol del usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
