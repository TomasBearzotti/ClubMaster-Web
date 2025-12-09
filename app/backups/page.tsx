"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Download,
  Upload,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  FileArchive,
  Info,
  ArrowLeft,
} from "lucide-react";

interface BackupHistoryItem {
  DatabaseName: string;
  BackupType: "FULL" | "DIFFERENTIAL" | "LOG";
  StartDate: string;
  FinishDate: string;
  DurationSeconds: number;
  SizeMB: number;
  CompressedSizeMB: number;
  FilePath: string;
  UserName: string;
}

interface LastBackup {
  BackupType: string;
  LastBackup: string;
  HoursSinceLast: number;
}

interface DatabaseInfo {
  DatabaseName: string;
  RecoveryModel: string;
  State: string;
  TotalSizeMB: number;
  TotalBackupSizeMB: number;
}

export default function BackupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [lastBackups, setLastBackups] = useState<LastBackup[]>([]);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [backupPath, setBackupPath] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("execute");

  useEffect(() => {
    // Obtener la ruta absoluta de la carpeta backups del proyecto
    const projectPath = process.cwd ? process.cwd() : "";
    setBackupPath(projectPath ? `${projectPath}\\backups` : ".\\backups");
    loadBackupInfo();
  }, []);
  
  // Refrescar cuando se cambia a la tab de historial
  useEffect(() => {
    if (activeTab === "history") {
      loadBackupInfo();
    }
  }, [activeTab]);

  const loadBackupInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/backups");
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
        setLastBackups(data.lastBackups);
        setDbInfo(data.databaseInfo);
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información de backups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeBackup = async (backupType: "FULL" | "DIFFERENTIAL" | "LOG") => {
    setIsExecuting(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupType,
          description: `Backup ${backupType} ejecutado desde panel web`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✓ Backup Exitoso",
          description: `Backup ${backupType} realizado correctamente: ${data.fileName}`,
        });
        loadBackupInfo(); // Recargar información
      } else {
        toast({
          title: "Error en Backup",
          description: data.message || data.details,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo ejecutar el backup",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const cleanLog = async () => {
    if (!confirm("¿Está seguro de limpiar el log de transacciones? Esta operación reducirá el tamaño del archivo de log.")) {
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch("/api/backups/limpiar-log", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✓ Log Limpiado",
          description: `Espacio recuperado: ${data.spaceRecoveredMB} MB`,
        });
        loadBackupInfo();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo limpiar el log",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case "FULL":
        return "bg-blue-500";
      case "DIFFERENTIAL":
        return "bg-yellow-500";
      case "LOG":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      const remainingHours = hours % 24;
      if (remainingHours > 0) {
        return `Hace ${days}d ${remainingHours}h`;
      }
      return `Hace ${days}d`;
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `Hace ${hours}h ${remainingMinutes}m`;
      }
      return `Hace ${hours}h`;
    } else if (minutes > 0) {
      return `Hace ${minutes}m`;
    } else {
      return "Hace menos de 1m";
    }
  };

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case "FULL":
        return <Database className="h-4 w-4" />;
      case "DIFFERENTIAL":
        return <FileArchive className="h-4 w-4" />;
      case "LOG":
        return <Clock className="h-4 w-4" />;
      default:
        return <HardDrive className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusColor = (hours: number) => {
    if (hours < 24) return "text-green-600";
    if (hours < 72) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Gestión de Backups
          </h1>
          <p className="text-muted-foreground mt-1">
            Resguardo y restauración de la base de datos ClubMaster
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadBackupInfo} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Información de la Base de Datos */}
      {dbInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Base de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbInfo.DatabaseName}</div>
              <Badge 
                variant="outline" 
                className={`mt-2 ${dbInfo.State === 'ONLINE' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}
              >
                {dbInfo.State}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Tamaño Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbInfo.TotalBackupSizeMB?.toFixed(2) ?? '0.00'} MB</div>
              <p className="text-xs text-muted-foreground mt-2">
                Carpeta completa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Modelo Recuperación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbInfo.RecoveryModel}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {dbInfo.RecoveryModel === "FULL" ? "Point-in-time recovery" : "Basic recovery"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Total Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{history.length}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Últimos 30 días
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado de Últimos Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Estado de Backups
          </CardTitle>
          <CardDescription>
            Información sobre los últimos backups realizados por tipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lastBackups.map((backup) => (
              <div
                key={backup.BackupType}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge className={getBackupTypeColor(backup.BackupType)}>
                    {backup.BackupType}
                  </Badge>
                  {backup.HoursSinceLast < 24 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Último backup:</p>
                  <p className="font-medium">{formatDate(backup.LastBackup)}</p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${getStatusColor(backup.HoursSinceLast)}`}>
                    {getTimeAgo(backup.LastBackup)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Operaciones */}
      <Tabs defaultValue="ejecutar" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ejecutar">Ejecutar Backup</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
        </TabsList>

        {/* Tab: Ejecutar Backup */}
        <TabsContent value="ejecutar" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p>
                  <strong>Ubicación de Backups:</strong> Los archivos se guardarán en la carpeta del proyecto.
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    value={backupPath || "./backups"}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="La carpeta de backups está en el proyecto"
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Carpeta del Proyecto
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ✓ Los backups se guardan en <code className="bg-muted px-1 rounded">./backups</code> dentro del proyecto (ignorados por Git)
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  Backup FULL
                </CardTitle>
                <CardDescription>
                  Backup completo de toda la base de datos. Recomendado: Diario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
                  <li>• Copia completa de datos</li>
                  <li>• Base para restauración</li>
                  <li>• Mayor tamaño</li>
                  <li>• Mayor tiempo</li>
                </ul>
                <Button
                  onClick={() => executeBackup("FULL")}
                  disabled={isExecuting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ejecutar FULL
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileArchive className="h-5 w-5 text-yellow-500" />
                  Backup DIFFERENTIAL
                </CardTitle>
                <CardDescription>
                  Solo cambios desde último FULL. Recomendado: Cada 6 horas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
                  <li>• Solo cambios</li>
                  <li>• Requiere FULL previo</li>
                  <li>• Tamaño reducido</li>
                  <li>• Más rápido</li>
                </ul>
                <Button
                  onClick={() => executeBackup("DIFFERENTIAL")}
                  disabled={isExecuting}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ejecutar DIFFERENTIAL
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  Backup LOG
                </CardTitle>
                <CardDescription>
                  Log de transacciones. Recomendado: Cada 1 hora
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
                  <li>• Solo transacciones</li>
                  <li>• Point-in-time recovery</li>
                  <li>• Muy pequeño</li>
                  <li>• Requiere FULL mode</li>
                </ul>
                <Button
                  onClick={() => executeBackup("LOG")}
                  disabled={isExecuting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ejecutar LOG
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Backups (Últimos 30 días)</CardTitle>
              <CardDescription>
                Mostrando los {history.length} backups más recientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getBackupTypeIcon(item.BackupType)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getBackupTypeColor(item.BackupType)}>
                            {item.BackupType}
                          </Badge>
                          <span className="text-sm font-medium">
                            {formatDate(item.FinishDate)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {item.FilePath}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium">
                        {item.CompressedSizeMB.toFixed(2)} MB
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getTimeAgo(item.FinishDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mantenimiento */}
        <TabsContent value="mantenimiento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Modo de Recuperación
              </CardTitle>
              <CardDescription>
                Cambiar entre modo SIMPLE y FULL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
                <div>
                  <p className="font-medium">Modo actual:</p>
                  <p className="text-2xl font-bold">{dbInfo?.RecoveryModel || "SIMPLE"}</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {dbInfo?.RecoveryModel === "FULL" ? "Recuperación Completa" : "Recuperación Simple"}
                </Badge>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {dbInfo?.RecoveryModel === "SIMPLE" ? (
                    <>
                      <strong>Modo SIMPLE:</strong> El log se limpia automáticamente. Solo podés restaurar hasta el último backup completo o diferencial.
                      <p className="mt-2">
                        <strong>Cambiar a FULL:</strong> Permite backups de LOG y recuperación point-in-time (a cualquier momento específico).
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Modo FULL:</strong> Permite recuperación a cualquier punto en el tiempo. Requiere backups de LOG frecuentes.
                      <p className="mt-2">
                        <strong>Cambiar a SIMPLE:</strong> El log se limpiará automáticamente, pero perderás la capacidad de recuperación point-in-time.
                      </p>
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <Button
                onClick={async () => {
                  const newMode = dbInfo?.RecoveryModel === "SIMPLE" ? "FULL" : "SIMPLE";
                  setIsExecuting(true);
                  try {
                    const response = await fetch("/api/backups/recovery-model", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ mode: newMode }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      toast({
                        title: "Éxito",
                        description: `Modo de recuperación cambiado a ${newMode}`,
                      });
                      loadBackupInfo();
                    } else {
                      toast({
                        title: "Error",
                        description: data.message,
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "No se pudo cambiar el modo de recuperación",
                      variant: "destructive",
                    });
                  } finally {
                    setIsExecuting(false);
                  }
                }}
                disabled={isExecuting}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Cambiar a {dbInfo?.RecoveryModel === "SIMPLE" ? "FULL" : "SIMPLE"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Limpieza de Log
              </CardTitle>
              <CardDescription>
                Reduce el tamaño del archivo de log de transacciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Advertencia:</strong> Esta operación cambiará temporalmente el modelo de recuperación
                  a SIMPLE, reducirá el log y volverá a FULL. Solo usar cuando el log crezca excesivamente.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Cambia a modo SIMPLE recovery
                </p>
                <p className="text-sm text-muted-foreground">
                  • Reduce el log a 10 MB
                </p>
                <p className="text-sm text-muted-foreground">
                  • Restaura a modo FULL recovery
                </p>
              </div>

              <Button
                onClick={cleanLog}
                disabled={isExecuting}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Log de Transacciones
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restauración
              </CardTitle>
              <CardDescription>
                Scripts de restauración disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para restaurar la base de datos, ejecute los scripts SQL ubicados en:
                  <code className="block mt-2 p-2 bg-muted rounded text-xs">
                    /scripts/backup/05_RestaurarCompleto.sql<br />
                    /scripts/backup/06_RestaurarDiferencial.sql<br />
                    /scripts/backup/07_RestaurarPointInTime.sql
                  </code>
                  <p className="mt-2 text-sm">
                    La restauración desde la interfaz web no está disponible por seguridad.
                    Use SQL Server Management Studio (SSMS) para restaurar.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
