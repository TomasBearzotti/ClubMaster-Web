"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    password: "",
    confirmPassword: "",
    tipoPerfil: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rolesDisponibles, setRolesDisponibles] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const ESTADO_PENDIENTE = 2;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/seguridad/roles", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudieron obtener roles");
        const data = await res.json();
        const mapped = (data ?? []).map((r: any) => ({
          id: r.IdRol ?? r.id,
          nombre: r.Nombre ?? r.nombre,
        }));
        const allowed = mapped.filter((r: { id: number; nombre: string }) => {
          const n = normalize(r.nombre);
          return n === "socio" || n === "arbitro" || n === "árbitro";
        });
        setRolesDisponibles(allowed);
      } catch (e) {
        // si falla, seguimos, validaremos en submit
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  function normalize(txt: string) {
    return txt
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  async function createPersonaAPI(payload: {
    nombre: string;
    apellido: string;
    dni: string;
    telefono?: string;
    mail: string;
  }): Promise<number> {
    const urls = ["/api/seguridad/persona"];
    let lastErr: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          lastErr = await res.text().catch(() => "");
          continue;
        }
        const data = await res.json();
        const idPersona =
          data?.idPersona ?? data?.IdPersona ?? data?.id ?? data?.insertedId;
        if (!idPersona) throw new Error("La API no devolvió IdPersona");
        return Number(idPersona);
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`No se pudo crear la persona. ${String(lastErr ?? "")}`);
  }

  async function createUsuarioAPI(payload: {
    email: string;
    password: string;
    idRol: number;
    idPersona: number;
    estado: number; // 2 = pendiente
  }) {
    const res = await fetch("/api/seguridad/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`No se pudo crear el usuario. ${txt}`);
    }
    return res.json();
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!formData.apellido.trim())
      newErrors.apellido = "El apellido es requerido";
    if (!formData.dni.trim()) newErrors.dni = "El DNI/CUIT es requerido";
    if (!formData.email.trim()) newErrors.email = "El email es requerido";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email no válido";
    if (!formData.password) newErrors.password = "La contraseña es requerida";
    else if (formData.password.length < 6)
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }
    if (!formData.tipoPerfil)
      newErrors.tipoPerfil = "Debe seleccionar un tipo de perfil";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setIsSuccess(false);
    setErrors((prev) => ({ ...prev })); // no tocar

    try {
      // 1) Encontrar IdRol real desde el nombre elegido en el Select
      const elegido = normalize(formData.tipoPerfil); // "socio" | "arbitro"
      const rol = rolesDisponibles.find((r) => normalize(r.nombre) === elegido);
      if (!rol) {
        setIsSubmitting(false);
        setErrors((prev) => ({
          ...prev,
          tipoPerfil: "Rol no disponible en el sistema",
        }));
        return;
      }

      // 2) Crear Persona
      const idPersona = await createPersonaAPI({
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        dni: formData.dni.trim(),
        telefono: "", // si querés agregar campo Teléfono al form, ponelo acá
        mail: formData.email.trim(),
      });

      // 3) Crear Usuario en estado PENDIENTE (2)
      await createUsuarioAPI({
        email: formData.email.trim(),
        password: formData.password,
        idRol: rol.id,
        idPersona,
        estado: ESTADO_PENDIENTE,
      });

      setIsSuccess(true);
      // Redirigir después de 2 segundos (como ya tenías)
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        submit: err?.message ?? "Error registrando usuario",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <Card className="w-full max-w-md border-green-200 shadow-lg">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              ¡Cuenta creada exitosamente!
            </h3>
            <p className="text-green-600">
              Redirigiendo al inicio de sesión...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="w-full max-w-md px-4 py-8">
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4 text-4xl font-bold text-blue-700">
              ClubMaster
            </div>
            <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
            <CardDescription>
              Completa los datos para registrarte en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      handleInputChange("nombre", e.target.value)
                    }
                    placeholder="Tu nombre"
                    className={errors.nombre ? "border-red-500" : ""}
                  />
                  {errors.nombre && (
                    <p className="text-xs text-red-500">{errors.nombre}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) =>
                      handleInputChange("apellido", e.target.value)
                    }
                    placeholder="Tu apellido"
                    className={errors.apellido ? "border-red-500" : ""}
                  />
                  {errors.apellido && (
                    <p className="text-xs text-red-500">{errors.apellido}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni">DNI o CUIT</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => handleInputChange("dni", e.target.value)}
                  placeholder="12345678 o 20-12345678-9"
                  className={errors.dni ? "border-red-500" : ""}
                />
                {errors.dni && (
                  <p className="text-xs text-red-500">{errors.dni}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="tu@email.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                    className={errors.password ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    placeholder="Repite tu contraseña"
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de Perfil</Label>
                <Select
                  value={formData.tipoPerfil}
                  onValueChange={(value) =>
                    handleInputChange("tipoPerfil", value)
                  }
                >
                  <SelectTrigger
                    className={errors.tipoPerfil ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Selecciona tu tipo de perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socio">Socio</SelectItem>
                    <SelectItem value="arbitro">Árbitro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipoPerfil && (
                  <p className="text-xs text-red-500">{errors.tipoPerfil}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Registrando..." : "Registrarse"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-center text-sm">
              <span className="text-gray-600">¿Ya tenés cuenta? </span>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Iniciar sesión
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
