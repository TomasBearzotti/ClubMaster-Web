import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// 📌 GET socio por IdSocio
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // IdSocio
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("idSocio", sql.Int, Number.parseInt(id)).query(`
        SELECT 
          s.IdSocio,
          p.Nombre,
          p.Apellido,
          p.Dni,
          p.Mail as Email,
          p.Telefono,
          s.Estado,
          s.TipoMembresiaId,
          tm.Descripcion as TipoMembresia,
          tm.MontoMensual,
          p.IdPersona
        FROM Socios s
        INNER JOIN Personas p ON s.IdPersona = p.IdPersona
        LEFT JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
        WHERE s.IdSocio = @idSocio
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Socio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching socio by IdSocio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// 📌 PUT actualizar socio por IdSocio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // IdSocio
    const { nombre, apellido, dni, email, telefono, estado, tipoMembresiaId } =
      await request.json();

    if (!nombre || !dni || !email || estado === undefined || !tipoMembresiaId) {
      return NextResponse.json(
        { error: "Datos requeridos faltantes" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar socio y obtener IdPersona
    const socioResult = await pool
      .request()
      .input("idSocio", sql.Int, Number.parseInt(id)).query(`
        SELECT IdSocio, IdPersona 
        FROM Socios 
        WHERE IdSocio = @idSocio
      `);

    if (socioResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Socio no encontrado" },
        { status: 404 }
      );
    }

    const idPersona = socioResult.recordset[0].IdPersona;

    // Validar duplicados DNI/Email
    const existingCheck = await pool
      .request()
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .input("idPersona", sql.Int, idPersona).query(`
        SELECT COUNT(*) as count
        FROM Personas
        WHERE (Dni = @dni OR Mail = @email)
          AND IdPersona != @idPersona
      `);

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json(
        { error: "Ya existe otra persona con ese DNI o email" },
        { status: 400 }
      );
    }

    // Actualizar Persona
    await pool
      .request()
      .input("idPersona", sql.Int, idPersona)
      .input("nombre", sql.NVarChar, nombre)
      .input("apellido", sql.NVarChar, apellido || null)
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null).query(`
        UPDATE Personas
        SET Nombre = @nombre,
            Apellido = @apellido,
            Dni = @dni,
            Mail = @email,
            Telefono = @telefono
        WHERE IdPersona = @idPersona
      `);

    // Actualizar Socio
    await pool
      .request()
      .input("idSocio", sql.Int, Number.parseInt(id))
      .input("estado", sql.Int, estado)
      .input("tipoMembresiaId", sql.Int, tipoMembresiaId).query(`
        UPDATE Socios
        SET Estado = @estado,
            TipoMembresiaId = @tipoMembresiaId
        WHERE IdSocio = @idSocio
      `);

    return NextResponse.json({
      success: true,
      message: "Socio actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error updating socio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// 📌 DELETE (baja lógica)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // IdSocio
    const pool = await getConnection();

    const result = await pool
      .request()
      .input("idSocio", sql.Int, Number.parseInt(id)).query(`
        UPDATE Socios
        SET Estado = 0
        WHERE IdSocio = @idSocio AND Estado = 1
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "Socio no encontrado o ya está inactivo" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Socio dado de baja exitosamente",
    });
  } catch (error) {
    console.error("Error dando de baja socio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
