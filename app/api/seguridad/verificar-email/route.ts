import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email.trim())
      .query(`
        SELECT 
          u.IdUsuario,
          u.Email,
          u.EstadoUsuario,
          p.Nombre,
          p.Apellido
        FROM Usuarios u
        LEFT JOIN Personas p ON u.IdPersona = p.IdPersona
        WHERE u.Email = @email
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: "No existe una cuenta con ese email" },
        { status: 404 }
      );
    }

    const user = result.recordset[0];

    // Verificar que el usuario esté activo
    if (user.EstadoUsuario !== 1) {
      return NextResponse.json(
        { success: false, error: "La cuenta está inactiva. Contacta al administrador." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.IdUsuario,
        email: user.Email,
        nombre: user.Nombre,
        apellido: user.Apellido,
      },
    });
  } catch (error) {
    console.error("Error verificando email:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
