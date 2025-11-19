import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        a.IdArbitro,
        p.Nombre + ' ' + ISNULL(p.Apellido, '') as Nombre,
        p.Mail as Email,
        p.Telefono,
        a.Estado,
        a.Tarifa,
        (
          SELECT STRING_AGG(d.Nombre, ', ') 
          FROM ArbitroDeportes ad
          INNER JOIN Deportes d ON d.IdDeporte = ad.DeporteId
          WHERE ad.ArbitroId = a.IdArbitro
        ) as Deportes,
        (
          SELECT ad.DeporteId
          FROM ArbitroDeportes ad
          WHERE ad.ArbitroId = a.IdArbitro
          FOR JSON PATH
        ) as DeportesIds
      FROM Arbitros a
      INNER JOIN Personas p ON a.IdPersona = p.IdPersona
      ORDER BY p.Nombre, p.Apellido
    `);

    // Parsear DeportesIds de JSON a array
    const arbitros = result.recordset.map((arbitro: any) => ({
      ...arbitro,
      DeportesIds: arbitro.DeportesIds ? JSON.parse(arbitro.DeportesIds).map((d: any) => d.DeporteId) : []
    }));

    return NextResponse.json(arbitros);
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
        "SELECT COUNT(*) as count FROM Personas WHERE DNI = @dni OR Mail = @email"
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
      .input("apellido", sql.NVarChar, apellido || null)
      .input("dni", sql.NVarChar, dni)
      .input("email", sql.NVarChar, email)
      .input("telefono", sql.NVarChar, telefono || null).query(`
        INSERT INTO Personas (Nombre, Apellido, DNI, Mail, Telefono, FechaRegistro)
        OUTPUT INSERTED.IdPersona
        VALUES (@nombre, @apellido, @dni, @email, @telefono, GETDATE())
      `);

    const personaId = personaResult.recordset[0].IdPersona;

    // Crear el árbitro (Estado = 1 Activo por defecto, Tarifa = NULL)
    const arbitroResult = await pool
      .request()
      .input("idPersona", sql.Int, personaId).query(`
        INSERT INTO Arbitros (IdPersona, Estado, Tarifa)
        OUTPUT INSERTED.IdArbitro
        VALUES (@idPersona, 1, NULL)
      `);

    const arbitroId = arbitroResult.recordset[0].IdArbitro;

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
