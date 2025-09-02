"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  CheckCircle,
  LogOut,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

interface UserData {
  id: number;
  email: string;
  rol: number;
  rolTexto: string;
  nombre: string;
  socioId?: number;
}

interface SocioData {
  IdSocio: number;
  Nombre: string;
  Dni: string;
  Email: string;
  Telefono?: string;
  Estado: number;
  TipoMembresia?: string;
}

export default function MiCuentaPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [socioData, setSocioData] = useState<SocioData | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "Av. Corrientes 1234, CABA",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Verificar autenticación y cargar datos del usuario
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Si es socio, cargar datos adicionales
    if (parsedUser.rol === 2 && parsedUser.socioId) {
      loadSocioData(parsedUser.socioId);
    } else {
      setFormData((prev) => ({
        ...prev,
        nombre: parsedUser.nombre || "",
        email: parsedUser.email || "",
      }));
      setLoading(false);
    }
  }, [router]);

  const loadSocioData = async (socioId: number) => {
    try {
      const response = await fetch(`/api/socios/${socioId}`);
      if (response.ok) {
        const socio = await response.json();
        setSocioData(socio);
        setFormData((prev) => ({
          ...prev,
          nombre: socio.Nombre || "",
          email: socio.Email || "",
          telefono: socio.Telefono || "",
        }));
      }
    } catch (error) {
      console.error("Error cargando datos del socio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSaveChanges = async () => {
    if (!user) return;

    try {
      // Si es socio, actualizar datos en la tabla Socios
      if (user.rol === 2 && user.socioId) {
        const response = await fetch(`/api/socios/${user.socioId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: formData.nombre,
            dni: socioData?.Dni,
            email: formData.email,
            telefono: formData.telefono,
            estado: socioData?.Estado,
            tipoMembresiaId: socioData?.TipoMembresia || 1,
          }),
        });

        if (!response.ok) {
          throw new Error("Error actualizando datos");
        }
      }

      // Actualizar datos en localStorage
      const updatedUser = {
        ...user,
        nombre: formData.nombre,
        email: formData.email,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error guardando cambios:", error);
      alert("Error al guardar los cambios");
    }
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (formData.newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Simular cambio de contraseña (aquí implementarías la lógica real)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setFormData({
      ...formData,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleVolver = () => {
    if (user?.rol === 1) {
      router.push("/dashboard");
    } else {
      router.push("/socio-dashboard");
    }
  };

  const handleDarseDeBaja = () => {
    if (user?.rol === 2) {
      if (
        confirm(
          "¿Estás seguro de que deseas darte de baja del club? Esta acción no se puede deshacer."
        )
      ) {
        localStorage.removeItem("user");
        alert("Te has dado de baja exitosamente. Lamentamos verte partir.");
        router.push("/");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleVolver}
                className="flex items-center gap-2 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-200 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <User className="h-8 w-8 text-blue-600" />
            Mi Cuenta
          </h2>
          <p className="text-gray-600">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        {/* Mensaje de éxito */}
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Cambios guardados correctamente
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del Usuario */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarFallback className="text-2xl">
                    {user.nombre
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{user.nombre}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
                <div className="flex justify-center mt-2">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {user.rolTexto}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">ID Usuario:</span>
                    <span className="font-medium">{user.id}</span>
                  </div>
                  {socioData && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">DNI:</span>
                        <span className="font-medium">{socioData.Dni}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Membresía:</span>
                        <span className="font-medium">
                          {socioData.TipoMembresia || "No especificada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Estado:</span>
                        <Badge
                          variant={
                            socioData.Estado === 1 ? "default" : "secondary"
                          }
                        >
                          {socioData.Estado === 1 ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formularios de Edición */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos Personales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Datos Personales
                </CardTitle>
                <CardDescription>
                  Actualiza tu información personal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      handleInputChange("nombre", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) =>
                      handleInputChange("telefono", e.target.value)
                    }
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="direccion"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) =>
                      handleInputChange("direccion", e.target.value)
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveChanges}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cambiar Contraseña */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
                <CardDescription>
                  Actualiza tu contraseña de acceso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) =>
                        handleInputChange("currentPassword", e.target.value)
                      }
                      placeholder="Ingresa tu contraseña actual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) =>
                        handleInputChange("newPassword", e.target.value)
                      }
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmar Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      placeholder="Repite la nueva contraseña"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleChangePassword}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      !formData.currentPassword ||
                      !formData.newPassword ||
                      !formData.confirmPassword
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Cambiar Contraseña
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Acciones de Cuenta */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones de Cuenta</CardTitle>
                <CardDescription>
                  Gestiona tu sesión y configuraciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Cerrar Sesión</h4>
                    <p className="text-sm text-gray-600">
                      Sal de tu cuenta de forma segura
                    </p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </Button>
                </div>

                {/* Solo mostrar opción de darse de baja para socios */}
                {user.rol === 2 && (
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div>
                      <h4 className="font-medium text-red-700">
                        Darse de Baja
                      </h4>
                      <p className="text-sm text-gray-600">
                        Cancelar tu membresía del club
                      </p>
                    </div>
                    <Button
                      onClick={handleDarseDeBaja}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                    >
                      Darse de Baja
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
