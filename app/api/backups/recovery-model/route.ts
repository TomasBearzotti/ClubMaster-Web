import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";

/**
 * API para cambiar el modo de recuperación de la base de datos
 * POST - Cambiar entre SIMPLE y FULL
 */

export async function POST(request: NextRequest) {
  try {
    const { mode } = await request.json();

    if (!["SIMPLE", "FULL"].includes(mode)) {
      return NextResponse.json(
        { success: false, message: "Modo inválido. Use SIMPLE o FULL" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Cambiar el modo de recuperación
    await pool.request().query(`
      ALTER DATABASE ClubMaster
      SET RECOVERY ${mode}
    `);

    return NextResponse.json({
      success: true,
      message: `Modo de recuperación cambiado a ${mode}`,
      mode: mode,
    });
  } catch (error: any) {
    console.error("Error al cambiar modo de recuperación:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Error al cambiar modo de recuperación" 
      },
      { status: 500 }
    );
  }
}
