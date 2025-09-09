import { type NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";
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

    const result = await pool.request().input("email", email.trim()).query(`
        SELECT 
          IdUsuario,
          Email,
          ContrasenaHash,
          IdPersona,
          IdRol
        FROM Usuarios
        WHERE Email = @email
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

    // Guardar datos mínimos del usuario para cache posterior
    const userData = {
      idUsuario: user.IdUsuario,
      email: user.Email,
      idPersona: user.IdPersona,
      idRol: user.IdRol,
    };

    return NextResponse.json({
      success: true,
      user: userData,
      message: "Login exitoso",
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
