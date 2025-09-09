import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        a.IdArbitro,
        p.Nombre,
        p.Apellido,
        p.Mail as Email,
        p.Telefono,
        da.DiaSemana,
        da.HoraInicio,
        da.HoraFin,
        COUNT(pa.IdPartido) as PartidosAsignados
      FROM Arbitros a
      INNER JOIN Personas p ON a.IdPersona = p.IdPersona
      LEFT JOIN DisponibilidadArbitro da ON a.IdArbitro = da.IdArbitro
      LEFT JOIN Partidos pa ON a.IdArbitro = pa.ArbitroId
      GROUP BY a.IdArbitro, p.Nombre, p.Apellido, p.Mail, p.Telefono, da.DiaSemana, da.HoraInicio, da.HoraFin
      ORDER BY p.Nombre, p.Apellido
    `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error fetching arbitros:", error);
    return NextResponse.json(
      { error: "Error al obtener árbitros" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, apellido, dni, email, telefono, disponibilidad } =
      await request.json();

    if (!nombre || !apellido || !dni || !email) {
      return NextResponse.json(
        { error: "Nombre, apellido, DNI y email son requeridos" },
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
        INSERT INTO Personas (Nombre, Apellido, Dni, Mail, Telefono)
        OUTPUT INSERTED.IdPersona
        VALUES (@nombre, @apellido, @dni, @mail, @telefono)
      `);

    const personaId = personaResult.recordset[0].IdPersona;

    // Crear el árbitro
    const arbitroResult = await pool
      .request()
      .input("idPersona", sql.Int, personaId).query(`
        INSERT INTO Arbitros (IdPersona)
        OUTPUT INSERTED.IdArbitro
        VALUES (@idPersona)
      `);

    const arbitroId = arbitroResult.recordset[0].IdArbitro;

    // Si hay disponibilidad, agregarla
    if (disponibilidad && Array.isArray(disponibilidad)) {
      for (const disp of disponibilidad) {
        await pool
          .request()
          .input("idArbitro", sql.Int, arbitroId)
          .input("diaSemana", sql.NVarChar, disp.diaSemana)
          .input("horaInicio", sql.Time, disp.horaInicio)
          .input("horaFin", sql.Time, disp.horaFin).query(`
            INSERT INTO DisponibilidadArbitro (IdArbitro, DiaSemana, HoraInicio, HoraFin)
            VALUES (@idArbitro, @diaSemana, @horaInicio, @horaFin)
          `);
      }
    }

    return NextResponse.json({
      success: true,
      arbitroId: arbitroId,
      personaId: personaId,
      message: "Árbitro creado exitosamente",
    });
  } catch (error) {
    console.error("Error creating arbitro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al crear árbitro" },
      { status: 500 }
    );
  }
}
