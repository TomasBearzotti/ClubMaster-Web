import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        s.IdSocio,
        s.IdPersona,
        p.Nombre,
        p.Apellido,
        p.Dni,
        p.Mail AS Email,         
        p.Telefono,
        p.FechaRegistro,
        s.Estado,
        s.TipoMembresiaId,
        tm.Descripcion AS TipoMembresia,
        tm.MontoMensual
      FROM Socios s
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
  `);
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error fetching socios:", error);
    return NextResponse.json(
      { error: "Error al obtener socios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, apellido, dni, email, telefono, tipoMembresiaId } =
      await request.json();

    if (!nombre || !apellido || !dni || !email || !tipoMembresiaId) {
      return NextResponse.json(
        {
          error:
            "Datos requeridos faltantes: nombre, apellido, DNI, email, tipoMembresiaId",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar si el DNI o email ya existen
    const existingCheck = await pool
      .request()
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .query(
        "SELECT COUNT(*) as count FROM Personas WHERE Dni = @dni OR Mail = @email"
      );

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json(
        { error: "Ya existe una persona con ese DNI o email" },
        { status: 400 }
      );
    }

    // Crear la persona primero
    const personaResult = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("apellido", sql.NVarChar, apellido)
      .input("dni", sql.NVarChar, dni)
      .input("mail", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null).query(`
        INSERT INTO Personas (Nombre, Apellido, Dni, Mail, Telefono, FechaRegistro)
        OUTPUT INSERTED.IdPersona
        VALUES (@nombre, @apellido, @dni, @mail, @telefono, GETDATE())
      `);

    const personaId = personaResult.recordset[0].IdPersona;

    // Crear el socio
    const socioResult = await pool
      .request()
      .input("idPersona", sql.Int, personaId)
      .input("estado", sql.Int, 1) // Activo por defecto
      .input("tipoMembresiaId", sql.Int, tipoMembresiaId).query(`
        INSERT INTO Socios (IdPersona, Estado, TipoMembresiaId)
        OUTPUT INSERTED.IdSocio
        VALUES (@idPersona, @estado, @tipoMembresiaId)
      `);

    return NextResponse.json({
      success: true,
      socioId: socioResult.recordset[0].IdSocio,
      personaId: personaId,
      message: "Socio creado exitosamente",
    });
  } catch (error) {
    console.error("Error creating socio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al crear socio" },
      { status: 500 }
    );
  }
}
