"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trophy, Save, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Torneo {
  IdTorneo: number;
  Nombre: string;
  IdDeporte: number;
  NombreDeporte: string;
  FechaInicio: string;
  FechaFin: string | null;
  Estado: number;
  Descripcion: string | null;
  MaxParticipantes: number | null;
  PremioGanador: string | null;
}

interface Deporte {
  IdDeporte: number;
  Nombre: string;
}

export default function EditarTorneoPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const torneoId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch torneo data
        const torneoResponse = await fetch(`/api/torneos/${torneoId}`);
        if (!torneoResponse.ok) {
          throw new Error(`Error al cargar torneo: ${torneoResponse.status}`);
        }
        const torneoData = await torneoResponse.json();
        setTorneo(torneoData);

        // Fetch deportes
        const deportesResponse = await fetch("/api/deportes");
        if (!deportesResponse.ok) {
          throw new Error(
            `Error al cargar deportes: ${deportesResponse.status}`
          );
        }
        const deportesData = await deportesResponse.json();
        setDeportes(deportesData);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [torneoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneo) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/torneos/${torneoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(torneo),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar torneo: ${response.status}`);
      }

      toast({
        title: "Torneo actualizado",
        description: "Los cambios se han guardado correctamente.",
      });

      router.push("/torneos");
    } catch (error: any) {
      console.error("Error updating torneo:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarTorneo = async () => {
    if (!torneo) return;

    setCanceling(true);
    try {
      const response = await fetch(`/api/torneos/${torneoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: 3 }), // 3 = Cancelado
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Error al cancelar torneo: ${response.status}`
        );
      }

      toast({
        title: "Torneo cancelado",
        description: "El torneo ha sido cancelado exitosamente.",
      });

      router.push("/torneos");
    } catch (error: any) {
      console.error("Error canceling torneo:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  const handleInputChange = (field: keyof Torneo, value: any) => {
    if (!torneo) return;
    setTorneo({ ...torneo, [field]: value });
  };

  const handleVolver = () => {
    router.push("/torneos");
  };

  const getEstadoText = (estado: number) => {
    switch (estado) {
      case 0:
        return "Pendiente";
      case 1:
        return "Activo";
      case 2:
        return "Finalizado";
      case 3:
        return "Cancelado";
      default:
        return "Desconocido";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-600">Cargando torneo...</span>
        </div>
      </div>
    );
  }

  if (error || !torneo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Torneo no encontrado"}
            </AlertDescription>
          </Alert>
        </main>
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
              Volver a Torneos
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Editar Torneo
          </h2>
          <p className="text-gray-600">Modifica la información del torneo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Torneo</CardTitle>
            <CardDescription>
              Actualiza los datos del torneo según sea necesario - Estado
              actual: {getEstadoText(torneo.Estado)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Torneo</Label>
                  <Input
                    id="nombre"
                    value={torneo.Nombre}
                    onChange={(e) =>
                      handleInputChange("Nombre", e.target.value)
                    }
                    required
                    disabled={torneo.Estado === 3} // Disabled if canceled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idDeporte">Deporte</Label>
                  <Select
                    value={torneo.IdDeporte?.toString() || ""}
                    onValueChange={(value) =>
                      handleInputChange("IdDeporte", Number(value))
                    }
                    disabled={torneo.Estado === 3}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar deporte" />
                    </SelectTrigger>
                    <SelectContent>
                      {deportes.map((deporte) => (
                        <SelectItem
                          key={deporte.IdDeporte}
                          value={deporte.IdDeporte.toString()}
                        >
                          {deporte.Nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={
                      torneo.FechaInicio ? torneo.FechaInicio.split("T")[0] : ""
                    }
                    onChange={(e) =>
                      handleInputChange("FechaInicio", e.target.value)
                    }
                    required
                    disabled={torneo.Estado === 3} // Disabled if canceled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha de Fin</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={torneo.FechaFin ? torneo.FechaFin.split("T")[0] : ""}
                    onChange={(e) =>
                      handleInputChange("FechaFin", e.target.value || null)
                    }
                    disabled={torneo.Estado === 3} // Disabled if canceled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={torneo.Estado.toString()}
                    onValueChange={(value) =>
                      handleInputChange("Estado", Number.parseInt(value))
                    }
                    disabled={torneo.Estado === 3} // Disabled if canceled
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Pendiente</SelectItem>
                      <SelectItem value="1">Activo</SelectItem>
                      <SelectItem value="2">Finalizado</SelectItem>
                      <SelectItem value="3">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipantes">Máximo Participantes</Label>
                  <Input
                    id="maxParticipantes"
                    type="number"
                    value={torneo.MaxParticipantes || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "MaxParticipantes",
                        e.target.value ? Number.parseInt(e.target.value) : null
                      )
                    }
                    disabled={torneo.Estado === 3} // Disabled if canceled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="premioGanador">Premio Ganador</Label>
                <Input
                  id="premioGanador"
                  value={torneo.PremioGanador || ""}
                  onChange={(e) =>
                    handleInputChange("PremioGanador", e.target.value || null)
                  }
                  placeholder="Ej: $10,000, Trofeo, etc."
                  disabled={torneo.Estado === 3} // Disabled if canceled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={torneo.Descripcion || ""}
                  onChange={(e) =>
                    handleInputChange("Descripcion", e.target.value || null)
                  }
                  placeholder="Descripción del torneo..."
                  rows={4}
                  disabled={torneo.Estado === 3} // Disabled if canceled
                />
              </div>

              {/* Alert for canceled tournament */}
              {torneo.Estado === 3 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Este torneo ha sido cancelado. No se pueden realizar
                    modificaciones.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <div>
                  {/* Cancel Tournament Button - Only show if not already canceled */}
                  {torneo.Estado !== 3 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Cancelar Torneo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cancelar torneo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción cancelará el torneo "{torneo.Nombre}".
                            Los participantes serán notificados y no se podrán
                            realizar más modificaciones. Esta acción no se puede
                            deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            No, mantener torneo
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelarTorneo}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={canceling}
                          >
                            {canceling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Cancelando...
                              </>
                            ) : (
                              "Sí, cancelar torneo"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVolver}
                  >
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || torneo.Estado === 3}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
