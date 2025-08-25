import { NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()

    // Test básico de conexión
    const result = await pool.request().query("SELECT 1 as test")

    if (result.recordset[0].test === 1) {
      return NextResponse.json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      })
    } else {
      throw new Error("Test query failed")
    }
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
