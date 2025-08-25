"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, UserCheck, Save, Loader2, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Arbitro {
  IdArbitro: number
  Nombre: string
  Email: string
  Telefono: string | null
  Disponibilidad: string | null
  Experiencia: string | null
  Certificaciones: string | null
}

export default function EditarArbitroPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [arbitro, setArbitro] = useState<Arbitro | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const arbitroId = params.id as string

  useEffect(() => {
    const fetchArbitro = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/arbitros/${arbitroId}`)
        if (!response.ok) {
          throw new Error(`Error al cargar árbitro: ${response.status}`)
        }
        const data = await response.json()
        setArbitro(data)
      } catch (error: any) {
        console.error("Error fetching arbitro:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchArbitro()
  }, [arbitroId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arbitro) return

    setSaving(true)
    try {
      const response = await fetch(`/api/arbitros/${arbitroId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(arbitro),
      })

      if (!response.ok) {
        throw new Error(`Error al actualizar árbitro: ${response.status}`)
      }

      toast({
        title: "Árbitro actualizado",
        description: "Los cambios se han guardado correctamente.",
      })

      router.push("/arbitros")
    } catch (error: any) {
      console.error("Error updating arbitro:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Arbitro, value: any) => {
    if (!arbitro) return
    setArbitro({ ...arbitro, [field]: value })
  }

  const handleVolver = () => {
    router.push("/arbitros")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-600">Cargando árbitro...</span>
        </div>
      </div>
    )
  }

  if (error || !arbitro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
        <header className="bg-white shadow-sm border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
              </div>
              <Button variant="outline" onClick={handleVolver} className="flex items-center gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || "Árbitro no encontrado"}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
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
            <Button variant="outline" onClick={handleVolver} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Volver a Árbitros
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-purple-600" />
            Editar Árbitro
          </h2>
          <p className="text-gray-600">Modifica la información del árbitro</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Perfil del Árbitro */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarFallback className="text-2xl">
                  {arbitro.Nombre.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{arbitro.Nombre}</h3>
              <p className="text-gray-600">{arbitro.Email}</p>
              <div className="flex justify-center items-center gap-1 mt-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < 4 ? "text-yellow-500 fill-current" : "text-gray-300"}`} />
                ))}
                <span className="text-sm text-gray-600 ml-1">(4.2)</span>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de Edición */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información del Árbitro</CardTitle>
              <CardDescription>Actualiza los datos del árbitro según sea necesario</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <Input
                      id="nombre"
                      value={arbitro.Nombre}
                      onChange={(e) => handleInputChange("Nombre", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={arbitro.Email}
                      onChange={(e) => handleInputChange("Email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={arbitro.Telefono || ""}
                      onChange={(e) => handleInputChange("Telefono", e.target.value || null)}
                      placeholder="Ej: +54 11 1234-5678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disponibilidad">Disponibilidad</Label>
                    <Input
                      id="disponibilidad"
                      value={arbitro.Disponibilidad || ""}
                      onChange={(e) => handleInputChange("Disponibilidad", e.target.value || null)}
                      placeholder="Ej: 2025-01-15,2025-01-16"
                    />
                    <p className="text-xs text-gray-500">Fechas separadas por comas (YYYY-MM-DD)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experiencia">Experiencia</Label>
                  <Textarea
                    id="experiencia"
                    value={arbitro.Experiencia || ""}
                    onChange={(e) => handleInputChange("Experiencia", e.target.value || null)}
                    placeholder="Describe la experiencia del árbitro..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificaciones">Certificaciones</Label>
                  <Textarea
                    id="certificaciones"
                    value={arbitro.Certificaciones || ""}
                    onChange={(e) => handleInputChange("Certificaciones", e.target.value || null)}
                    placeholder="Lista las certificaciones del árbitro..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={handleVolver}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
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
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
