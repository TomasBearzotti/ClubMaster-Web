import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const REPORTES_DIR = path.join(process.cwd(), "reportes", "guardados")

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Buscar el archivo metadata
    const metadataPath = path.join(REPORTES_DIR, `${id}_metadata.json`)

    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 })
    }

    // Leer metadata para obtener el nombre del archivo
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
    const pdfPath = path.join(REPORTES_DIR, metadata.nombreArchivo)

    // Eliminar ambos archivos
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath)
    }
    fs.unlinkSync(metadataPath)

    return NextResponse.json({ success: true, mensaje: "Reporte eliminado exitosamente" })
  } catch (error) {
    console.error("Error eliminando reporte:", error)
    return NextResponse.json({ error: "Error al eliminar el reporte" }, { status: 500 })
  }
}
