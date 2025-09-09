"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

// 🔧 USUARIOS HARDCODEADOS PARA PRUEBAS - EDITA AQUÍ TUS USUARIOS
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
];

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Guardar datos del usuario en localStorage
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirigir según el rol
        if (data.user.idRol === 1) {
          router.push("/dashboard");
        } else if (data.user.idRol === 2) {
          router.push("/socio-dashboard");
        } else {
          setError("Rol de usuario no válido");
        }
      } else {
        setError(data.error || "Error al iniciar sesión");
      }
    } catch (error) {
      console.error("Error en login:", error);
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Administrador":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <Shield className="w-3 h-3 mr-1" />
            {role}
          </Badge>
        );
      case "Socio":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <User className="w-3 h-3 mr-1" />
            {role}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className="w-3 h-3 mr-1" />
            {role}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Estado de la base de datos */}
        <DatabaseStatus />

        {/* Card principal */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-white" />
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
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">¿No tenés cuenta? </span>
              <Link
                href="/registro"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Crear cuenta
              </Link>
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
