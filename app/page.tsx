"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatabaseStatus } from "@/components/database-status";
import {
  Eye,
  EyeOff,
  LogIn,
  Users,
  TestTube,
  User,
  Shield,
  UserCog,
  DollarSign,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import dynamic from "next/dynamic";
const ThemeToggle = dynamic(
  () => import("@/components/ThemeToggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

// 🔧 USUARIOS HARDCODEADOS PARA PRUEBAS
const HARDCODED_TEST_USERS = [
  {
    email: "admin@clubmaster.com",
    password: "admin",
    displayName: "Administrador General",
    role: "Administrador",
    description: "Usuario administrador del sistema",
  },
  {
    email: "juan.perez@email.com",
    password: "1234",
    displayName: "Juan Pérez",
    role: "Socio",
    description: "Socio del club",
  },
  {
    email: "tesorero@clubmaster.com",
    password: "123456",
    displayName: "Maldonado T",
    role: "Tesorero",
    description: "Tesorero del club",
  },
  {
    email: "responsable.deporte@clubmaster.com",
    password: "123456",
    displayName: "Forza RD",
    role: "Responsable de Deporte",
    description: "Responsable de la gestión deportiva",
  },
  {
    email: "canterle.arbitro@arbitro.com",
    password: "123456",
    displayName: "Arbitro Canterle",
    role: "Arbitro",
    description: "Arbitro del club",
  },
];

const PERM_TO_ROUTE: Record<string, string> = {
  DASHBOARD_ADMIN: "/dashboard",
  DASHBOARD_SOCIOS: "/socio-dashboard",
  DASHBOARD_ARBITRO: "/arbitro-dashboard",
};

const norm = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();

function pickDashboardRoute(permisos: any[]): string | null {
  const names = (permisos ?? []).map((p) =>
    norm(p?.PermisoNombre ?? p?.nombre ?? p?.Nombre ?? "")
  );
  if (names.includes("DASHBOARD_ADMIN")) return PERM_TO_ROUTE.DASHBOARD_ADMIN;
  if (names.includes("DASHBOARD_SOCIO")) return PERM_TO_ROUTE.DASHBOARD_SOCIOS;
  if (names.includes("DASHBOARD_ARBITRO"))
    return PERM_TO_ROUTE.DASHBOARD_ARBITRO;
  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTestUsersDialog, setShowTestUsersDialog] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1) login
      const response = await fetch("/api/seguridad/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        setError(data?.error || "Error al iniciar sesión");
        return;
      }

      const user = data.user ?? {};
      const userId: number | null = user.id ?? user.IdUsuario ?? null;
      const userEmail: string = user.email ?? email;
      let userEstado: number | undefined = user.estadoUsuario;
      let userRolId: number | null =
        user.idRol ?? user.rolId ?? user.roles?.[0]?.idRol ?? null;

      // 2) si faltan estado/rol, buscamos el usuario del API de usuarios
      if (userEstado === undefined || userRolId == null) {
        const uRes = await fetch("/api/seguridad/usuarios", {
          cache: "no-store",
        });
        const uList = (await uRes.json()) as any[];
        const match =
          uList.find((u) =>
            userId ? u.id === userId : u.email === userEmail
          ) ?? null;
        if (match) {
          userEstado = match.estadoUsuario;
          userRolId =
            userRolId ??
            match.roles?.[0]?.idRol ??
            match.roles?.[0]?.IdRol ??
            null;
        }
      }

      // 3) validar estado del usuario
      if (userEstado !== 1) {
        const msg =
          userEstado === 2
            ? "Tu cuenta está pendiente de aprobación."
            : "Tu cuenta está inactiva.";
        setError(msg);
        return;
      }

      // 4) buscar rol y validar estado + permisos
      const rolesRes = await fetch("/api/seguridad/roles", {
        cache: "no-store",
      });
      if (!rolesRes.ok) throw new Error("No se pudieron obtener roles");
      const rolesData = await rolesRes.json();

      const role = rolesData
        .map((r: any) => ({
          id: r.IdRol ?? r.id,
          nombre: r.Nombre ?? r.nombre,
          estadoRol: r.EstadoRol ?? r.estadoRol ?? 0,
          permisos: (r.Permisos ?? r.permisos ?? []).map((p: any) => ({
            idPermiso: p.IdPermiso ?? p.idPermiso ?? p.id,
            PermisoNombre: p.PermisoNombre ?? p.nombre ?? p.Nombre,
            descripcion: p.PermisoDescripcion ?? p.descripcion ?? p.Descripcion,
          })),
        }))
        .find((r: any) => r.id === userRolId);

      if (!role) {
        setError("No se encontró tu rol en el sistema.");
        return;
      }
      if (role.estadoRol !== 1) {
        setError("Tu rol está inactivo. Contactá a un administrador.");
        return;
      }

      const route = pickDashboardRoute(role.permisos);
      if (!route) {
        setError(
          "Tu rol no tiene permisos de dashboard asignados. Contactá a un administrador."
        );
        return;
      }

      // 5) redirigir
      router.push(route);
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const selectTestUser = (testUser: (typeof HARDCODED_TEST_USERS)[0]) => {
    setEmail(testUser.email);
    setPassword(testUser.password);
    setShowTestUsersDialog(false);
  };

  // Normaliza: quita acentos, baja a minúsculas y colapsa espacios
  const norm = (s?: string) =>
    (s ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const getRoleBadge = (roleRaw?: string) => {
    const key = norm(roleRaw);

    if (!key) return <Badge variant="secondary">Sin rol</Badge>;

    // Aceptamos variantes/sinónimos
    if (["administrador general", "administrador", "admin"].includes(key)) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <Shield className="w-3 h-3 mr-1" /> {roleRaw}
        </Badge>
      );
    }

    if (key === "socio") {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <User className="w-3 h-3 mr-1" /> {roleRaw}
        </Badge>
      );
    }

    if (key === "arbitro") {
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <UserCog className="w-3 h-3 mr-1" /> {roleRaw}
        </Badge>
      );
    }

    if (key === "tesorero") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <DollarSign className="w-3 h-3 mr-1" /> {roleRaw}
        </Badge>
      );
    }

    if (
      [
        "responsable de deportes",
        "responsable deportes",
        "responsable de deporte",
      ].includes(key)
    ) {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          <Trophy className="w-3 h-3 mr-1" /> {roleRaw}
        </Badge>
      );
    }

    // Fallback para roles desconocidos
    return <Badge variant="secondary">{roleRaw}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <header className="fixed top-0 left-0 w-full bg-white border-b border-blue-200 shadow-sm z-50">
          <div className="flex items-center justify-between px-6 h-16">
            <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            <ThemeToggle />
          </div>
        </header>

        {/* Estado de la base de datos */}
        <DatabaseStatus />

        {/* Card principal */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 relative w-20 h-20">
              <Image
                src="/icons/android/android-launchericon-192-192.png"
                alt="ClubMaster Logo"
                width={80}
                height={80}
                className="rounded-2xl shadow-md"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              ClubMaster
            </CardTitle>
            <CardDescription>Sistema de Gestión Deportiva</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Iniciando sesión...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Iniciar Sesión
                    </div>
                  )}
                </Button>

                <Dialog
                  open={showTestUsersDialog}
                  onOpenChange={setShowTestUsersDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      title="Usuarios de Prueba"
                      disabled={loading}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <TestTube className="w-5 h-5" />
                        Usuarios de Prueba
                      </DialogTitle>
                      <DialogDescription>
                        Selecciona un usuario para autocompletar el login
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {HARDCODED_TEST_USERS.map((testUser, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => selectTestUser(testUser)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {testUser.displayName}
                              </p>
                              <p className="text-sm text-gray-600 truncate">
                                {testUser.email}
                              </p>
                            </div>
                            {getRoleBadge(testUser.role)}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            {testUser.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-blue-600 font-mono">
                              Contraseña: {testUser.password}
                            </span>
                            <span className="text-gray-400">
                              Click para usar
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>💡 Para desarrolladores:</strong> Edita la
                        constante{" "}
                        <code className="bg-yellow-100 px-1 rounded">
                          HARDCODED_TEST_USERS
                        </code>{" "}
                        en{" "}
                        <code className="bg-yellow-100 px-1 rounded">
                          app/page.tsx
                        </code>{" "}
                        para agregar más usuarios de prueba.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </form>
            <div className="mt-6 space-y-3">
              <div className="text-center text-sm">
                <Link
                  href="/recuperar-cuenta"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="text-center text-sm">
                <span className="text-gray-600">¿No tenés cuenta? </span>
                <Link
                  href="/registro"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 ClubMaster. Sistema de gestión deportiva.</p>
        </div>
      </div>
    </div>
  );
}
