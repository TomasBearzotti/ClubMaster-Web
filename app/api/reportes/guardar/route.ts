import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

// Ruta donde se guardarán los reportes
const REPORTES_DIR = path.join(process.cwd(), "reportes", "guardados")

export async function POST(request: NextRequest) {
  try {
    const { nombre, tipo, filtros, contenidoBase64 } = await request.json()

    if (!nombre || !tipo || !contenidoBase64) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Crear directorio de reportes si no existe
    if (!existsSync(REPORTES_DIR)) {
      await mkdir(REPORTES_DIR, { recursive: true })
    }

    // Crear nombre de archivo único
    const timestamp = new Date().getTime()
    const fileName = `${timestamp}_${nombre.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`
    const filePath = path.join(REPORTES_DIR, fileName)

    // Convertir base64 a buffer y guardar PDF
    const pdfBuffer = Buffer.from(contenidoBase64, "base64")
    await writeFile(filePath, pdfBuffer)

    // Guardar metadata en archivo JSON
    const metadata = {
      id: timestamp.toString(),
      nombre,
      tipo,
      filtros,
      fechaCreacion: new Date().toISOString(),
      nombreArchivo: fileName,
    }

    const metadataPath = path.join(REPORTES_DIR, `${timestamp}_metadata.json`)
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2))

    return NextResponse.json({
      success: true,
      mensaje: "Reporte guardado exitosamente",
      reporte: metadata,
    })
  } catch (error: any) {
    console.error("Error al guardar reporte:", error)
    return NextResponse.json({ error: "Error al guardar reporte", details: error.message }, { status: 500 })
  }
}
