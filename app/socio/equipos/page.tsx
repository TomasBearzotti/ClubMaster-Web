"use client";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, Plus, Edit, UserPlus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Equipo {
  IdEquipo: number;
  Nombre: string;
  IdDeporte: number;
  NombreDeporte: string;
  CapitanId: number;
  NombreCapitan: string;
  FechaCreacion: string;
  CantidadIntegrantes: number;
}

interface Socio {
  IdSocio: number;
  Nombre: string;
  Dni: string;
  Email: string;
}

interface Integrante {
  IdSocio: number;
  Nombre: string;
  Dni: string;
  Email: string;
  FechaIngreso: string;
}

export default function MisEquiposPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIntegrantesDialog, setShowIntegrantesDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [deportes, setDeportes] = useState<
    { IdDeporte: number; Nombre: string }[]
  >([]);

  // Form states
  const [formData, setFormData] = useState({
    nombre: "",
    idDeporte: 0,
    integrantes: [] as number[],
  });

  const [editFormData, setEditFormData] = useState({
    nombre: "",
    idDeporte: 0,
  });

  const [selectedSociosToAdd, setSelectedSociosToAdd] = useState<number[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        // 1) Usuario logueado
        const meRes = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
          credentials: "include",
        });
        if (!meRes.ok) throw new Error("No se pudo obtener usuario actual");
        const me = await meRes.json();

        // 2) Buscar idPersona en usuarios
        const usersRes = await fetch("/api/seguridad/usuarios", {
          cache: "no-store",
        });
        const users = await usersRes.json();
        const yo = users.find((u: any) => u.id === me.idUsuario);
        if (!yo?.idPersona) throw new Error("Usuario sin persona asignada");

        // 3) Buscar socio con ese idPersona
        const sociosRes = await fetch("/api/socios", { cache: "no-store" });
        const socios = await sociosRes.json();
        const socio = socios.find((s: any) => s.IdPersona === yo.idPersona);
        if (!socio) throw new Error("No se encontró socio");

        // 4) Guardar user con socioId
        setCurrentUser({ ...yo, socioId: socio.IdSocio });

        // Cargar equipos del socio
        fetchEquipos(socio.IdSocio);

        // Cargar socios disponibles
        fetchSocios();

        // Cargar deportes
        const deportesRes = await fetch("/api/deportes");
        if (deportesRes.ok) {
          const deportesData = await deportesRes.json();
          setDeportes(deportesData);
        } else {
          console.error("No se pudieron cargar los deportes");
        }
      } catch (err) {
        console.error("Error resolviendo socio:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus equipos.",
          variant: "destructive",
        });
        router.push("/socio-dashboard");
      }
    };

    init();
  }, [router, toast]);

  const fetchEquipos = async (socioId: number) => {
    try {
      const response = await fetch(`/api/equipos?socioId=${socioId}`);
      if (response.ok) {
        const data = await response.json();
        setEquipos(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los equipos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching equipos:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los equipos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSocios = async () => {
    try {
      const response = await fetch("/api/socios");
      if (response.ok) {
        const data = await response.json();
        setSocios(
          data.filter((s: Socio) => s.IdSocio !== currentUser?.socioId)
        );
      }
    } catch (error) {
      console.error("Error fetching socios:", error);
    }
  };

  const fetchIntegrantes = async (equipoId: number) => {
    try {
      console.log(`Fetching integrantes for equipo ${equipoId}`);
      const response = await fetch(`/api/equipos/${equipoId}/integrantes`);
      if (response.ok) {
        const data = await response.json();
        console.log("Integrantes fetched:", data);
        setIntegrantes(data);
      } else {
        console.error("Error response:", response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error data:", errorData);
        toast({
          title: "Error",
          description: "No se pudieron cargar los integrantes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching integrantes:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los integrantes.",
        variant: "destructive",
      });
    }
  };

  const handleCreateEquipo = async () => {
    if (!formData.nombre || !formData.idDeporte) {
      toast({
        title: "Error",
        description: "Nombre e idDeporte son requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/equipos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          idDeporte: formData.idDeporte,
          capitanId: currentUser.socioId,
          integrantes: formData.integrantes,
        }),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Equipo creado exitosamente.",
        });
        setShowCreateDialog(false);
        // 🔎 Reset del formulario con idDeporte en 0
        setFormData({ nombre: "", idDeporte: 0, integrantes: [] });
        fetchEquipos(currentUser.socioId);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al crear el equipo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating equipo:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el equipo.",
        variant: "destructive",
      });
    }
  };

  const handleEditEquipo = (equipo: Equipo) => {
    setSelectedEquipo(equipo);
    setEditFormData({
      nombre: equipo.Nombre,
      idDeporte: equipo.IdDeporte,
    });
    setShowEditDialog(true);
  };

  const handleUpdateEquipo = async () => {
    if (!editFormData.nombre || !editFormData.idDeporte || !selectedEquipo) {
      toast({
        title: "Error",
        description: "Nombre y Deporte son requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/equipos/${selectedEquipo.IdEquipo}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: editFormData.nombre,
          idDeporte: editFormData.idDeporte,
        }),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Equipo actualizado exitosamente.",
        });
        setShowEditDialog(false);
        setSelectedEquipo(null);
        fetchEquipos(currentUser.socioId);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al actualizar el equipo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating equipo:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar el equipo.",
        variant: "destructive",
      });
    }
  };

  const handleManageIntegrantes = (equipo: Equipo) => {
    console.log("Managing integrantes for equipo:", equipo);
    setSelectedEquipo(equipo);
    setSelectedSociosToAdd([]);
    setIntegrantes([]); // Reset integrantes
    fetchIntegrantes(equipo.IdEquipo);
    setShowIntegrantesDialog(true);
  };

  const handleAddIntegrantes = async () => {
    if (!selectedEquipo || selectedSociosToAdd.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un socio para agregar.",
        variant: "destructive",
      });
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const socioId of selectedSociosToAdd) {
        console.log(
          `Adding socio ${socioId} to equipo ${selectedEquipo.IdEquipo}`
        );
        const response = await fetch(
          `/api/equipos/${selectedEquipo.IdEquipo}/integrantes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ socioId }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          const error = await response.json();
          console.error(`Error adding socio ${socioId}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Éxito",
          description: `${successCount} integrante(s) agregado(s) exitosamente.`,
        });
        setSelectedSociosToAdd([]);
        fetchIntegrantes(selectedEquipo.IdEquipo);
        fetchEquipos(currentUser.socioId);
      }

      if (errorCount > 0) {
        toast({
          title: "Advertencia",
          description: `${errorCount} integrante(s) no pudieron ser agregados.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding integrantes:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al agregar los integrantes.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveIntegrante = async (socioId: number) => {
    if (!selectedEquipo) return;

    try {
      console.log(
        `Removing socio ${socioId} from equipo ${selectedEquipo.IdEquipo}`
      );
      const response = await fetch(
        `/api/equipos/${selectedEquipo.IdEquipo}/integrantes?socioId=${socioId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Integrante eliminado exitosamente.",
        });
        fetchIntegrantes(selectedEquipo.IdEquipo);
        fetchEquipos(currentUser.socioId);
      } else {
        const error = await response.json();
        console.error("Error removing integrante:", error);
        toast({
          title: "Error",
          description: error.error || "Error al eliminar integrante.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing integrante:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el integrante.",
        variant: "destructive",
      });
    }
  };

  const handleVolver = () => {
    router.push("/socio-dashboard");
  };

  // Filtrar socios que no están en el equipo actual
  const sociosDisponibles = socios.filter(
    (socio) =>
      !integrantes.some((integrante) => integrante.IdSocio === socio.IdSocio)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              Volver
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              Mis Equipos
            </h2>
            <p className="text-gray-600">
              Gestiona tus equipos y sus integrantes
            </p>
          </div>

          {/* Dialog Crear Equipo */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Crear Equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Equipo</DialogTitle>
                <DialogDescription>
                  Completa la información para crear tu equipo
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre del Equipo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Ej: Los Tigres"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="Deporte">Deporte</Label>
                  <Select
                    value={formData.idDeporte.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, idDeporte: Number(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un deporte" />
                    </SelectTrigger>
                    <SelectContent>
                      {deportes.map((dep) => (
                        <SelectItem
                          key={dep.IdDeporte}
                          value={dep.IdDeporte.toString()}
                        >
                          {dep.Nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Integrantes (Opcional)</Label>
                  <p className="text-sm text-gray-500">
                    Puedes agregar integrantes después de crear el equipo
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateEquipo}>Crear Equipo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dialog Editar Equipo */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Equipo</DialogTitle>
              <DialogDescription>
                Modifica la información de tu equipo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nombre">Nombre del Equipo</Label>
                <Input
                  id="edit-nombre"
                  value={editFormData.nombre}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, nombre: e.target.value })
                  }
                  placeholder="Ej: Los Tigres"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-idDeporte">Deporte</Label>
                <Select
                  value={editFormData.idDeporte.toString()} // ✅ usar toString()
                  onValueChange={(value) =>
                    setEditFormData({
                      ...editFormData,
                      idDeporte: Number(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {deportes.map((dep) => (
                      <SelectItem
                        key={dep.IdDeporte}
                        value={dep.IdDeporte.toString()}
                      >
                        {dep.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateEquipo}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Gestionar Integrantes */}
        <Dialog
          open={showIntegrantesDialog}
          onOpenChange={setShowIntegrantesDialog}
        >
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Gestionar Integrantes - {selectedEquipo?.Nombre}
              </DialogTitle>
              <DialogDescription>
                Agrega o elimina integrantes de tu equipo
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Integrantes Actuales */}
              <div>
                <h4 className="font-medium mb-3">
                  Integrantes Actuales ({integrantes.length})
                </h4>
                {integrantes.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay integrantes en este equipo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {integrantes.map((integrante) => (
                      <div
                        key={integrante.IdSocio}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{integrante.Nombre}</p>
                          <p className="text-sm text-gray-500">
                            DNI: {integrante.Dni}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRemoveIntegrante(integrante.IdSocio)
                          }
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agregar Nuevos Integrantes */}
              <div>
                <h4 className="font-medium mb-3">Agregar Integrantes</h4>
                {sociosDisponibles.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay socios disponibles para agregar
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {sociosDisponibles.map((socio) => (
                        <div
                          key={socio.IdSocio}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`socio-${socio.IdSocio}`}
                            checked={selectedSociosToAdd.includes(
                              socio.IdSocio
                            )}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSociosToAdd([
                                  ...selectedSociosToAdd,
                                  socio.IdSocio,
                                ]);
                              } else {
                                setSelectedSociosToAdd(
                                  selectedSociosToAdd.filter(
                                    (id) => id !== socio.IdSocio
                                  )
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`socio-${socio.IdSocio}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div>
                              <p className="font-medium">{socio.Nombre}</p>
                              <p className="text-sm text-gray-500">
                                DNI: {socio.Dni}
                              </p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedSociosToAdd.length > 0 && (
                      <div className="mt-3">
                        <Button
                          onClick={handleAddIntegrantes}
                          className="w-full"
                        >
                          Agregar {selectedSociosToAdd.length} integrante(s)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowIntegrantesDialog(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lista de Equipos */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Equipos</CardTitle>
            <CardDescription>
              {equipos.length === 0
                ? "No tienes equipos creados"
                : `Tienes ${equipos.length} equipo(s) creado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipos.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No tienes equipos creados aún
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear mi primer equipo
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Deporte</TableHead>
                    <TableHead>Integrantes</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipos.map((equipo) => (
                    <TableRow key={equipo.IdEquipo}>
                      <TableCell className="font-medium">
                        {equipo.Nombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{equipo.NombreDeporte}</Badge>
                      </TableCell>
                      <TableCell>
                        {equipo.CantidadIntegrantes} miembros
                      </TableCell>
                      <TableCell>
                        {new Date(equipo.FechaCreacion).toLocaleDateString(
                          "es-AR"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEquipo(equipo)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageIntegrantes(equipo)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Integrantes
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
