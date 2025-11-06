import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tiposTorneo = [
      {
        id: "0",
        valor: 0,
        nombre: "Liga (Todos contra Todos)",
        descripcion:
          "Cada participante juega contra todos los demás una vez. Se genera una tabla de posiciones.",
        requierePotenciaDe2: false,
        minParticipantes: 3,
        validacion: "Mínimo 3 participantes, máximo recomendado 16",
      },
      {
        id: "1",
        valor: 1,
        nombre: "Eliminación Directa",
        descripcion:
          "Sistema de bracket donde el perdedor queda eliminado inmediatamente",
        requierePotenciaDe2: true,
        minParticipantes: 2,
        validacion: "Ideal para 2, 4, 8, 16, 32 participantes",
      },
      {
        id: "2",
        valor: 2,
        nombre: "Fase de Grupos + Eliminación",
        descripcion:
          "Primero grupos todos contra todos, luego eliminación directa con clasificados",
        requierePotenciaDe2: false,
        minParticipantes: 6,
        validacion: "Mínimo 6 participantes (2 grupos de 3)",
      },
    ];

    return NextResponse.json(tiposTorneo);
  } catch (error: any) {
    console.error("Error obteniendo tipos de torneo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
