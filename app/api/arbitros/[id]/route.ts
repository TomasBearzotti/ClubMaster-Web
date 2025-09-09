import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await getConnection();
    const arbitroId = params.id;

    const result = await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId)).query(`
        SELECT 
          a.IdArbitro,
          p.Nombre,
          p.Apellido,
          p.Dni,
          p.Mail as Email,
          p.Telefono,
          a.IdPersona
        FROM Arbitros a
        INNER JOIN Personas p ON a.IdPersona = p.IdPersona
        WHERE a.IdArbitro = @arbitroId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Árbitro no encontrado" },
        { status: 404 }
      );
    }

    // Obtener disponibilidad
    const disponibilidadResult = await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId)).query(`
        SELECT DiaSemana, HoraInicio, HoraFin
        FROM DisponibilidadArbitro
        WHERE IdArbitro = @arbitroId
      `);

    const arbitro = result.recordset[0];
    arbitro.Disponibilidad = disponibilidadResult.recordset;

    return NextResponse.json(arbitro);
  } catch (error) {
    console.error("Error fetching arbitro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await getConnection();
    const arbitroId = params.id;
    const body = await request.json();

    const { Nombre, Apellido, Dni, Email, Telefono, Disponibilidad } = body;

    // Obtener el IdPersona del árbitro
    const arbitroResult = await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
      .query("SELECT IdPersona FROM Arbitros WHERE IdArbitro = @arbitroId");

    if (arbitroResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Árbitro no encontrado" },
        { status: 404 }
      );
    }

    const idPersona = arbitroResult.recordset[0].IdPersona;

    // Actualizar la persona
    await pool
      .request()
      .input("idPersona", sql.Int, idPersona)
      .input("nombre", sql.NVarChar, Nombre)
      .input("apellido", sql.NVarChar, Apellido)
      .input("dni", sql.NVarChar, Dni)
      .input("email", sql.NVarChar, Email)
      .input("telefono", sql.NVarChar, Telefono).query(`
        UPDATE Personas 
        SET 
          Nombre = @nombre,
          Apellido = @apellido,
          Dni = @dni,
          Mail = @email,
          Telefono = @telefono
        WHERE IdPersona = @idPersona
      `);

    // Actualizar disponibilidad si se proporciona
    if (Disponibilidad && Array.isArray(Disponibilidad)) {
      // Eliminar disponibilidad existente
      await pool
        .request()
        .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
        .query(
          "DELETE FROM DisponibilidadArbitro WHERE IdArbitro = @arbitroId"
        );

      // Insertar nueva disponibilidad
      for (const disp of Disponibilidad) {
        await pool
          .request()
          .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
          .input("diaSemana", sql.NVarChar, disp.DiaSemana)
          .input("horaInicio", sql.Time, disp.HoraInicio)
          .input("horaFin", sql.Time, disp.HoraFin).query(`
            INSERT INTO DisponibilidadArbitro (IdArbitro, DiaSemana, HoraInicio, HoraFin)
            VALUES (@arbitroId, @diaSemana, @horaInicio, @horaFin)
          `);
      }
    }

    return NextResponse.json({ message: "Árbitro actualizado correctamente" });
  } catch (error) {
    console.error("Error updating arbitro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
