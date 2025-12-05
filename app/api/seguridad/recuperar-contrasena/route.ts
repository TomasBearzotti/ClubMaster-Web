import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email y nueva contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Validar contraseña
    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar que el usuario existe
    const userCheck = await pool
      .request()
      .input("email", sql.NVarChar, email.trim())
      .query(`
        SELECT IdUsuario, EstadoUsuario
        FROM Usuarios
        WHERE Email = @email
      `);

    if (userCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const user = userCheck.recordset[0];

    if (user.EstadoUsuario !== 1) {
      return NextResponse.json(
        { error: "La cuenta está inactiva. Contacta al administrador." },
        { status: 403 }
      );
    }

    // Hashear la nueva contraseña
    const hash = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    await pool
      .request()
      .input("email", sql.NVarChar, email.trim())
      .input("hash", sql.NVarChar, hash)
      .query(`
        UPDATE Usuarios
        SET ContrasenaHash = @hash
        WHERE Email = @email
      `);

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error actualizando contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
