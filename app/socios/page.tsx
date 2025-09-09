"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Loader2,
  UserIcon,
} from "lucide-react";

interface Socio {
  IdSocio: number;
  Nombre: string;
  Dni: string;
  Email: string;
  Telefono: string;
  Estado: number; // 1 para activo, 0 para inactivo
  TipoMembresiaId: number;
  TipoMembresia: string; // Descripción del tipo de membresía
  MontoMensual: number; // Monto de la membresía
}

interface TipoMembresia {
  IdTipo: number;
  Descripcion: string;
  MontoMensual: number;
}

export default function GestionSociosPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [socios, setSocios] = useState<Socio[]>([]);
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSocio, setCurrentSocio] = useState<Socio | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    dni: "",
    email: "",
    telefono: "",
    estado: "1", // Default a activo
    tipoMembresiaId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userData);
    if (user.idRol !== 1) {
      router.push("/socio-dashboard");
      return;
    }

    fetchSocios();
    fetchTiposMembresia();
  }, [router]);

  const fetchSocios = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/socios");
      if (response.ok) {
        const data = await response.json();
        setSocios(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los socios.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching socios:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los socios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTiposMembresia = async () => {
    try {
      const response = await fetch("/api/tipos-membresia");
      if (response.ok) {
        const data = await response.json();
        setTiposMembresia(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los tipos de membresía.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching tipos de membresia:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los tipos de membresía.",
        variant: "destructive",
      });
    }
  };

  const handleAddSocio = () => {
    setCurrentSocio(null);
    setForm({
      nombre: "",
      dni: "",
      email: "",
      telefono: "",
      estado: "1",
      tipoMembresiaId: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditSocio = (socio: Socio) => {
    setCurrentSocio(socio);
    setForm({
      nombre: socio.Nombre,
      dni: socio.Dni,
      email: socio.Email,
      telefono: socio.Telefono,
      estado: socio.Estado.toString(),
      tipoMembresiaId: socio.TipoMembresiaId.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSocio = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este socio?")) {
      return;
    }
    try {
      const response = await fetch(`/api/socios/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast({
          title: "Socio eliminado",
          description: "El socio ha sido eliminado exitosamente.",
          variant: "default",
        });
        fetchSocios();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error al eliminar",
          description: errorData.error || "No se pudo eliminar el socio.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting socio:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error de red al eliminar el socio.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      nombre: form.nombre,
      dni: form.dni,
      email: form.email,
      telefono: form.telefono || null,
      estado: Number.parseInt(form.estado),
      tipoMembresiaId: Number.parseInt(form.tipoMembresiaId),
    };

    try {
      let response;
      if (currentSocio) {
        response = await fetch(`/api/socios/${currentSocio.IdSocio}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/socios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Éxito",
          description: data.message,
          variant: "default",
        });
        setIsDialogOpen(false);
        fetchSocios();
      } else {
        toast({
          title: "Error",
          description: data.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error de red al guardar el socio.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sociosFiltrados = socios.filter(
    (socio) =>
      socio.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socio.Dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socio.Email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVolver = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
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
            <Button
              variant="outline"
              onClick={handleVolver}
              className="flex items-center gap-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Menú
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <UserIcon className="h-8 w-8 text-blue-600" />
            Gestión de Socios
          </h2>
          <p className="text-gray-600">
            Administra la información de los miembros del club.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={handleAddSocio}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Agregar Nuevo Socio
          </Button>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar socio..."
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabla de Socios */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Socios</CardTitle>
            <CardDescription>
              Todos los miembros registrados en el club.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Membresía</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sociosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      No se encontraron socios.
                    </TableCell>
                  </TableRow>
                ) : (
                  sociosFiltrados.map((socio) => (
                    <TableRow key={socio.IdSocio}>
                      <TableCell className="font-medium">
                        {socio.Nombre}
                      </TableCell>
                      <TableCell>{socio.Dni}</TableCell>
                      <TableCell>{socio.Email}</TableCell>
                      <TableCell>{socio.Telefono || "-"}</TableCell>
                      <TableCell>{socio.TipoMembresia}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            socio.Estado === 1
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                          }
                        >
                          {socio.Estado === 1 ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSocio(socio)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSocio(socio.IdSocio)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialogo para Agregar/Editar Socio */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {currentSocio ? "Editar Socio" : "Agregar Nuevo Socio"}
              </DialogTitle>
              <DialogDescription>
                {currentSocio
                  ? "Modifica los datos del socio."
                  : "Ingresa los datos para un nuevo socio."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dni" className="text-right">
                  DNI
                </Label>
                <Input
                  id="dni"
                  value={form.dni}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telefono" className="text-right">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tipoMembresiaId" className="text-right">
                  Membresía
                </Label>
                <Select
                  value={form.tipoMembresiaId}
                  onValueChange={(value) =>
                    handleSelectChange("tipoMembresiaId", value)
                  }
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona un tipo de membresía" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposMembresia.map((tipo) => (
                      <SelectItem
                        key={tipo.IdTipo}
                        value={tipo.IdTipo.toString()}
                      >
                        {tipo.Descripcion} (
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(tipo.MontoMensual)}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="estado" className="text-right">
                  Estado
                </Label>
                <Select
                  value={form.estado}
                  onValueChange={(value) => handleSelectChange("estado", value)}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Activo</SelectItem>
                    <SelectItem value="0">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {currentSocio ? "Guardar Cambios" : "Crear Socio"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
