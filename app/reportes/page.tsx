"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Users, CreditCard, Trophy, Download, Filter } from "lucide-react"

export default function GenerarReportesPage() {
  const router = useRouter()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    fechaInicio: "",
    fechaFin: "",
    estado: "",
    tipoMembresia: "",
    deporte: "",
  })

  const reportTypes = [
    {
      id: "socios",
      title: "Reporte de Socios",
      description: "Información detallada de todos los socios del club",
      icon: Users,
      color: "bg-blue-500 hover:bg-blue-600",
      filters: ["fechaInicio", "fechaFin", "estado", "tipoMembresia"],
    },
    {
      id: "cuotas",
      title: "Reporte de Cuotas",
      description: "Estado de pagos y cuotas de los socios",
      icon: CreditCard,
      color: "bg-green-500 hover:bg-green-600",
      filters: ["fechaInicio", "fechaFin", "estado"],
    },
    {
      id: "torneos",
      title: "Reporte de Torneos",
      description: "Estadísticas y resultados de torneos",
      icon: Trophy,
      color: "bg-yellow-500 hover:bg-yellow-600",
      filters: ["fechaInicio", "fechaFin", "estado", "deporte"],
    },
  ]

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId)
    setFilters({
      fechaInicio: "",
      fechaFin: "",
      estado: "",
      tipoMembresia: "",
      deporte: "",
    })
  }

  const handleGenerateReport = () => {
    // Simular generación de reporte
    alert("Reporte generado exitosamente. Se iniciará la descarga.")
  }

  const handleVolver = () => {
    router.push("/dashboard")
  }

  const selectedReportType = reportTypes.find((report) => report.id === selectedReport)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            </div>
            <Button variant="outline" onClick={handleVolver} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Menú
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            Generar Reportes
          </h2>
          <p className="text-gray-600">Genera informes detallados del club con filtros personalizados</p>
        </div>

        {/* Tipos de Reportes */}
        {!selectedReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {reportTypes.map((report) => {
              const IconComponent = report.icon
              return (
                <Card
                  key={report.id}
                  className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                  onClick={() => handleSelectReport(report.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div
                      className={`w-16 h-16 mx-auto rounded-full ${report.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
                    >
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">{report.title}</CardTitle>
                    <CardDescription className="text-gray-600">{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                      variant="outline"
                    >
                      Seleccionar
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Configuración de Filtros */}
        {selectedReport && selectedReportType && (
          <div className="space-y-6">
            {/* Header del reporte seleccionado */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full ${selectedReportType.color} flex items-center justify-center`}
                    >
                      <selectedReportType.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{selectedReportType.title}</CardTitle>
                      <CardDescription>{selectedReportType.description}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>
                    Cambiar Reporte
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros de Búsqueda
                </CardTitle>
                <CardDescription>Configura los filtros para personalizar tu reporte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Rango de fechas */}
                  {selectedReportType.filters.includes("fechaInicio") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                        <Input
                          id="fechaInicio"
                          type="date"
                          value={filters.fechaInicio}
                          onChange={(e) => setFilters({ ...filters, fechaInicio: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fechaFin">Fecha Fin</Label>
                        <Input
                          id="fechaFin"
                          type="date"
                          value={filters.fechaFin}
                          onChange={(e) => setFilters({ ...filters, fechaFin: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {/* Estado */}
                  {selectedReportType.filters.includes("estado") && (
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select
                        value={filters.estado}
                        onValueChange={(value) => setFilters({ ...filters, estado: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los estados</SelectItem>
                          {selectedReport === "socios" && (
                            <>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="inactivo">Inactivo</SelectItem>
                              <SelectItem value="suspendido">Suspendido</SelectItem>
                            </>
                          )}
                          {selectedReport === "cuotas" && (
                            <>
                              <SelectItem value="pagada">Pagadas</SelectItem>
                              <SelectItem value="pendiente">Pendientes</SelectItem>
                              <SelectItem value="vencida">Vencidas</SelectItem>
                            </>
                          )}
                          {selectedReport === "torneos" && (
                            <>
                              <SelectItem value="activo">Activos</SelectItem>
                              <SelectItem value="finalizado">Finalizados</SelectItem>
                              <SelectItem value="planificado">Planificados</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Tipo de Membresía */}
                  {selectedReportType.filters.includes("tipoMembresia") && (
                    <div className="space-y-2">
                      <Label>Tipo de Membresía</Label>
                      <Select
                        value={filters.tipoMembresia}
                        onValueChange={(value) => setFilters({ ...filters, tipoMembresia: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las membresías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas las membresías</SelectItem>
                          <SelectItem value="basica">Membresía Básica</SelectItem>
                          <SelectItem value="premium">Membresía Premium</SelectItem>
                          <SelectItem value="familiar">Membresía Familiar</SelectItem>
                          <SelectItem value="juvenil">Membresía Juvenil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Deporte */}
                  {selectedReportType.filters.includes("deporte") && (
                    <div className="space-y-2">
                      <Label>Deporte</Label>
                      <Select
                        value={filters.deporte}
                        onValueChange={(value) => setFilters({ ...filters, deporte: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los deportes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los deportes</SelectItem>
                          <SelectItem value="futbol5">Fútbol 5</SelectItem>
                          <SelectItem value="tenis">Tenis</SelectItem>
                          <SelectItem value="basquet">Básquet</SelectItem>
                          <SelectItem value="padel">Padel</SelectItem>
                          <SelectItem value="natacion">Natación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resumen y Generación */}
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Reporte</CardTitle>
                <CardDescription>Verifica la configuración antes de generar el reporte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tipo de Reporte</h4>
                      <Badge variant="outline" className="text-sm">
                        {selectedReportType.title}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Período</h4>
                      <p className="text-sm text-gray-600">
                        {filters.fechaInicio && filters.fechaFin
                          ? `${new Date(filters.fechaInicio).toLocaleDateString("es-AR")} - ${new Date(filters.fechaFin).toLocaleDateString("es-AR")}`
                          : "Sin restricción de fechas"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Filtros Aplicados</h4>
                    <div className="flex flex-wrap gap-2">
                      {filters.estado && <Badge variant="secondary">Estado: {filters.estado}</Badge>}
                      {filters.tipoMembresia && <Badge variant="secondary">Membresía: {filters.tipoMembresia}</Badge>}
                      {filters.deporte && <Badge variant="secondary">Deporte: {filters.deporte}</Badge>}
                      {!filters.estado && !filters.tipoMembresia && !filters.deporte && (
                        <span className="text-sm text-gray-500">Sin filtros adicionales</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button onClick={handleGenerateReport} className="bg-blue-600 hover:bg-blue-700 px-8">
                      <Download className="mr-2 h-5 w-5" />
                      Generar Reporte
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
