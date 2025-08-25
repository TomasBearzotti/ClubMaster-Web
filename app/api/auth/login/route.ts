import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"
import bcrypt from "bcryptjs"

const hashAdmin = await bcrypt.hash("admin", 10)
const hashSocio = await bcrypt.hash("1234", 10)
console.log({ hashAdmin, hashSocio })

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    const emailTrimmed = email.trim().toLowerCase()
    const pool = await getConnection()

    const result = await pool
      .request()
      .input("email", sql.NVarChar, emailTrimmed)
      .query(`
        SELECT u.IdUsuario, u.Email, u.ContrasenaHash, u.Rol, s.Nombre as NombreSocio, s.IdSocio
        FROM Usuarios u
        LEFT JOIN Socios s ON u.IdUsuario = s.UsuarioId
        WHERE LOWER(u.Email) = @email
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const usuario = result.recordset[0]
    console.log("HASH ENCONTRADO:", usuario.ContrasenaHash)

    if (!usuario.ContrasenaHash || typeof usuario.ContrasenaHash !== "string") {
      return NextResponse.json({ error: "Error interno: contraseña inválida" }, { status: 500 })
    }

    const passwordValid = await bcrypt.compare(password, usuario.ContrasenaHash)
    console.log("¿Password válido?", passwordValid)

    if (!passwordValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    let rolTexto = "Usuario"
    if (usuario.Rol === 1) rolTexto = "Administrador"
    else if (usuario.Rol === 2) rolTexto = "Socio"

    return NextResponse.json({
      success: true,
      user: {
        id: usuario.IdUsuario,
        email: usuario.Email,
        rol: usuario.Rol,
        rolTexto,
        nombre: usuario.NombreSocio || "Usuario",
        socioId: usuario.IdSocio || null,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
