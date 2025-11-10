"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface HealthStatus {
  status: "healthy" | "unhealthy"
  database: "connected" | "disconnected"
  timestamp: string
  error?: string
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        })
        const data = await response.json()
        console.log("Database health check:", data)
        setStatus(data)
      } catch (error) {
        console.error("Health check failed:", error)
        setStatus({
          status: "unhealthy",
          database: "disconnected",
          timestamp: new Date().toISOString(),
          error: "Failed to fetch health status",
        })
      } finally {
        setLoading(false)
      }
    }

    checkHealth()

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Verificando estado de la base de datos...</AlertDescription>
      </Alert>
    )
  }

  if (!status) {
    return null
  }

  const isHealthy = status.status === "healthy"

  return (
    <Alert 
      key={status.timestamp}
      className={isHealthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isHealthy ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={isHealthy ? "text-green-800" : "text-red-800"}>
            Base de datos: {status.database === "connected" ? "Conectada" : "Desconectada"}
            {status.error && ` - ${status.error}`}
          </AlertDescription>
        </div>
        <Badge variant={isHealthy ? "default" : "destructive"}>
          {isHealthy ? "Operativo" : "Error"}
        </Badge>
      </div>
    </Alert>
  )
}
