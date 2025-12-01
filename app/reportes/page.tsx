"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  FileText,
  Users,
  CreditCard,
  Trophy,
  Download,
  Filter,
  Save,
  Eye,
  Trash2,
  Calendar,
  BarChart3,
} from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import html2canvas from "html2canvas"

// Tipos
interface ReporteData {
  socios?: any[]
  cuotas?: any[]
  torneos?: any[]
  estadisticas?: any
}

interface ReporteGuardado {
  id: string
  nombre: string
  tipo: string
  filtros: any
  fechaCreacion: string
  nombreArchivo: string
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export default function GenerarReportesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("generar")
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    fechaInicio: "",
    fechaFin: "",
    estado: "",
    tipoMembresia: "",
    deporte: "",
    torneo: "",
  })

  const [reportData, setReportData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [reportName, setReportName] = useState("")
  const [reportesGuardados, setReportesGuardados] = useState<ReporteGuardado[]>([])
  const [tiposMembresia, setTiposMembresia] = useState<any[]>([])
  const [deportes, setDeportes] = useState<any[]>([])
  const [torneos, setTorneos] = useState<any[]>([])
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  const reportCategories = [
    {
      id: "socios-membresias",
      title: "📋 Socios y Membresías",
      description: "Gestión de la base de socios del club",
      reports: [
        {
          id: "socios",
          title: "Reporte de Socios",
          description: "Información detallada de todos los socios del club",
          icon: Users,
          color: "bg-blue-500 hover:bg-blue-600",
          filters: ["fechaInicio", "fechaFin", "estado", "tipoMembresia"],
        },
        {
          id: "retencion-membresias",
          title: "Retención y Membresías",
          description: "Análisis de altas, bajas y distribución de membresías",
          icon: BarChart3,
          color: "bg-blue-600 hover:bg-blue-700",
          filters: ["fechaInicio", "fechaFin", "tipoMembresia"],
        },
      ],
    },
    {
      id: "finanzas",
      title: "💰 Finanzas",
      description: "Control económico y flujo de caja",
      reports: [
        {
          id: "cuotas",
          title: "Reporte de Cuotas",
          description: "Estado de pagos y cuotas de los socios",
          icon: CreditCard,
          color: "bg-green-500 hover:bg-green-600",
          filters: ["fechaInicio", "fechaFin", "estado"],
        },
        {
          id: "morosidad",
          title: "Reporte de Morosidad",
          description: "Análisis de deudas y socios morosos",
          icon: CreditCard,
          color: "bg-red-500 hover:bg-red-600",
          filters: ["antiguedadDeuda", "montoMinimo", "tipoMembresia"],
        },
        {
          id: "arbitros-finanzas",
          title: "Gastos de Árbitros",
          description: "Pagos y gastos de árbitros por período",
          icon: CreditCard,
          color: "bg-teal-500 hover:bg-teal-600",
          filters: ["fechaInicio", "fechaFin", "deporte"],
        },
        {
          id: "proyeccion-financiera",
          title: "Proyección Financiera",
          description: "Estimación de ingresos y gastos futuros",
          icon: BarChart3,
          color: "bg-emerald-500 hover:bg-emerald-600",
          filters: ["periodoProyeccion", "escenario"],
        },
      ],
    },
    {
      id: "deportes-competencias",
      title: "🏆 Deportes y Competencias",
      description: "Gestión deportiva y eventos",
      reports: [
        {
          id: "torneos",
          title: "Reporte de Torneos",
          description: "Estadísticas y rendimiento de torneos",
          icon: Trophy,
          color: "bg-yellow-500 hover:bg-yellow-600",
          filters: ["fechaInicio", "fechaFin", "estado", "deporte", "torneo"],
        },
        {
          id: "equipos-participacion",
          title: "Equipos y Participación",
          description: "Análisis de equipos y participación de socios",
          icon: Users,
          color: "bg-orange-500 hover:bg-orange-600",
          filters: ["deporte", "estadoEquipo", "torneo"],
        },
        {
          id: "actividad-deporte",
          title: "Actividad por Deporte",
          description: "Métricas y tendencias por disciplina deportiva",
          icon: Trophy,
          color: "bg-amber-500 hover:bg-amber-600",
          filters: ["deporte", "fechaInicio", "fechaFin", "incluirHistorico"],
        },
        {
          id: "arbitros-partidos",
          title: "Árbitros y Partidos",
          description: "Estadísticas de árbitros y partidos arbitrados",
          icon: Users,
          color: "bg-indigo-500 hover:bg-indigo-600",
          filters: ["fechaInicio", "fechaFin", "estado", "deporte"],
        },
      ],
    },
    {
      id: "analisis-tendencias",
      title: "📈 Análisis y Tendencias",
      description: "Toma de decisiones estratégicas",
      reports: [
        {
          id: "comparativo-periodos",
          title: "Comparativo de Períodos",
          description: "Comparación de métricas entre diferentes períodos",
          icon: BarChart3,
          color: "bg-purple-500 hover:bg-purple-600",
          filters: ["tipoComparacion", "periodo1", "periodo2", "metricas"],
        },
      ],
    },
  ]

  // Aplanar todos los reportes para mantener compatibilidad
  const reportTypes = reportCategories.flatMap((cat) => cat.reports)

  useEffect(() => {
    if (activeTab === "guardados") {
      fetchReportesGuardados()
    }
  }, [activeTab])

  useEffect(() => {
    // Cargar tipos de membresía, deportes y torneos
    fetchTiposMembresia()
    fetchDeportes()
    fetchTorneos()
  }, [])

  const fetchTiposMembresia = async () => {
    try {
      const response = await fetch("/api/tipos-membresia")
      if (response.ok) {
        const data = await response.json()
        setTiposMembresia(data)
      }
    } catch (error) {
      console.error("Error fetching tipos membresía:", error)
    }
  }

  const fetchDeportes = async () => {
    try {
      const response = await fetch("/api/deportes")
      if (response.ok) {
        const data = await response.json()
        setDeportes(data)
      }
    } catch (error) {
      console.error("Error fetching deportes:", error)
    }
  }

  const fetchTorneos = async () => {
    try {
      const response = await fetch("/api/torneos")
      if (response.ok) {
        const data = await response.json()
        setTorneos(data)
      }
    } catch (error) {
      console.error("Error fetching torneos:", error)
    }
  }

  const fetchReportesGuardados = async () => {
    try {
      const response = await fetch("/api/reportes/lista")
      if (response.ok) {
        const data = await response.json()
        setReportesGuardados(data)
      }
    } catch (error) {
      console.error("Error fetching reportes guardados:", error)
      toast.error("Error al cargar reportes guardados")
    }
  }

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId)
    setReportData(null)
    setShowPreview(false)
    setFilters({
      fechaInicio: "",
      fechaFin: "",
      estado: "",
      tipoMembresia: "",
      deporte: "",
      torneo: "",
    })
  }

  const handleGenerateReport = async () => {
    if (!selectedReport) return

    setLoading(true)
    try {
      // Construir query params
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "todos" && value !== "todas") {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/reportes/${selectedReport}?${params.toString()}`)
      if (!response.ok) throw new Error("Error generando reporte")

      const data = await response.json()
      setReportData(data)
      setShowPreview(true)
      toast.success("Reporte generado exitosamente")
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Error al generar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async (): Promise<string> => {
    const doc = new jsPDF()
    const selectedReportType = reportTypes.find((r) => r.id === selectedReport)

    // Título
    doc.setFontSize(20)
    doc.setTextColor(59, 130, 246)
    doc.text(selectedReportType?.title || "Reporte", 14, 20)

    // Fecha y filtros
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 30)

    let yPos = 40

    // Agregar filtros aplicados
    if (filters.fechaInicio || filters.fechaFin || filters.estado || filters.tipoMembresia || filters.deporte) {
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text("Filtros Aplicados:", 14, yPos)
      yPos += 7

      doc.setFontSize(10)
      if (filters.fechaInicio && filters.fechaFin) {
        doc.text(`• Período: ${filters.fechaInicio} - ${filters.fechaFin}`, 20, yPos)
        yPos += 6
      }
      if (filters.estado && filters.estado !== "todos") {
        doc.text(`• Estado: ${filters.estado}`, 20, yPos)
        yPos += 6
      }
      if (filters.tipoMembresia && filters.tipoMembresia !== "todas") {
        doc.text(`• Tipo de Membresía: ${filters.tipoMembresia}`, 20, yPos)
        yPos += 6
      }
      if (filters.deporte && filters.deporte !== "todos") {
        doc.text(`• Deporte: ${filters.deporte}`, 20, yPos)
        yPos += 6
      }
      yPos += 5
    }

    // Contenido según tipo de reporte
    if (selectedReport === "socios" && reportData?.socios) {
      // Estadísticas
      const stats = reportData.estadisticas
      doc.setFontSize(14)
      doc.text("Estadísticas Generales", 14, yPos)
      yPos += 10

      doc.setFontSize(10)
      doc.text(`Total de Socios: ${stats.totalSocios}`, 20, yPos)
      yPos += 6
      doc.text(`Socios Activos: ${stats.activos}`, 20, yPos)
      yPos += 6
      doc.text(`Socios Inactivos: ${stats.inactivos}`, 20, yPos)
      yPos += 15

      // Capturar gráficos
      const chartsElement = document.getElementById("socios-charts")
      if (chartsElement) {
        try {
          const canvas = await html2canvas(chartsElement, {
            scale: 2,
            useCORS: true,
            logging: false,
          })
          const imgData = canvas.toDataURL("image/png")
          const imgWidth = 180
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          // Verificar si necesitamos una nueva página
          if (yPos + imgHeight > 280) {
            doc.addPage()
            yPos = 20
          }

          doc.addImage(imgData, "PNG", 14, yPos, imgWidth, imgHeight)
          yPos += imgHeight + 10
        } catch (error) {
          console.error("Error capturando gráficos:", error)
        }
      }

      // Verificar si necesitamos una nueva página para la tabla
      if (yPos > 200) {
        doc.addPage()
        yPos = 20
      }

      // Tabla de socios
      const sociosData = reportData.socios.map((s: any) => [
        s.NumeroSocio,
        `${s.Nombre} ${s.Apellido}`,
        s.TipoMembresia,
        s.Estado === 1 ? "Activo" : "Inactivo",
        s.Email,
        s.Telefono || "-",
      ])

      autoTable(doc, {
        startY: yPos,
        head: [["N° Socio", "Nombre", "Membresía", "Estado", "Email", "Teléfono"]],
        body: sociosData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
      })
    } else if (selectedReport === "retencion-membresias" && reportData?.estadisticas) {
      // Estadísticas
      const stats = reportData.estadisticas
      doc.setFontSize(14)
      doc.text("Estadísticas de Retención y Membresías", 14, yPos)
      yPos += 10

      doc.setFontSize(10)
      doc.text(`Total de Socios: ${stats.totalSocios}`, 20, yPos)
      yPos += 6
      doc.text(`Tasa de Retención: ${stats.tasaRetencion}%`, 20, yPos)
      yPos += 6
      doc.text(`Socios Activos: ${stats.activos}`, 20, yPos)
      yPos += 6
      doc.text(`Ingresos Potenciales Mensuales: $${stats.ingresosPotenciales}`, 20, yPos)
      yPos += 6
      doc.text(
        `Altas: ${stats.altasYBajas.altas} | Bajas: ${stats.altasYBajas.bajas} | Neto: ${stats.altasYBajas.neto}`,
        20,
        yPos
      )
      yPos += 15

      // Capturar gráficos
      const chartsElement = document.getElementById("retencion-membresias-charts")
      if (chartsElement) {
        try {
          const canvas = await html2canvas(chartsElement, {
            scale: 2,
            useCORS: true,
            logging: false,
          })
          const imgData = canvas.toDataURL("image/png")
          const imgWidth = 180
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          // Verificar si necesitamos una nueva página
          if (yPos + imgHeight > 280) {
            doc.addPage()
            yPos = 20
          }

          doc.addImage(imgData, "PNG", 14, yPos, imgWidth, imgHeight)
          yPos += imgHeight + 10
        } catch (error) {
          console.error("Error capturando gráficos:", error)
        }
      }

      // Verificar si necesitamos una nueva página para la tabla
      if (yPos > 200) {
        doc.addPage()
        yPos = 20
      }

      // Tabla de membresías
      const membresiasData = stats.porMembresia.map((m: any) => [
        m.name,
        m.cantidad,
        `${m.porcentaje}%`,
        `$${m.ingresoMensual}`,
      ])

      autoTable(doc, {
        startY: yPos,
        head: [["Tipo de Membresía", "Cantidad", "Porcentaje", "Ingreso Mensual"]],
        body: membresiasData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
      })
    } else if (selectedReport === "cuotas" && reportData?.cuotas) {
      // Estadísticas
      const stats = reportData.estadisticas
      doc.setFontSize(14)
      doc.text("Estadísticas de Cuotas", 14, yPos)
      yPos += 10

      doc.setFontSize(10)
      doc.text(`Total de Cuotas: ${stats.totalCuotas}`, 20, yPos)
      yPos += 6
      doc.text(`Cuotas Pagadas: ${stats.pagadas} (${stats.porcentajePagadas.toFixed(1)}%)`, 20, yPos)
      yPos += 6
      doc.text(`Cuotas Pendientes: ${stats.pendientes} (${stats.porcentajePendientes.toFixed(1)}%)`, 20, yPos)
      yPos += 6
      doc.text(`Monto Total Recaudado: $${stats.montoRecaudado.toFixed(2)}`, 20, yPos)
      yPos += 6
      doc.text(`Monto Pendiente: $${stats.montoPendiente.toFixed(2)}`, 20, yPos)
      yPos += 15

      // Capturar gráficos
      const chartsElement = document.getElementById("cuotas-charts")
      if (chartsElement) {
        try {
          const canvas = await html2canvas(chartsElement, {
            scale: 2,
            useCORS: true,
            logging: false,
          })
          const imgData = canvas.toDataURL("image/png")
          const imgWidth = 180
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          // Verificar si necesitamos una nueva página
          if (yPos + imgHeight > 280) {
            doc.addPage()
            yPos = 20
          }

          doc.addImage(imgData, "PNG", 14, yPos, imgWidth, imgHeight)
          yPos += imgHeight + 10
        } catch (error) {
          console.error("Error capturando gráficos:", error)
        }
      }

      // Verificar si necesitamos una nueva página para la tabla
      if (yPos > 200) {
        doc.addPage()
        yPos = 20
      }

      // Tabla de cuotas
      const cuotasData = reportData.cuotas.map((c: any) => [
        c.NumeroSocio,
        `${c.NombreSocio} ${c.ApellidoSocio}`,
        `${c.Mes}/${c.Anio}`,
        `$${c.Monto.toFixed(2)}`,
        c.Estado === 1 ? "Pagada" : "Pendiente",
        c.FechaPago ? format(new Date(c.FechaPago), "dd/MM/yyyy") : "-",
      ])

      autoTable(doc, {
        startY: yPos,
        head: [["N° Socio", "Socio", "Período", "Monto", "Estado", "Fecha Pago"]],
        body: cuotasData,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
      })
    } else if (selectedReport === "torneos" && reportData?.torneos) {
      // Estadísticas
      const stats = reportData.estadisticas
      doc.setFontSize(14)
      doc.text("Estadísticas de Torneos", 14, yPos)
      yPos += 10

      doc.setFontSize(10)
      doc.text(`Total de Torneos: ${stats.totalTorneos}`, 20, yPos)
      yPos += 6
      doc.text(`Torneos Activos: ${stats.activos}`, 20, yPos)
      yPos += 6
      doc.text(`Torneos Finalizados: ${stats.finalizados}`, 20, yPos)
      yPos += 6
      doc.text(`Total de Partidos: ${stats.totalPartidos}`, 20, yPos)
      yPos += 6
      doc.text(`Total de Equipos: ${stats.totalEquipos}`, 20, yPos)
      yPos += 15

      // Capturar gráficos
      const chartsElement = document.getElementById("torneos-charts")
      if (chartsElement) {
        try {
          const canvas = await html2canvas(chartsElement, {
            scale: 2,
            useCORS: true,
            logging: false,
          })
          const imgData = canvas.toDataURL("image/png")
          const imgWidth = 180
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          // Verificar si necesitamos una nueva página
          if (yPos + imgHeight > 280) {
            doc.addPage()
            yPos = 20
          }

          doc.addImage(imgData, "PNG", 14, yPos, imgWidth, imgHeight)
          yPos += imgHeight + 10
        } catch (error) {
          console.error("Error capturando gráficos:", error)
        }
      }

      // Verificar si necesitamos una nueva página para la tabla
      if (yPos > 200) {
        doc.addPage()
        yPos = 20
      }

      // Tabla de torneos
      const torneosData = reportData.torneos.map((t: any) => [
        t.Nombre,
        t.DeporteNombre,
        t.TipoTorneo,
        format(new Date(t.FechaInicio), "dd/MM/yyyy"),
        t.FechaFin ? format(new Date(t.FechaFin), "dd/MM/yyyy") : "En curso",
        t.CantidadEquipos,
        t.Estado === 1 ? "Activo" : "Finalizado",
      ])

      autoTable(doc, {
        startY: yPos,
        head: [["Torneo", "Deporte", "Tipo", "Fecha Inicio", "Fecha Fin", "Equipos", "Estado"]],
        body: torneosData,
        theme: "striped",
        headStyles: { fillColor: [245, 158, 11] },
      })
    }

    // Convertir a base64
    return doc.output("datauristring").split(",")[1]
  }

  const handleDownloadPDF = async () => {
    if (!reportData) return

    try {
      const selectedReportType = reportTypes.find((r) => r.id === selectedReport)

      // Generar el PDF
      const base64 = await generatePDF()
      const pdfData = atob(base64)
      const bytes = new Uint8Array(pdfData.length)
      for (let i = 0; i < pdfData.length; i++) {
        bytes[i] = pdfData.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${selectedReportType?.title}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success("Reporte descargado exitosamente")
    } catch (error) {
      console.error("Error al descargar PDF:", error)
      toast.error("Error al descargar el reporte")
    }
  }

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      toast.error("Por favor ingresa un nombre para el reporte")
      return
    }

    if (!reportData) {
      toast.error("No hay datos para guardar")
      return
    }

    try {
      const contenidoBase64 = await generatePDF()

      const response = await fetch("/api/reportes/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: reportName,
          tipo: selectedReport,
          filtros: filters,
          contenidoBase64,
        }),
      })

      if (!response.ok) throw new Error("Error guardando reporte")

      toast.success("Reporte guardado exitosamente")
      setShowSaveDialog(false)
      setReportName("")
    } catch (error) {
      console.error("Error saving report:", error)
      toast.error("Error al guardar el reporte")
    }
  }

  const handleDownloadSavedReport = async (id: string) => {
    try {
      const response = await fetch(`/api/reportes/descargar/${id}`)
      if (!response.ok) throw new Error("Error descargando reporte")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `reporte_${id}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success("Reporte descargado exitosamente")
    } catch (error) {
      console.error("Error downloading report:", error)
      toast.error("Error al descargar el reporte")
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este reporte?")) return

    try {
      const response = await fetch(`/api/reportes/eliminar/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Error eliminando reporte")

      toast.success("Reporte eliminado exitosamente")
      fetchReportesGuardados()
    } catch (error) {
      console.error("Error deleting report:", error)
      toast.error("Error al eliminar el reporte")
    }
  }

  const selectedReportType = reportTypes.find((report) => report.id === selectedReport)

  const renderVistaPrevia = () => {
    if (!reportData) return null

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista Previa del Reporte
          </CardTitle>
          <CardDescription>Revisa los datos antes de descargar o guardar</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedReport === "socios" && reportData.socios && (
            <div className="space-y-6">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Socios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.estadisticas.totalSocios}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{reportData.estadisticas.activos}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Inactivos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{reportData.estadisticas.inactivos}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="socios-charts">
                {/* Por Estado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribución por Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.estadisticas.porEstado}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.estadisticas.porEstado.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Por Tipo de Membresía */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Por Tipo de Membresía</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.estadisticas.porMembresia}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de Socios */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lista de Socios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Socio</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Membresía</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Teléfono</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.socios.map((socio: any) => (
                          <TableRow key={socio.IdSocio}>
                            <TableCell>{socio.NumeroSocio}</TableCell>
                            <TableCell>
                              {socio.Nombre} {socio.Apellido}
                            </TableCell>
                            <TableCell>{socio.TipoMembresia}</TableCell>
                            <TableCell>
                              <Badge variant={socio.Estado === 1 ? "default" : "secondary"}>
                                {socio.Estado === 1 ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>{socio.Email}</TableCell>
                            <TableCell>{socio.Telefono || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReport === "retencion-membresias" && reportData.socios && reportData.estadisticas && (
            <div className="space-y-6">
              {/* Métricas Clave */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Socios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.estadisticas.totalSocios}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Retención</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{reportData.estadisticas.tasaRetencion}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Potenciales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">${reportData.estadisticas.ingresosPotenciales}</div>
                    <p className="text-xs text-muted-foreground mt-1">Mensual</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Socios Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{reportData.estadisticas.activos}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos Principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="retencion-membresias-charts">
                {/* Distribución por Membresía */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribución por Tipo de Membresía</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.estadisticas.porMembresia}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, porcentaje }) => `${name}: ${porcentaje}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.estadisticas.porMembresia.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Antigüedad de Socios */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Antigüedad de Socios Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.estadisticas.porAntiguedad}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Estado de Socios */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado de Socios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.estadisticas.porEstado}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.estadisticas.porEstado.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Altas y Bajas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Altas y Bajas del Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={[
                          { name: "Altas", value: reportData.estadisticas.altasYBajas.altas, fill: "#10b981" },
                          { name: "Bajas", value: reportData.estadisticas.altasYBajas.bajas, fill: "#ef4444" },
                          {
                            name: "Neto",
                            value: Math.abs(reportData.estadisticas.altasYBajas.neto),
                            fill: reportData.estadisticas.altasYBajas.neto >= 0 ? "#3b82f6" : "#f59e0b",
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value">
                          {[
                            { name: "Altas", value: reportData.estadisticas.altasYBajas.altas, fill: "#10b981" },
                            { name: "Bajas", value: reportData.estadisticas.altasYBajas.bajas, fill: "#ef4444" },
                            {
                              name: "Neto",
                              value: Math.abs(reportData.estadisticas.altasYBajas.neto),
                              fill: reportData.estadisticas.altasYBajas.neto >= 0 ? "#3b82f6" : "#f59e0b",
                            },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de Membresías */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle por Tipo de Membresía</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de Membresía</TableHead>
                          <TableHead>Cantidad de Socios</TableHead>
                          <TableHead>Porcentaje</TableHead>
                          <TableHead>Ingreso Mensual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.estadisticas.porMembresia.map((membresia: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{membresia.name}</TableCell>
                            <TableCell>{membresia.cantidad}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{membresia.porcentaje}%</Badge>
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              ${membresia.ingresoMensual}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReport === "cuotas" && reportData.cuotas && (
            <div className="space-y-6">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Cuotas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.estadisticas.totalCuotas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pagadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{reportData.estadisticas.pagadas}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reportData.estadisticas.porcentajePagadas.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Monto Recaudado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ${reportData.estadisticas.montoRecaudado.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Monto Pendiente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      ${reportData.estadisticas.montoPendiente.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="cuotas-charts">
                {/* Por Estado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado de Cuotas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Pagadas", value: reportData.estadisticas.pagadas },
                            { name: "Pendientes", value: reportData.estadisticas.pendientes },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Por Mes */}
                {reportData.estadisticas.porMes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cuotas por Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={reportData.estadisticas.porMes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mes" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="pagadas" fill="#10b981" name="Pagadas" />
                          <Bar dataKey="pendientes" fill="#ef4444" name="Pendientes" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tabla de Cuotas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lista de Cuotas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Socio</TableHead>
                          <TableHead>Socio</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha Pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.cuotas.slice(0, 50).map((cuota: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{cuota.NumeroSocio}</TableCell>
                            <TableCell>
                              {cuota.NombreSocio} {cuota.ApellidoSocio}
                            </TableCell>
                            <TableCell>
                              {cuota.Mes}/{cuota.Anio}
                            </TableCell>
                            <TableCell>${cuota.Monto.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={cuota.Estado === 1 ? "default" : "secondary"}>
                                {cuota.Estado === 1 ? "Pagada" : "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cuota.FechaPago ? format(new Date(cuota.FechaPago), "dd/MM/yyyy") : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {reportData.cuotas.length > 50 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Mostrando 50 de {reportData.cuotas.length} cuotas (todas se incluirán en el PDF)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReport === "torneos" && reportData.torneos && (
            <div className="space-y-6">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Torneos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.estadisticas.totalTorneos}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{reportData.estadisticas.activos}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Partidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{reportData.estadisticas.totalPartidos}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Equipos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{reportData.estadisticas.totalEquipos}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="torneos-charts">
                {/* Por Deporte */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Torneos por Deporte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.estadisticas.porDeporte}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Por Estado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado de Torneos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.estadisticas.porEstado}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.estadisticas.porEstado.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de Torneos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lista de Torneos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Torneo</TableHead>
                          <TableHead>Deporte</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Fecha Fin</TableHead>
                          <TableHead>Equipos</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.torneos.map((torneo: any) => (
                          <TableRow key={torneo.IdTorneo}>
                            <TableCell className="font-medium">{torneo.Nombre}</TableCell>
                            <TableCell>{torneo.DeporteNombre}</TableCell>
                            <TableCell>{torneo.TipoTorneo}</TableCell>
                            <TableCell>{format(new Date(torneo.FechaInicio), "dd/MM/yyyy")}</TableCell>
                            <TableCell>
                              {torneo.FechaFin ? format(new Date(torneo.FechaFin), "dd/MM/yyyy") : "En curso"}
                            </TableCell>
                            <TableCell>{torneo.CantidadEquipos}</TableCell>
                            <TableCell>
                              <Badge variant={torneo.Estado === 1 ? "default" : "secondary"}>
                                {torneo.Estado === 1 ? "Activo" : "Finalizado"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-center gap-4 mt-6">
            <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
            <Button onClick={() => setShowSaveDialog(true)} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Guardar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>
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
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
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
            <FileText className="h-8 w-8 text-blue-600" />
            Generar Reportes
          </h2>
          <p className="text-gray-600">Genera informes detallados del club con filtros personalizados</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generar">Generar Reporte</TabsTrigger>
            <TabsTrigger value="guardados">Reportes Guardados</TabsTrigger>
          </TabsList>

          <TabsContent value="generar" className="space-y-6">
            {/* Tipos de Reportes Organizados por Categorías */}
            {!selectedReport && (
              <div className="space-y-6">
                {/* Primera fila: Socios y Análisis */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {reportCategories.slice(0, 1).map((category) => (
                    <Card key={category.id} className="border-2 flex flex-col lg:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl font-bold text-gray-900">{category.title}</CardTitle>
                        <CardDescription className="text-sm text-gray-600">{category.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-3 h-full flex flex-col justify-start">
                          {category.reports.map((report) => {
                            const IconComponent = report.icon
                            return (
                              <div
                                key={report.id}
                                className="flex items-center gap-3 p-3 rounded-lg border-2 hover:border-gray-400 hover:shadow-md transition-all duration-200 cursor-pointer group bg-white"
                                onClick={() => handleSelectReport(report.id)}
                              >
                                <div
                                  className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
                                >
                                  <IconComponent className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{report.title}</h3>
                                  <p className="text-xs text-gray-600 line-clamp-1">{report.description}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {reportCategories.slice(3, 4).map((category) => (
                    <Card key={category.id} className="border-2 flex flex-col">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl font-bold text-gray-900">{category.title}</CardTitle>
                        <CardDescription className="text-sm text-gray-600">{category.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-3 h-full flex flex-col justify-start">
                          {category.reports.map((report) => {
                            const IconComponent = report.icon
                            return (
                              <div
                                key={report.id}
                                className="flex items-start gap-3 p-3 rounded-lg border-2 hover:border-gray-400 hover:shadow-md transition-all duration-200 cursor-pointer group bg-white"
                                onClick={() => handleSelectReport(report.id)}
                              >
                                <div
                                  className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
                                >
                                  <IconComponent className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{report.title}</h3>
                                  <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Segunda fila: Finanzas y Deportes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {reportCategories.slice(1, 3).map((category) => (
                  <Card key={category.id} className="border-2 flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-bold text-gray-900">{category.title}</CardTitle>
                      <CardDescription className="text-sm text-gray-600">{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3 h-full flex flex-col justify-start">
                        {category.reports.map((report) => {
                          const IconComponent = report.icon
                          return (
                            <div
                              key={report.id}
                              className="flex items-center gap-3 p-3 rounded-lg border-2 hover:border-gray-400 hover:shadow-md transition-all duration-200 cursor-pointer group bg-white"
                              onClick={() => handleSelectReport(report.id)}
                            >
                              <div
                                className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
                              >
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{report.title}</h3>
                                <p className="text-xs text-gray-600 line-clamp-1">{report.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
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
                                  <SelectItem value="1">Activo</SelectItem>
                                  <SelectItem value="0">Inactivo</SelectItem>
                                </>
                              )}
                              {selectedReport === "cuotas" && (
                                <>
                                  <SelectItem value="1">Pagadas</SelectItem>
                                  <SelectItem value="0">Pendientes</SelectItem>
                                </>
                              )}
                              {selectedReport === "torneos" && (
                                <>
                                  <SelectItem value="1">Activos</SelectItem>
                                  <SelectItem value="0">Finalizados</SelectItem>
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
                              {tiposMembresia.map((tipo) => (
                                <SelectItem key={tipo.IdTipo} value={tipo.IdTipo.toString()}>
                                  {tipo.Descripcion}
                                </SelectItem>
                              ))}
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
                              {deportes.map((deporte) => (
                                <SelectItem key={deporte.IdDeporte} value={deporte.IdDeporte?.toString() || ""}>
                                  {deporte.Nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Torneo */}
                      {selectedReportType.filters.includes("torneo") && (
                        <div className="space-y-2">
                          <Label>Torneo</Label>
                          <Select
                            value={filters.torneo}
                            onValueChange={(value) => setFilters({ ...filters, torneo: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todos los torneos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos los torneos</SelectItem>
                              {torneos.map((torneo) => (
                                <SelectItem key={torneo.IdTorneo} value={torneo.IdTorneo?.toString() || ""}>
                                  {torneo.Nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-center">
                      <Button onClick={handleGenerateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-8">
                        <BarChart3 className="mr-2 h-5 w-5" />
                        {loading ? "Generando..." : "Generar Reporte"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Vista Previa */}
                {showPreview && renderVistaPrevia()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="guardados">
            <Card>
              <CardHeader>
                <CardTitle>Reportes Guardados</CardTitle>
                <CardDescription>Lista de reportes que has guardado previamente</CardDescription>
              </CardHeader>
              <CardContent>
                {reportesGuardados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay reportes guardados aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportesGuardados.map((reporte) => (
                      <Card key={reporte.id} className="overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedReportId(expandedReportId === reporte.id ? null : reporte.id)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2">
                              {expandedReportId === reporte.id ? (
                                <Eye className="h-5 w-5 text-blue-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{reporte.nombre}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {reportTypes.find((r) => r.id === reporte.tipo)?.title}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(reporte.fechaCreacion), "dd/MM/yyyy HH:mm", { locale: es })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadSavedReport(reporte.id)
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteReport(reporte.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {expandedReportId === reporte.id && (
                          <div className="border-t bg-muted/30 p-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Filtros Aplicados:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {reporte.filtros.fechaInicio && reporte.filtros.fechaFin && (
                                    <Badge variant="secondary" className="text-xs">
                                      Período: {reporte.filtros.fechaInicio} - {reporte.filtros.fechaFin}
                                    </Badge>
                                  )}
                                  {reporte.filtros.estado && reporte.filtros.estado !== "todos" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Estado: {reporte.filtros.estado}
                                    </Badge>
                                  )}
                                  {reporte.filtros.tipoMembresia && reporte.filtros.tipoMembresia !== "todas" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Membresía: {reporte.filtros.tipoMembresia}
                                    </Badge>
                                  )}
                                  {reporte.filtros.deporte && reporte.filtros.deporte !== "todos" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Deporte: {reporte.filtros.deporte}
                                    </Badge>
                                  )}
                                  {reporte.filtros.torneo && reporte.filtros.torneo !== "todos" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Torneo: {reporte.filtros.torneo}
                                    </Badge>
                                  )}
                                  {!reporte.filtros.fechaInicio &&
                                    !reporte.filtros.estado &&
                                    !reporte.filtros.tipoMembresia &&
                                    !reporte.filtros.deporte &&
                                    !reporte.filtros.torneo && (
                                      <span className="text-sm text-muted-foreground">Sin filtros aplicados</span>
                                    )}
                                </div>
                              </div>

                              <div className="pt-2">
                                <iframe
                                  src={`/api/reportes/descargar/${reporte.id}?preview=true`}
                                  width="100%"
                                  height="600px"
                                  className="rounded-md border"
                                  title={`Vista previa de ${reporte.nombre}`}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog para guardar reporte */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Reporte</DialogTitle>
            <DialogDescription>Ingresa un nombre para identificar este reporte</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reportName">Nombre del Reporte</Label>
              <Input
                id="reportName"
                placeholder="Ej: Reporte Mensual Noviembre 2024"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveReport} className="bg-blue-600 hover:bg-blue-700">
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
