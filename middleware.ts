import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas (no requieren login)
const PUBLIC_PATHS = [
  "/",
  "/registro",
  "/api/seguridad/login",
  "/api/seguridad/roles/logged",
];

// Mapeo de rutas a permisos requeridos
const PERMISOS_RUTAS: Record<string, string> = {
  // Admin
  "/usuarios": "GESTION_USUARIOS",
  "/socios": "GESTION_SOCIOS",
  "/cuotas": "GESTION_CUOTAS",
  "/torneos": "GESTION_TORNEOS",
  "/arbitros": "GESTION_ARBITROS",
  "/reportes": "REPORTES",
  "/dashboard": "DASHBOARD_ADMIN",

  // Socio
  "/socio-dashboard": "DASHBOARD_SOCIO",
  "/socio/cuotas": "SOCIO_VER_CUOTAS",
  "/socio/torneos": "SOCIO_VER_TORNEOS",
  "/socio/equipos": "SOCIO_GESTION_EQUIPOS",
  "/socio/posiciones": "SOCIO_VER_POSICIONES",

  // Árbitro
  "/arbitro-dashboard": "DASHBOARD_ARBITRO",
  "/arbitro/deportes": "ARBITRO_GESTION_DEPORTES_Y_DISPONIBILIDAD",
  "/arbitro/partidos": "ARBITRO_GESTION_PARTIDOS",
  "/arbitro/honorarios": "ARBITRO_HONORARIOS",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔑 Armar base URL usando headers reales
  const host = request.headers.get("host") || "clubmaster.giize.com";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  // Si la ruta es pública -> dejar pasar
  if (
    PUBLIC_PATHS.some((path) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )
  ) {
    return NextResponse.next();
  }

  // Leer cookie de sesión
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  try {
    const session = JSON.parse(sessionCookie);

    // Validación mínima
    if (!session?.idUsuario || !session?.idRol) {
      return NextResponse.redirect(new URL("/", baseUrl));
    }

    // Buscar permiso requerido según ruta
    const ruta = Object.keys(PERMISOS_RUTAS).find((r) =>
      pathname.startsWith(r)
    );

    // 👇 Si hay permiso asociado a la ruta, verificarlo
    if (ruta) {
      const permisoRequerido = PERMISOS_RUTAS[ruta];
      const permisosUsuario = (session.permisos ?? []).map((p: string) =>
        p.toUpperCase()
      );

      if (!permisosUsuario.includes(permisoRequerido)) {
        return NextResponse.redirect(new URL("/denegado", baseUrl));
      }
    }

    // ✅ Si no hay permiso asociado (ej: /partido/[id]), basta con estar logueado
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}

// Configuración: aplicar middleware a todas las rutas privadas
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/usuarios/:path*",
    "/socios/:path*",
    "/cuotas/:path*",
    "/torneos/:path*",
    "/arbitros/:path*",
    "/reportes/:path*",
    "/socio-dashboard/:path*",
    "/arbitro-dashboard/:path*",
    "/socio/:path*",
    "/arbitro/:path*",
    "/partidos/:path*",
    "/cuenta/:path*",
  ],
};
