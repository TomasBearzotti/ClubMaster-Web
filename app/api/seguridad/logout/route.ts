import { NextResponse } from "next/server";

export async function POST() {
  // 🔐 Borrar cookie de sesión
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada",
  });

  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expira inmediatamente
  });

  return response;
}
