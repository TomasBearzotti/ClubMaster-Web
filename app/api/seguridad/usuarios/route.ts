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
    const { email, password, idRol, idPersona, estado } = await req.json();
    const pool = await getConnection();
    const hash = await bcrypt.hash(password, 10);
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("hash", sql.NVarChar, hash)
      .input("idPersona", sql.Int, idPersona || null)
      .input("idRol", sql.Int, idRol || null)
      .input("estado", sql.Int, estado ?? 1).query(`
        INSERT INTO Usuarios (Email, ContrasenaHash, IdPersona, IdRol, EstadoUsuario)
        VALUES (@email, @hash, @idPersona, @idRol, @estado);
        SELECT SCOPE_IDENTITY() AS IdUsuario;
      `);

    const idUsuario = result.recordset[0].IdUsuario;

    if (idRol === 2) {
      // Socio
      await pool
        .request()
        .input("idPersona", sql.Int, idPersona)
        .input("usuarioId", sql.Int, idUsuario)
        .input("estado", sql.Int, 1).query(`
    INSERT INTO Socios (IdPersona, UsuarioId, Estado, TipoMembresiaId)
    VALUES (@idPersona, @usuarioId, @estado, 1)
  `);
    }

    if (idRol === 3) {
      // Árbitro
      await pool
        .request()
        .input("idPersona", sql.Int, idPersona)
        .input("estado", sql.Int, 1).query(`
          INSERT INTO Arbitros (IdPersona, Estado)
          VALUES (@idPersona, @estado)
        `);
    }

    return NextResponse.json({ success: true, idUsuario });
  } catch (error) {
    console.error("❌ Error creando usuario:", error);
    return NextResponse.json(
      { error: "Error creando usuario" },
      { status: 500 }
    );
  }
}

// ✅ PUT - Editar usuario
export async function PUT(req: NextRequest) {
  try {
    const { id, email, idRol } = await req.json();
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("email", sql.NVarChar, email)
      .input("idRol", sql.Int, idRol).query(`
        UPDATE Usuarios
        SET Email = @email, IdRol = @idRol
        WHERE IdUsuario = @id
      `);
    // Buscar persona del usuario
    const personaRes = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT IdPersona FROM Usuarios WHERE IdUsuario = @id");
    const idPersonaDb = personaRes.recordset[0]?.IdPersona;
    if (idRol === 2) {
      // Socio activo, árbitro inactivo
      await pool.request().input("idPersona", sql.Int, idPersonaDb).query(`
        UPDATE Socios SET Estado = 1 WHERE IdPersona = @idPersona;
        UPDATE Arbitros SET Estado = 0 WHERE IdPersona = @idPersona;
      `);
    }
    if (idRol === 3) {
      // Árbitro activo, socio inactivo
      await pool.request().input("idPersona", sql.Int, idPersonaDb).query(`
        UPDATE Socios SET Estado = 0 WHERE IdPersona = @idPersona;
        IF EXISTS (SELECT 1 FROM Arbitros WHERE IdPersona = @idPersona)
          UPDATE Arbitros SET Estado = 1 WHERE IdPersona = @idPersona;
        ELSE
          INSERT INTO Arbitros (IdPersona, Estado) VALUES (@idPersona, 1);
      `);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error actualizando usuario:", error);
    return NextResponse.json(
      { error: "Error actualizando usuario" },
      { status: 500 }
    );
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
    const pool = await getConnection();

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Int, estado).query(`
        UPDATE Usuarios SET EstadoUsuario = @estado WHERE IdUsuario = @id
      `);

    if (idPersona) {
      await pool
        .request()
        .input("idPersona", sql.Int, idPersona)
        .input("estado", sql.Int, estado).query(`
          UPDATE Socios SET Estado = @estado WHERE IdPersona = @idPersona;
          UPDATE Arbitros SET Estado = @estado WHERE IdPersona = @idPersona;
        `);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error cambiando estado de usuario:", error);
    return NextResponse.json(
      { error: "Error cambiando estado" },
      { status: 500 }
    );
  }
}
