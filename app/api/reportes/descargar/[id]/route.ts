import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const REPORTES_DIR = path.join(process.cwd(), "reportes", "guardados")

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const preview = searchParams.get("preview") === "true"

    // Buscar el archivo metadata
    const metadataPath = path.join(REPORTES_DIR, `${id}_metadata.json`)

    if (!existsSync(metadataPath)) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 })
    }

    // Leer metadata para obtener el nombre del archivo
    const metadataContent = await readFile(metadataPath, "utf-8")
    const metadata = JSON.parse(metadataContent)
    const pdfPath = path.join(REPORTES_DIR, metadata.nombreArchivo)

    if (!existsSync(pdfPath)) {
      return NextResponse.json({ error: "Archivo PDF no encontrado" }, { status: 404 })
    }

    // Leer el archivo PDF
    const pdfBuffer = await readFile(pdfPath)

    // Devolver el PDF con headers apropiados
    // Si es preview, usar "inline" para que se visualice en el navegador
    // Si no, usar "attachment" para descargarlo
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": preview ? "inline" : `attachment; filename="${metadata.nombre}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Error descargando reporte:", error)
    return NextResponse.json({ error: "Error al descargar el reporte", details: error.message }, { status: 500 })
  }
}
