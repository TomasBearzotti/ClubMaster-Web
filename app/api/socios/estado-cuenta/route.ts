import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const socioId = searchParams.get("socioId");

    if (!socioId) {
      return NextResponse.json(
        { error: "ID de socio requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Obtener cuotas vencidas del socio con recargos
    const cuotasVencidasResult = await pool
      .request()
      .input("socioId", sql.Int, Number.parseInt(socioId)).query(`
        SELECT 
          COUNT(*) as CuotasVencidas,
          SUM(c.Monto) as DeudaBase,
          SUM(
            c.Monto + (c.Monto * 0.1 * 
              CASE 
                WHEN DATEDIFF(MONTH, c.FechaVencimiento, GETDATE()) > 6 
                THEN 6 
                ELSE DATEDIFF(MONTH, c.FechaVencimiento, GETDATE()) 
              END
            )
          ) as DeudaConRecargo
        FROM Cuotas c
        WHERE c.SocioId = @socioId 
        AND c.Estado = 0 
        AND c.FechaVencimiento < GETDATE()
      `);

    const cuotasVencidas =
      cuotasVencidasResult.recordset[0].CuotasVencidas || 0;
    const deudaBase = cuotasVencidasResult.recordset[0].DeudaBase || 0;
    const deudaConRecargo =
      cuotasVencidasResult.recordset[0].DeudaConRecargo || 0;

    // Determinar estado de riesgo
    let estadoRiesgo = "normal";
    let mensajeAlerta = "";
    let cuotasRestantes = 0;

    if (cuotasVencidas >= 6) {
      estadoRiesgo = "suspendido";
      mensajeAlerta =
        "Tu membresía ha sido suspendida por tener 6 o más cuotas vencidas";
    } else if (cuotasVencidas >= 4) {
      estadoRiesgo = "critico";
      cuotasRestantes = 6 - cuotasVencidas;
      mensajeAlerta = `Riesgo de suspensión: Te quedan ${cuotasRestantes} cuotas antes de la suspensión`;
    } else if (cuotasVencidas >= 2) {
      estadoRiesgo = "advertencia";
      cuotasRestantes = 6 - cuotasVencidas;
      mensajeAlerta = `Tienes ${cuotasVencidas} cuotas vencidas. Te quedan ${cuotasRestantes} antes de la suspensión`;
    }

    return NextResponse.json({
      socioId: Number.parseInt(socioId),
      cuotasVencidas,
      deudaTotal: deudaConRecargo,
      estadoRiesgo,
      mensajeAlerta,
      cuotasRestantes,
    });
  } catch (error) {
    console.error("Error obteniendo estado de cuenta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
