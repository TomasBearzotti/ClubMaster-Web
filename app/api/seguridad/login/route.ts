import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email.trim()).query(`
        SELECT 
          u.IdUsuario,
          u.Email,
          u.ContrasenaHash,
          u.IdPersona,
          u.IdRol,
          r.Nombre AS RolNombre
        FROM Usuarios u
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE u.Email = @email
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    const user = result.recordset[0];
    const isValidPassword = await bcrypt.compare(password, user.ContrasenaHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    // 🔎 Obtener permisos del rol
    const permisosResult = await pool
      .request()
      .input("rolId", sql.Int, user.IdRol).query(`
        SELECT p.Nombre
        FROM RolesPermisos rp
        INNER JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
        WHERE rp.IdRol = @rolId
      `);

    const permisos = permisosResult.recordset.map((p) =>
      p.Nombre.toUpperCase()
    );

    // 📌 Datos que vamos a guardar en cookie
    const userData = {
      idUsuario: user.IdUsuario,
      email: user.Email,
      idRol: user.IdRol,
      rolNombre: user.RolNombre,
      permisos, // ✅ incluimos permisos
    };

    // 🔐 Crear cookie segura
    const response = NextResponse.json({
      success: true,
      user: userData,
      message: "Login exitoso",
    });

    response.cookies.set("session", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 👈 solo secure en prod
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas
    });

    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
