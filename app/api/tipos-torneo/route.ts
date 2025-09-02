import { NextResponse } from "next/server"

export async function GET() {
  try {
    const tiposTorneo = [
      {
        id: "eliminacion",
        nombre: "Eliminación Directa",
        descripcion: "Los perdedores son eliminados inmediatamente",
        requierePotenciaDe2: true,
        minParticipantes: 2,
        validacion: "Ideal para 4, 8, 16 participantes",
      },
      {
        id: "todos-contra-todos",
        nombre: "Todos contra Todos",
        descripcion: "Cada participante juega contra todos los demás",
        requierePotenciaDe2: false,
        minParticipantes: 3,
        validacion: "Mínimo 3 participantes, máximo recomendado 8",
      },
      {
        id: "grupos",
        nombre: "Fase de Grupos",
        descripcion: "Participantes divididos en grupos, luego eliminación",
        requierePotenciaDe2: false,
        minParticipantes: 6,
        validacion: "Mínimo 6 participantes para formar grupos",
      },
    ]

    return NextResponse.json(tiposTorneo)
  } catch (error: any) {
    console.error("Error obteniendo tipos de torneo:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
