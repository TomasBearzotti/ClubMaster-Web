"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, Trophy, Clock, DollarSign, Info, X } from "lucide-react";

interface ArbitroData {
  IdArbitro: number;
  Nombre: string;
  Email: string;
  Telefono: string;
  Estado: number;
  Tarifa: number | null;
  Deportes?: string;
  DeportesIds?: number[];
}

interface Deporte {
  IdDeporte: number;
  Nombre: string;
}

interface DisponibilidadSlot {
  IdDisponibilidad?: number;
  DiaSemana: string;
  HoraInicio: string;
  HoraFin: string;
}

const diasSemana = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const diasSemanaDisplay: Record<string, string> = {
  "Lunes": "Lun",
  "Martes": "Mar",
  "Miercoles": "Mié",
  "Jueves": "Jue",
  "Viernes": "Vie",
  "Sabado": "Sáb",
  "Domingo": "Dom"
};

export default function PreferenciasArbitrajePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [arbitro, setArbitro] = useState<ArbitroData | null>(null);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [deportesSeleccionados, setDeportesSeleccionados] = useState<number[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadSlot[]>([]);
  const [tarifa, setTarifa] = useState<string>("");
  const [promedioTarifa, setPromedioTarifa] = useState<number>(0);

  // Dialog para editar horario de un día
  const [dialogOpen, setDialogOpen] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [horaInicio, setHoraInicio] = useState<string>("09:00");
  const [horaFin, setHoraFin] = useState<string>("18:00");

  useEffect(() => {
    const init = async () => {
      try {
        // 1) Usuario logueado (desde cookie)
        const meRes = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
          credentials: "include",
        });
        if (!meRes.ok) throw new Error("No se pudo obtener usuario actual");
        const me = await meRes.json();

        // 2) Resolver idPersona desde usuarios
        const usersRes = await fetch("/api/seguridad/usuarios", { cache: "no-store" });
        const users = await usersRes.json();
        const yo = users.find((u: any) => u.id === me.idUsuario);
        if (!yo?.idPersona) throw new Error("Usuario sin persona asignada");

        // 3) Resolver árbitro desde listado de árbitros
        const arbitrosRes = await fetch("/api/arbitros", { cache: "no-store" });
        const arbitros = await arbitrosRes.json();
        const arbitroData = arbitros.find((a: any) => a.IdPersona === yo.idPersona);
        if (!arbitroData) throw new Error("No se encontró árbitro");

        // 4) Cargar datos usando IdArbitro
        setArbitro(arbitroData);
        setDeportesSeleccionados(arbitroData.DeportesIds || []);
        setTarifa(arbitroData.Tarifa?.toString() || "");

        // Cargar deportes disponibles
        const deportesRes = await fetch("/api/deportes", { cache: "no-store" });
        if (deportesRes.ok) {
          const deportesData = await deportesRes.json();
          setDeportes(deportesData);
        }

        // Cargar disponibilidad usando IdArbitro correcto
        const dispRes = await fetch(`/api/arbitros/disponibilidad?arbitroId=${arbitroData.IdArbitro}`, {
          cache: "no-store",
        });
        if (dispRes.ok) {
          const dispData = await dispRes.json();
          setDisponibilidad(dispData);
        }

        // Calcular promedio de tarifas
        const tarifasConValor = arbitros.filter((a: any) => a.Tarifa && a.Tarifa > 0);
        if (tarifasConValor.length > 0) {
          const suma = tarifasConValor.reduce((acc: number, a: any) => acc + a.Tarifa, 0);
          const promedio = Math.round(suma / tarifasConValor.length);
          setPromedioTarifa(promedio);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error inicializando preferencias:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus preferencias.",
          variant: "destructive",
        });
        router.push("/arbitro-dashboard");
      }
    };

    init();
  }, [router, toast]);

  const handleDeporteToggle = (deporteId: number) => {
    setDeportesSeleccionados((prev) =>
      prev.includes(deporteId)
        ? prev.filter((id) => id !== deporteId)
        : [...prev, deporteId]
    );
  };

  const handleClickDia = (dia: string) => {
    const diaDisponible = disponibilidad.find((d) => d.DiaSemana === dia);
    setDiaSeleccionado(dia);
    if (diaDisponible) {
      setHoraInicio(diaDisponible.HoraInicio);
      setHoraFin(diaDisponible.HoraFin);
    } else {
      setHoraInicio("09:00");
      setHoraFin("18:00");
    }
    setDialogOpen(true);
  };

  const handleGuardarHorario = () => {
    if (!diaSeleccionado) return;

    if (!horaInicio || !horaFin) {
      toast({
        title: "Error",
        description: "Debes seleccionar hora de inicio y fin.",
        variant: "destructive",
      });
      return;
    }

    // Actualizar o agregar disponibilidad
    const nuevaDisponibilidad = disponibilidad.filter((d) => d.DiaSemana !== diaSeleccionado);
    nuevaDisponibilidad.push({
      DiaSemana: diaSeleccionado,
      HoraInicio: horaInicio,
      HoraFin: horaFin,
    });

    setDisponibilidad(nuevaDisponibilidad);
    setDialogOpen(false);
    toast({
      title: "Horario actualizado",
      description: `Disponibilidad para ${diaSeleccionado} configurada.`,
    });
  };

  const handleEliminarHorario = () => {
    if (!diaSeleccionado) return;

    setDisponibilidad(disponibilidad.filter((d) => d.DiaSemana !== diaSeleccionado));
    setDialogOpen(false);
    toast({
      title: "Horario eliminado",
      description: `Disponibilidad para ${diaSeleccionado} eliminada.`,
    });
  };

  const handleGuardar = async () => {
    if (!arbitro) return;

    setSaving(true);
    try {
      // Guardar deportes
      const deportesRes = await fetch(`/api/arbitros/${arbitro.IdArbitro}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          DeportesIds: deportesSeleccionados,
          Tarifa: tarifa ? parseFloat(tarifa) : null,
        }),
      });

      if (!deportesRes.ok) {
        throw new Error("Error al guardar deportes y tarifa");
      }

      // Guardar disponibilidad
      const dispRes = await fetch(`/api/arbitros/disponibilidad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arbitroId: arbitro.IdArbitro,
          disponibilidad: disponibilidad,
        }),
      });

      if (!dispRes.ok) {
        throw new Error("Error al guardar disponibilidad");
      }

      toast({
        title: "Éxito",
        description: "Preferencias guardadas correctamente.",
      });

      router.push("/arbitro-dashboard");
    } catch (error) {
      console.error("Error guardando preferencias:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!arbitro) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error: No se pudo cargar la información del árbitro.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/arbitro-dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Preferencias de Arbitraje</h1>
          <p className="text-gray-600 mt-2">Configura tus deportes, horarios y tarifa.</p>
        </div>

        <div className="space-y-6">
          {/* Deportes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                Deportes que Arbitras
              </CardTitle>
              <CardDescription>
                Selecciona los deportes en los que puedes oficiar como árbitro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deportes.map((deporte) => (
                  <div
                    key={deporte.IdDeporte}
                    className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`deporte-${deporte.IdDeporte}`}
                      checked={deportesSeleccionados.includes(deporte.IdDeporte)}
                      onCheckedChange={() => handleDeporteToggle(deporte.IdDeporte)}
                    />
                    <label
                      htmlFor={`deporte-${deporte.IdDeporte}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {deporte.Nombre}
                    </label>
                  </div>
                ))}
              </div>
              {deportesSeleccionados.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  No has seleccionado ningún deporte.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tarifa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Tarifa por Partido
              </CardTitle>
              <CardDescription>
                Establece tu tarifa estándar por partido arbitrado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promedioTarifa > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Tarifa promedio de referencia</p>
                      <p className="text-xs text-blue-700 mt-1">
                        El promedio de tarifas de todos los árbitros es de{" "}
                        <span className="font-bold">${promedioTarifa.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                )}
                <div className="max-w-xs">
                  <Label htmlFor="tarifa">Tarifa (ARS)</Label>
                  <Input
                    id="tarifa"
                    type="number"
                    min="0"
                    step="100"
                    value={tarifa}
                    onChange={(e) => setTarifa(e.target.value)}
                    placeholder="Ej: 5000"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta tarifa se utilizará por defecto al asignarte partidos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disponibilidad Horaria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Disponibilidad Horaria
              </CardTitle>
              <CardDescription>
                Haz clic en un día para configurar tu disponibilidad horaria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-3">
                {diasSemana.map((dia) => {
                  const diaDisponible = disponibilidad.find((d) => d.DiaSemana === dia);
                  return (
                    <div
                      key={dia}
                      onClick={() => handleClickDia(dia)}
                      className={`p-3 rounded-md border text-center transition-all cursor-pointer hover:shadow-md ${
                        diaDisponible
                          ? "bg-green-50 border-green-300 hover:bg-green-100"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className={`text-xs font-bold mb-2 ${
                          diaDisponible ? "text-green-700" : "text-gray-400"
                        }`}
                      >
                        {diasSemanaDisplay[dia]}
                      </div>
                      {diaDisponible ? (
                        <div className="text-sm text-green-800 font-bold leading-snug">
                          <div>{diaDisponible.HoraInicio}</div>
                          <div className="text-xs text-gray-600 my-0.5">a</div>
                          <div>{diaDisponible.HoraFin}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">No disp.</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Los días en verde indican disponibilidad configurada. Haz clic en cualquier día para editar o eliminar su horario.
              </p>
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/arbitro-dashboard")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
      </div>

      {/* Dialog para editar horario del día */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurar Disponibilidad - {diaSeleccionado}
            </DialogTitle>
            <DialogDescription>
              Establece tu horario de disponibilidad para {diaSeleccionado}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dialog-hora-inicio">Hora Inicio</Label>
                <Input
                  id="dialog-hora-inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="dialog-hora-fin">Hora Fin</Label>
                <Input
                  id="dialog-hora-fin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={handleEliminarHorario}
              disabled={!disponibilidad.find((d) => d.DiaSemana === diaSeleccionado)}
            >
              <X className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarHorario}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
