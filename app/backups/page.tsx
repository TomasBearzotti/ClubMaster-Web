"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
}

export default function BackupsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [lastBackups, setLastBackups] = useState<LastBackup[]>([]);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    loadBackupInfo();
  }, []);

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
        <Button onClick={loadBackupInfo} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
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
              <Badge variant="outline" className="mt-2">
                {dbInfo.State}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Tamaño Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbInfo.TotalSizeMB?.toFixed(2) ?? '0.00'} MB</div>
              <p className="text-xs text-muted-foreground mt-2">
                Datos + Log
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
                    Hace {backup.HoursSinceLast} horas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Operaciones */}
      <Tabs defaultValue="ejecutar" className="w-full">
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
              Seleccione el tipo de backup a realizar. Los archivos se guardarán en C:\Backups\ClubMaster\
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
                        {item.DurationSeconds}s
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
