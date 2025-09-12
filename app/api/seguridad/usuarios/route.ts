import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import bcrypt from "bcryptjs";

// ✅ GET - Listar usuarios con sus roles
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        u.IdUsuario,
        u.Email,
        u.EstadoUsuario,
        u.IdPersona,
        ISNULL(p.Nombre, '') AS PersonaNombre,
        ISNULL(p.Apellido, '') AS PersonaApellido,
        ISNULL(p.Dni, '') AS PersonaDni,
        ISNULL(p.Telefono, '') AS PersonaTelefono,
        r.IdRol,
        r.Nombre AS RolNombre,
        per.IdPermiso,
        per.Nombre AS PermisoNombre,
        per.Descripcion AS PermisoDescripcion
      FROM Usuarios u
      LEFT JOIN Personas p ON u.IdPersona = p.IdPersona
      LEFT JOIN Roles r ON u.IdRol = r.IdRol
      LEFT JOIN RolesPermisos rp ON r.IdRol = rp.IdRol
      LEFT JOIN Permisos per ON rp.IdPermiso = per.IdPermiso
    `);

    const usuariosMap: Record<number, any> = {};
    result.recordset.forEach((row: any) => {
      if (!usuariosMap[row.IdUsuario]) {
        usuariosMap[row.IdUsuario] = {
          id: row.IdUsuario,
          email: row.Email,
          estadoUsuario: row.EstadoUsuario,
          idPersona: row.IdPersona,
          persona: {
            nombre: row.PersonaNombre,
            apellido: row.PersonaApellido,
            dni: row.PersonaDni,
            telefono: row.PersonaTelefono,
          },
          roles: [],
        };
      }
      if (row.IdRol) {
        // Buscar si ya está ese rol cargado en este usuario
        let rol = usuariosMap[row.IdUsuario].roles.find(
          (r: any) => r.idRol === row.IdRol
        );

        if (!rol) {
          rol = {
            idRol: row.IdRol,
            nombre: row.RolNombre,
            permisos: [],
          };
          usuariosMap[row.IdUsuario].roles.push(rol);
        }

        // Agregar permiso si existe y no está repetido
        if (
          row.IdPermiso &&
          !rol.permisos.some((p: any) => p.idPermiso === row.IdPermiso)
        ) {
          rol.permisos.push({
            idPermiso: row.IdPermiso,
            nombre: row.PermisoNombre,
            descripcion: row.PermisoDescripcion,
          });
        }
      }
    });
    return NextResponse.json(Object.values(usuariosMap));
  } catch (error) {
    console.error("❌ Error obteniendo usuarios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ POST - Crear usuario
export async function POST(req: NextRequest) {
  try {
    const { email, password, idPersona, idRol, estado } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y password son obligatorios" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const hash = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("hash", sql.NVarChar, hash)
      .input("idPersona", sql.Int, idPersona || null)
      .input("idRol", sql.Int, idRol || null)
      .input("estado", sql.Int, estado ?? 1).query(`
        INSERT INTO Usuarios (Email, ContrasenaHash, IdPersona, IdRol, EstadoUsuario)
        VALUES (@email, @hash, @idPersona, @idRol, @estado)
      `);

    return NextResponse.json({ success: true, message: "Usuario creado" });
  } catch (error) {
    console.error("❌ Error creando usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ PUT - Editar usuario
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, password, idPersona, estado } = body;

    // Normalizo idRol: puede venir como idRol o como roles[] (me quedo con el primero)
    const idRol: number | undefined =
      body.idRol ??
      (Array.isArray(body.roles) && body.roles.length > 0
        ? Number(body.roles[0])
        : undefined);

    if (!id) {
      return NextResponse.json(
        { error: "El id del usuario es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const request = pool.request();

    // Base query dinámica
    const sets: string[] = [];
    request.input("id", sql.Int, id);

    if (email !== undefined) {
      sets.push("Email = @email");
      request.input("email", sql.NVarChar, email);
    }

    if (estado !== undefined) {
      sets.push("EstadoUsuario = @estado");
      request.input("estado", sql.Int, estado);
    }

    if (idPersona !== undefined) {
      sets.push("IdPersona = @idPersona");
      request.input("idPersona", sql.Int, idPersona);
    }

    if (idRol !== undefined) {
      sets.push("IdRol = @idRol");
      request.input("idRol", sql.Int, idRol);
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sets.push("ContrasenaHash = @hash");
      request.input("hash", sql.NVarChar, hash);
    }

    if (sets.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    const query = `UPDATE Usuarios SET ${sets.join(
      ", "
    )} WHERE IdUsuario = @id`;
    await request.query(query);

    return NextResponse.json({ success: true, message: "Usuario actualizado" });
  } catch (error) {
    console.error("❌ Error actualizando usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ DELETE - Baja lógica de usuario
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "El id del usuario es obligatorio" },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    await pool.request().input("id", sql.Int, id).query(`
      UPDATE Usuarios
      SET EstadoUsuario = 0 -- Inactivo (baja lógica)
      WHERE IdUsuario = @id
    `);

    return NextResponse.json({
      success: true,
      message: "Usuario dado de baja (inactivo)",
    });
  } catch (error) {
    console.error("❌ Error dando de baja usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ Cambiar estado de usuario (switch ON/OFF o aprobar pendiente)
export async function PATCH(req: NextRequest) {
  try {
    const { id, estado, idPersona } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "El id del usuario es obligatorio" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Caso especial: aprobar pendiente (0 → 1)
    if (estado === 1) {
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("estado", sql.Int, estado)
        .input("idPersona", sql.Int, idPersona || null) // por ahora dejamos en blanco el manejo de persona
        .query(`
          UPDATE Usuarios
          SET EstadoUsuario = @estado, IdPersona = @idPersona
          WHERE IdUsuario = @id
        `);
    } else {
      // Toggle normal (activo/inactivo)
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("estado", sql.Int, estado).query(`
          UPDATE Usuarios
          SET EstadoUsuario = @estado
          WHERE IdUsuario = @id
        `);
    }

    return NextResponse.json({
      success: true,
      message: "Estado de usuario actualizado",
    });
  } catch (error) {
    console.error("❌ Error actualizando estado de usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
