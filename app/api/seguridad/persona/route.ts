import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, dni, telefono, mail } = await req.json();

    if (!nombre || !dni || !mail) {
      return NextResponse.json(
        { error: "nombre, dni y mail son obligatorios" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 🔎 Buscar existente por DNI o Mail (evitamos duplicados suaves)
    const dupCheck = await pool
      .request()
      .input("dni", sql.NVarChar, dni ?? null)
      .input("mail", sql.NVarChar, mail ?? null).query(`
        SELECT TOP 1 IdPersona
        FROM Personas
        WHERE (@dni IS NOT NULL AND LTRIM(RTRIM(Dni)) = LTRIM(RTRIM(@dni)))
           OR (@mail IS NOT NULL AND LTRIM(RTRIM(Mail)) = LTRIM(RTRIM(@mail)))
      `);

    if (dupCheck.recordset.length > 0) {
      const idPersona = dupCheck.recordset[0].IdPersona;
      return NextResponse.json({
        success: true,
        idPersona,
        alreadyExisted: true,
        message: "Persona ya existente por DNI o Mail",
      });
    }

    // 🆕 Insertar persona
    const insert = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("apellido", sql.NVarChar, apellido ?? null)
      .input("dni", sql.NVarChar, dni)
      .input("telefono", sql.NVarChar, telefono ?? null)
      .input("mail", sql.NVarChar, mail).query(`
        INSERT INTO Personas (Nombre, Apellido, Dni, Telefono, Mail, FechaRegistro)
        OUTPUT INSERTED.IdPersona AS IdPersona
        VALUES (@nombre, @apellido, @dni, @telefono, @mail, GETDATE())
      `);

    const idPersona = insert.recordset[0].IdPersona;

    return NextResponse.json({
      success: true,
      idPersona,
      message: "Persona creada",
    });
  } catch (error) {
    console.error("❌ Error creando persona:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const pool = await getConnection();
    let result;

    if (q && q.trim()) {
      result = await pool
        .request()
        .input("like", sql.NVarChar, `%${q.trim()}%`)
        .input("q", sql.NVarChar, q.trim()).query(`
          SELECT TOP 50
            IdPersona, Nombre, Apellido, Dni, Telefono, Mail, FechaRegistro
          FROM Personas
          WHERE Nombre  LIKE @like
             OR Apellido LIKE @like
             OR Mail     LIKE @like
             OR Dni      = @q
          ORDER BY Apellido, Nombre
        `);
    } else {
      result = await pool.request().query(`
        SELECT TOP 100
          IdPersona, Nombre, Apellido, Dni, Telefono, Mail, FechaRegistro
        FROM Personas
        ORDER BY IdPersona DESC
      `);
    }

    return NextResponse.json(
      result.recordset.map((p: any) => ({
        idPersona: p.IdPersona,
        nombre: p.Nombre ?? "",
        apellido: p.Apellido ?? "",
        dni: p.Dni ?? "",
        telefono: p.Telefono ?? "",
        mail: p.Mail ?? "",
        fechaRegistro: p.FechaRegistro ?? null,
      }))
    );
  } catch (error) {
    console.error("❌ Error listando personas:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
