import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const REPORTES_DIR = path.join(process.cwd(), "reportes", "guardados")

export async function GET() {
  try {
    // Asegurar que el directorio existe
    if (!fs.existsSync(REPORTES_DIR)) {
      fs.mkdirSync(REPORTES_DIR, { recursive: true })
      return NextResponse.json([])
    }

    // Leer todos los archivos del directorio
    const archivos = fs.readdirSync(REPORTES_DIR)

    // Filtrar solo los archivos de metadata
    const metadataFiles = archivos.filter((file) => file.endsWith("_metadata.json"))

    // Leer y parsear cada metadata
    const reportes = metadataFiles
      .map((file) => {
        try {
          const metadataPath = path.join(REPORTES_DIR, file)
          const content = fs.readFileSync(metadataPath, "utf-8")
          return JSON.parse(content)
        } catch (error) {
          console.error(`Error leyendo metadata ${file}:`, error)
          return null
        }
      })
      .filter((reporte) => reporte !== null)
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())

    return NextResponse.json(reportes)
  } catch (error) {
    console.error("Error listando reportes:", error)
    return NextResponse.json({ error: "Error al listar reportes" }, { status: 500 })
  }
}
