import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// ✅ GET - Listar todos los permisos
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT IdPermiso, Nombre, Descripcion
      FROM Permisos
    `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("❌ Error obteniendo permisos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ POST - Crear permiso
export async function POST(req: NextRequest) {
  try {
    const { nombre, descripcion } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("descripcion", sql.NVarChar, descripcion || null).query(`
        INSERT INTO Permisos (Nombre, Descripcion)
        VALUES (@nombre, @descripcion)
      `);

    return NextResponse.json({ success: true, message: "Permiso creado" });
  } catch (error) {
    console.error("❌ Error creando permiso:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ PUT - Editar permiso
export async function PUT(req: NextRequest) {
  try {
    const { id, nombre, descripcion } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id del permiso es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.NVarChar, nombre)
      .input("descripcion", sql.NVarChar, descripcion || null).query(`
        UPDATE Permisos
        SET Nombre = @nombre, Descripcion = @descripcion
        WHERE IdPermiso = @id
      `);

    return NextResponse.json({ success: true, message: "Permiso actualizado" });
  } catch (error) {
    console.error("❌ Error actualizando permiso:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ DELETE - Eliminar permiso
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id del permiso es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 1. Quitar el permiso de todos los roles asociados
    await pool.request().input("id", sql.Int, id).query(`
        DELETE FROM RolesPermisos WHERE IdPermiso = @id
      `);

    // 2. Eliminar el permiso
    await pool.request().input("id", sql.Int, id).query(`
        DELETE FROM Permisos WHERE IdPermiso = @id
      `);

    return NextResponse.json({ success: true, message: "Permiso eliminado" });
  } catch (error) {
    console.error("❌ Error eliminando permiso:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
