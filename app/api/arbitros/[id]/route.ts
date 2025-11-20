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
          p.Nombre + ' ' + ISNULL(p.Apellido, '') as Nombre,
          p.DNI,
          p.Mail as Email,
          p.Telefono,
          a.Estado,
          a.Tarifa,
          a.IdPersona,
          (
            SELECT STRING_AGG(d.Nombre, ', ')
            FROM ArbitroDeportes ad
            INNER JOIN Deportes d ON ad.DeporteId = d.IdDeporte
            WHERE ad.ArbitroId = a.IdArbitro
          ) as Deportes,
          (
            SELECT '[' + STRING_AGG(CAST(ad.DeporteId AS NVARCHAR), ',') + ']'
            FROM ArbitroDeportes ad
            WHERE ad.ArbitroId = a.IdArbitro
          ) as DeportesIdsJson
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

    const arbitro = result.recordset[0];
    
    // Parsear DeportesIds desde JSON
    if (arbitro.DeportesIdsJson) {
      try {
        arbitro.DeportesIds = JSON.parse(arbitro.DeportesIdsJson);
      } catch {
        arbitro.DeportesIds = [];
      }
      delete arbitro.DeportesIdsJson;
    } else {
      arbitro.DeportesIds = [];
    }

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

    const { Estado, DeportesIds, Tarifa } = body;

    // Verificar que el árbitro existe
    const arbitroResult = await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
      .query("SELECT IdArbitro FROM Arbitros WHERE IdArbitro = @arbitroId");

    if (arbitroResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Árbitro no encontrado" },
        { status: 404 }
      );
    }

    // Si se envía Estado, validarlo
    if (Estado !== undefined && Estado !== 0 && Estado !== 1) {
      return NextResponse.json(
        { error: "Estado inválido. Debe ser 0 (Inactivo) o 1 (Activo)" },
        { status: 400 }
      );
    }

    // Actualizar campos del árbitro
    let updateFields: string[] = [];
    const sqlRequest = pool.request().input("arbitroId", sql.Int, Number.parseInt(arbitroId));

    if (Estado !== undefined) {
      updateFields.push("Estado = @estado");
      sqlRequest.input("estado", sql.Int, Estado);
    }

    if (Tarifa !== undefined) {
      updateFields.push("Tarifa = @tarifa");
      sqlRequest.input("tarifa", sql.Decimal(10, 2), Tarifa);
    }

    if (updateFields.length > 0) {
      await sqlRequest.query(`
        UPDATE Arbitros
        SET ${updateFields.join(", ")}
        WHERE IdArbitro = @arbitroId
      `);
    }

    // Si se envían deportes, actualizar ArbitroDeportes
    if (DeportesIds !== undefined && Array.isArray(DeportesIds)) {
      // Eliminar deportes existentes
      await pool
        .request()
        .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
        .query("DELETE FROM ArbitroDeportes WHERE ArbitroId = @arbitroId");

      // Insertar nuevos deportes
      for (const deporteId of DeportesIds) {
        await pool
          .request()
          .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
          .input("deporteId", sql.Int, deporteId)
          .query(`
            INSERT INTO ArbitroDeportes (ArbitroId, DeporteId)
            VALUES (@arbitroId, @deporteId)
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
