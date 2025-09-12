"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Edit,
  Trash2,
  UserCog,
  Shield,
  User,
  DollarSign,
  Trophy,
  Check,
  Ban,
} from "lucide-react";

// 🔹 Badge por rol
const getRoleBadge = (role: string) => {
  switch (role) {
    case "Administrador General":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <Shield className="w-3 h-3 mr-1" /> {role}
        </Badge>
      );
    case "Socio":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <User className="w-3 h-3 mr-1" /> {role}
        </Badge>
      );
    case "Árbitro":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <UserCog className="w-3 h-3 mr-1" /> {role}
        </Badge>
      );
    case "Tesorero":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <DollarSign className="w-3 h-3 mr-1" /> {role}
        </Badge>
      );
    case "Responsable de Deportes":
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          <Trophy className="w-3 h-3 mr-1" /> {role}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
};

type CreatePersonaResponse = {
  idPersona?: number;
  IdPersona?: number;
  id?: number;
  insertedId?: number;
  success?: boolean;
  message?: string;
};

export async function createPersona(
  nombre: string,
  apellido: string,
  dni: string,
  telefono: string,
  mail: string
): Promise<number> {
  const res = await fetch("/api/seguridad/persona", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, apellido, dni, telefono, mail }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`No se pudo crear la persona. ${txt}`);
  }
  const data: CreatePersonaResponse = await res.json();
  const idPersona =
    data.idPersona ?? data.IdPersona ?? data.id ?? data.insertedId;
  if (!idPersona) throw new Error("La API no devolvió IdPersona");
  return idPersona;
}

type CreateUsuarioResponse = {
  success?: boolean;
  idUsuario?: number;
  IdUsuario?: number;
  message?: string;
};

export async function createUsuario(
  email: string,
  password: string,
  idRol: number | null,
  idPersona: number,
  estado: number = 1 // 1 = Activo
): Promise<CreateUsuarioResponse> {
  const res = await fetch("/api/seguridad/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, idRol, idPersona, estado }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`No se pudo crear el usuario. ${txt}`);
  }
  return await res.json();
}

export default function UsuariosPage() {
  const router = useRouter();
  const [searchUser, setSearchUser] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [editingRol, setEditingRol] = useState<any | null>(null);
  const [deletingRol, setDeletingRol] = useState<any | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [addingRol, setAddingRol] = useState(false);
  const [searchPermiso, setSearchPermiso] = useState("");
  const [editingPermiso, setEditingPermiso] = useState<any | null>(null);
  const [deletingPermiso, setDeletingPermiso] = useState<any | null>(null);
  const [addingPermiso, setAddingPermiso] = useState(false);
  const [permisosDisponibles, setPermisosDisponibles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [newRol, setNewRol] = useState({
    nombre: "",
    descripcion: "",
    permisos: [] as number[],
  });

  useEffect(() => {
    fetchPermisos();
    fetchRoles();
    fetchUsuarios();
  }, []);

  // Usuarios
  const fetchUsuarios = async () => {
    try {
      const res = await fetch("/api/seguridad/usuarios", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al obtener usuarios");
      const data = await res.json();
      setUsuarios(
        data.map((u: any) => ({
          id: u.id,
          email: u.email,
          estadoUsuario: u.estadoUsuario,
          idPersona: u.idPersona,
          persona: u.persona,
          roles: u.roles || [],
        }))
      );
    } catch (err) {
      console.error("❌ Error fetchUsuarios:", err);
      setUsuarios([]);
    }
  };

  const updateUsuario = async (
    id: number,
    email: string,
    idRol: number | null
  ) => {
    const res = await fetch("/api/seguridad/usuarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, email, idRol }),
    });
    return await res.json();
  };

  const toggleEstadoUsuario = async (
    id: number,
    estado: number,
    idPersona: number | null
  ) => {
    const res = await fetch("/api/seguridad/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado, idPersona }), // 👈 agregar idPersona
    });
    return await res.json();
  };

  const deleteUsuario = async (id: number) => {
    const res = await fetch("/api/seguridad/usuarios", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  };

  // Roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/seguridad/roles", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al obtener roles");
      const data = await res.json();

      setRoles(
        data.map((r: any) => ({
          id: r.IdRol ?? r.id,
          nombre: r.Nombre ?? r.nombre,
          descripcion: r.Descripcion ?? r.descripcion,
          estadoRol:
            r.EstadoRol !== undefined
              ? r.EstadoRol
              : r.estadoRol !== undefined
              ? r.estadoRol
              : 0, // default inactivo si por alguna razón no llega
          permisos: (r.Permisos ?? r.permisos ?? []).map((p: any) => ({
            idPermiso: p.IdPermiso ?? p.idPermiso ?? p.id,
            nombre: p.PermisoNombre ?? p.nombre,
            descripcion: p.PermisoDescripcion ?? p.descripcion,
          })),
        }))
      );
    } catch (err) {
      console.error("❌ Error getRoles:", err);
      setRoles([]);
    }
  };

  const createRol = async (
    nombre: string,
    descripcion: string,
    permisos: number[] = []
  ) => {
    try {
      const res = await fetch("/api/seguridad/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, permisos }),
      });
      if (!res.ok) throw new Error("Error al crear rol");
      return await res.json();
    } catch (err) {
      console.error("❌ Error createRol:", err);
      return null;
    }
  };

  const updateRol = async (
    id: number,
    nombre: string,
    descripcion: string,
    permisos: number[]
  ) => {
    try {
      const res = await fetch("/api/seguridad/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nombre, descripcion, permisos }),
      });
      if (!res.ok) throw new Error("Error al actualizar rol");
      return await res.json();
    } catch (err) {
      console.error("❌ Error updateRol:", err);
      return null;
    }
  };

  const toggleEstadoRol = async (id: number, estado: number) => {
    try {
      const res = await fetch("/api/seguridad/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado del rol");
      return await res.json();
    } catch (err) {
      console.error("❌ Error toggleEstadoRol:", err);
      return null;
    }
  };

  const deleteRol = async (id: number) => {
    try {
      const res = await fetch("/api/seguridad/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Error al dar de baja rol");
      return await res.json();
    } catch (err) {
      console.error("❌ Error deleteRol:", err);
      return null;
    }
  };

  const togglePermiso = (
    permisoId: number,
    context: "roles" | "editingRol" | "newRol",
    rolId?: number
  ) => {
    if (context === "roles" && rolId) {
      // 🔹 Modifica directamente en roles (no recomendado para edición en modal)
      setRoles((prev) =>
        prev.map((r) =>
          r.id === rolId
            ? {
                ...r,
                permisos: r.permisos.some((p: any) => p.idPermiso === permisoId)
                  ? r.permisos.filter((p: any) => p.idPermiso !== permisoId)
                  : [...r.permisos, { idPermiso: permisoId }],
              }
            : r
        )
      );
    }

    if (context === "editingRol") {
      // 🔹 Edición local en modal Editar Rol
      setEditingRol((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          permisos: prev.permisos.some(
            (p: any) => p.idPermiso === permisoId || p.id === permisoId
          )
            ? prev.permisos.filter(
                (p: any) => !(p.idPermiso === permisoId || p.id === permisoId)
              )
            : [...prev.permisos, { idPermiso: permisoId }],
        };
      });
    }

    if (context === "newRol") {
      // 🔹 Edición local en modal Crear Rol
      setNewRol((prev) => ({
        ...prev,
        permisos: prev.permisos.includes(permisoId)
          ? prev.permisos.filter((p) => p !== permisoId)
          : [...prev.permisos, permisoId],
      }));
    }
  };

  // Permisos
  const fetchPermisos = async () => {
    try {
      const res = await fetch("/api/seguridad/permisos");
      if (!res.ok) throw new Error("Error al obtener permisos");
      const data = await res.json();
      // Normalizamos al mismo formato que usabas en hardcodeado
      const mapped = data.map((p: any) => ({
        id: p.Nombre,
        descripcion: p.Descripcion,
        idPermiso: p.IdPermiso,
      }));
      setPermisosDisponibles(mapped);
    } catch (error) {
      console.error("❌ Error cargando permisos:", error);
    }
  };

  const createPermiso = async (nombre: string, descripcion: string) => {
    try {
      const res = await fetch("/api/seguridad/permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion }),
      });
      if (!res.ok) throw new Error("Error al crear permiso");
      await fetchPermisos(); // refrescar lista
    } catch (err) {
      console.error("❌ Error creando permiso:", err);
    }
  };

  const updatePermiso = async (
    id: number,
    nombre: string,
    descripcion: string
  ) => {
    try {
      const res = await fetch("/api/seguridad/permisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nombre, descripcion }),
      });
      if (!res.ok) throw new Error("Error al actualizar permiso");
      await fetchPermisos();
    } catch (err) {
      console.error("❌ Error actualizando permiso:", err);
    }
  };

  const deletePermiso = async (id: number) => {
    try {
      const res = await fetch("/api/seguridad/permisos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Error al eliminar permiso");
      await fetchPermisos();
    } catch (err) {
      console.error("❌ Error eliminando permiso:", err);
    }
  };

  const handleVolver = () => router.push("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            <Button variant="outline" onClick={handleVolver}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <UserCog className="h-8 w-8 text-blue-600" /> Gestión de Usuarios y
          Roles
        </h2>
        <Tabs defaultValue="usuarios">
          <TabsList className="mb-6">
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permisos">Permisos</TabsTrigger>
          </TabsList>
          {/* Usuarios */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  {/* Izquierda */}
                  <div>
                    <CardTitle>Usuarios</CardTitle>
                    <CardDescription className="mt-1">
                      Listado de usuarios del sistema
                    </CardDescription>
                  </div>

                  {/* Derecha: buscador arriba, botón abajo */}
                  <div className="flex flex-col gap-2 items-end">
                    <Input
                      placeholder="Buscar usuario..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="w-64"
                    />
                    <Button
                      onClick={() => setAddingUser(true)}
                      className="bg-blue-600 hover:bg-blue-700 w-64"
                    >
                      <UserPlus className="h-5 w-5 mr-2" /> Agregar Usuario
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios
                      .filter((u) =>
                        u.email.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      .map((u) => (
                        <>
                          {/* Fila principal */}
                          <>
                            {/* Fila principal */}
                            <TableRow key={u.id}>
                              <TableCell>{u.email}</TableCell>
                              <TableCell className="flex gap-1 flex-wrap">
                                {u.roles.map((r: any, i: number) => (
                                  <div key={i}>{getRoleBadge(r.nombre)}</div>
                                ))}
                              </TableCell>
                              <TableCell>
                                {/* ADMIN GENERAL: siempre bloqueado */}
                                {u.roles.some(
                                  (r: any) =>
                                    r.nombre === "Administrador General"
                                ) ? (
                                  <div
                                    className="flex items-center text-gray-400 cursor-not-allowed"
                                    title="No se puede cambiar el estado del Administrador General"
                                  >
                                    <Switch
                                      checked={u.estadoUsuario === 1}
                                      disabled
                                    />
                                    <span className="ml-2">
                                      {u.estadoUsuario === 1
                                        ? "Activo"
                                        : u.estadoUsuario === 2
                                        ? "Pendiente"
                                        : "Inactivo"}
                                    </span>
                                  </div>
                                ) : u.estadoUsuario === 2 ? (
                                  // 🔸 MODO PENDIENTE: reemplaza el switch por aprobar / rechazar
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      title="Aprobar (activar)"
                                      onClick={async () => {
                                        await toggleEstadoUsuario(
                                          u.id,
                                          1,
                                          u.idPersona ?? null
                                        );
                                        setUsuarios((prev) =>
                                          prev.map((user) =>
                                            user.id === u.id
                                              ? { ...user, estadoUsuario: 1 }
                                              : user
                                          )
                                        );
                                      }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      title="Rechazar (inactivar)"
                                      onClick={async () => {
                                        await toggleEstadoUsuario(
                                          u.id,
                                          0,
                                          u.idPersona ?? null
                                        );
                                        setUsuarios((prev) =>
                                          prev.map((user) =>
                                            user.id === u.id
                                              ? { ...user, estadoUsuario: 0 }
                                              : user
                                          )
                                        );
                                      }}
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                    <span className="ml-2 text-amber-600 font-medium">
                                      Pendiente
                                    </span>
                                  </div>
                                ) : (
                                  // 🔹 MODO NORMAL: switch Activo / Inactivo
                                  <div className="flex items-center">
                                    <Switch
                                      checked={u.estadoUsuario === 1}
                                      onCheckedChange={async (checked) => {
                                        const newEstado = checked ? 1 : 0;
                                        await toggleEstadoUsuario(
                                          u.id,
                                          newEstado,
                                          u.idPersona ?? null
                                        );
                                        setUsuarios((prev) =>
                                          prev.map((user) =>
                                            user.id === u.id
                                              ? {
                                                  ...user,
                                                  estadoUsuario: newEstado,
                                                }
                                              : user
                                          )
                                        );
                                      }}
                                    />
                                    <span className="ml-2">
                                      {u.estadoUsuario === 1
                                        ? "Activo"
                                        : "Inactivo"}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setExpandedUser(
                                      expandedUser === u.id ? null : u.id
                                    )
                                  }
                                >
                                  {expandedUser === u.id ? "▲" : "▼"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingUser(u)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {!u.roles.some(
                                  (r: any) =>
                                    r.nombre === "Administrador General"
                                ) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingUser(u)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Fila expandida */}
                            {expandedUser === u.id && (
                              <TableRow className="bg-gray-50 text-sm text-gray-700">
                                {/* Columna Email → Datos de persona */}
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {u.persona ? (
                                      <>
                                        <span>
                                          <b>Nombre:</b> {u.persona.nombre}{" "}
                                          {u.persona.apellido || ""}
                                        </span>
                                        <span>
                                          <b>DNI:</b> {u.persona.dni || "—"}
                                        </span>
                                        <span>
                                          <b>Teléfono:</b>{" "}
                                          {u.persona.telefono || "—"}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">
                                        Sin persona asociada
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                {/* Columna Roles → Permisos */}
                                <TableCell>
                                  {u.roles[0]?.permisos?.length > 0 ? (
                                    <ul className="list-disc pl-4">
                                      {u.roles[0].permisos.map((perm: any) => (
                                        <li key={perm.idPermiso}>
                                          {perm.nombre} – {perm.descripcion}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-gray-400">
                                      Sin permisos
                                    </span>
                                  )}
                                </TableCell>
                                {/* Columna Estado vacía */}
                                <TableCell />
                                {/* Columna Acciones vacía */}
                                <TableCell />
                              </TableRow>
                            )}
                          </>
                        </>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Roles */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  {/* Izquierda */}
                  <div>
                    <CardTitle>Roles</CardTitle>
                    <CardDescription className="mt-1">
                      Listado de roles y permisos asociados
                    </CardDescription>
                  </div>

                  {/* Derecha: buscador arriba, botón abajo */}
                  <div className="flex flex-col gap-2 items-end">
                    <Input
                      placeholder="Buscar rol..."
                      value={searchRole}
                      onChange={(e) => setSearchRole(e.target.value)}
                      className="w-64"
                    />
                    <Button
                      onClick={() => setAddingRol(true)}
                      className="bg-blue-600 hover:bg-blue-700 w-64"
                    >
                      <UserPlus className="h-5 w-5 mr-2" /> Agregar Rol
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles
                      .filter(
                        (r) =>
                          r.nombre
                            .toLowerCase()
                            .includes(searchRole.toLowerCase()) ||
                          r.descripcion
                            .toLowerCase()
                            .includes(searchRole.toLowerCase())
                      )
                      .map((r) => (
                        <TableRow key={r.id}>
                          {/* Nombre con badge */}
                          <TableCell>{getRoleBadge(r.nombre)}</TableCell>

                          {/* Descripción */}
                          <TableCell>{r.descripcion}</TableCell>

                          {/* Permisos */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(r.permisos) &&
                              r.permisos.length > 0 ? (
                                r.permisos.map((p: any, idx: number) => {
                                  const key =
                                    p?.id ?? p?.IdPermiso ?? `${r.id}-${idx}`;
                                  const label =
                                    p?.nombre ??
                                    p?.PermisoNombre ??
                                    (typeof p === "string" ? p : "—");
                                  return (
                                    <Badge key={key} variant="secondary">
                                      {label}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Sin permisos
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {/* Estado con switch */}
                          <TableCell>
                            {r.nombre === "Administrador General" ? (
                              <div
                                className="flex items-center text-gray-400 cursor-not-allowed"
                                title="No se puede modificar el estado del Administrador General"
                              >
                                <Switch checked disabled />
                                <span className="ml-2">Activo</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Switch
                                  checked={r.estadoRol === 1}
                                  onCheckedChange={async (checked) => {
                                    const newEstado = checked ? 1 : 0;
                                    await toggleEstadoRol(r.id, newEstado);
                                    setRoles((prev) =>
                                      prev.map((role) =>
                                        role.id === r.id
                                          ? { ...role, estadoRol: newEstado }
                                          : role
                                      )
                                    );
                                  }}
                                />
                                <span className="ml-2">
                                  {r.estadoRol === 1 ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          {/* Acciones */}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingRol(r)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRol(r)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Permisos */}
          <TabsContent value="permisos">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  {/* Izquierda */}
                  <div>
                    <CardTitle>Permisos</CardTitle>
                    <CardDescription className="mt-1">
                      Listado de permisos disponibles
                    </CardDescription>
                  </div>

                  {/* Derecha: buscador + botón */}
                  <div className="flex flex-col gap-2 items-end">
                    <Input
                      placeholder="Buscar permiso..."
                      value={searchPermiso}
                      onChange={(e) => setSearchPermiso(e.target.value)}
                      className="w-64"
                    />
                    <Button
                      onClick={() => setAddingPermiso(true)}
                      className="bg-blue-600 hover:bg-blue-700 w-64"
                    >
                      <UserPlus className="h-5 w-5 mr-2" /> Agregar Permiso
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permiso</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permisosDisponibles
                      .filter(
                        (p) =>
                          p.id
                            .toLowerCase()
                            .includes(searchPermiso.toLowerCase()) ||
                          p.descripcion
                            .toLowerCase()
                            .includes(searchPermiso.toLowerCase())
                      )
                      .map((p) => (
                        <TableRow key={p.idPermiso}>
                          <TableCell>{p.id}</TableCell>
                          <TableCell>{p.descripcion}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPermiso(p)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingPermiso(p)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Crear Usuario */}
        {addingUser && (
          <Dialog open={true} onOpenChange={() => setAddingUser(false)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Agregar Usuario</DialogTitle>
                <DialogDescription>
                  Crea la persona y el usuario en un mismo paso. El usuario
                  quedará activo.
                </DialogDescription>
              </DialogHeader>
              {/* Estado local del formulario */}
              <FormAgregarUsuario
                roles={roles}
                onCancel={() => setAddingUser(false)}
                onSuccess={async () => {
                  await fetchUsuarios();
                  setAddingUser(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
        {/* Modal Editar Usuario */}
        {editingUser && (
          <Dialog open={true} onOpenChange={() => setEditingUser(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                {/* Email */}
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                  />
                </div>
                {/* Rol único (radio) */}
                <div>
                  <Label>Rol</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {roles.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="editarUsuarioRol"
                          value={r.id}
                          checked={editingUser.roles?.[0]?.idRol === r.id}
                          onChange={() =>
                            setEditingUser({
                              ...editingUser,
                              roles: [{ idRol: r.id, nombre: r.nombre }],
                            })
                          }
                        />
                        {r.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              </form>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const idRol = editingUser.roles?.[0]?.idRol ?? null;
                    await updateUsuario(
                      editingUser.id,
                      editingUser.email,
                      idRol
                    );
                    await fetchUsuarios();
                    setEditingUser(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Modal Eliminar Usuario */}
        {deletingUser && (
          <Dialog open={true} onOpenChange={() => setDeletingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminar Usuario</DialogTitle>
                <DialogDescription>
                  ¿Seguro que quieres dar de baja este usuario?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteUsuario(deletingUser.id);
                    await fetchUsuarios();
                    setDeletingUser(null);
                  }}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Crear Rol */}
        {addingRol && (
          <Dialog open={true} onOpenChange={() => setAddingRol(false)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Agregar Rol</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                {/* Nombre */}
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={newRol.nombre}
                    onChange={(e) =>
                      setNewRol({ ...newRol, nombre: e.target.value })
                    }
                    placeholder="Nombre del rol"
                  />
                </div>
                {/* Descripción */}
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={newRol.descripcion}
                    onChange={(e) =>
                      setNewRol({ ...newRol, descripcion: e.target.value })
                    }
                    placeholder="Descripción del rol"
                  />
                </div>
                {/* Lista de permisos con scroll */}
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {permisosDisponibles.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={newRol.permisos.includes(
                          perm.idPermiso ?? perm.id
                        )}
                        onChange={() =>
                          togglePermiso(perm.idPermiso ?? perm.id, "newRol")
                        }
                      />
                      {perm.id}
                    </label>
                  ))}
                </div>
              </form>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    await createRol(
                      newRol.nombre,
                      newRol.descripcion,
                      newRol.permisos
                    );
                    await fetchRoles();
                    setNewRol({ nombre: "", descripcion: "", permisos: [] }); // reset
                    setAddingRol(false); // cerrar modal
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Agregar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Modal Editar Rol */}
        {editingRol && (
          <Dialog open={true} onOpenChange={() => setEditingRol(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Rol</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                {/* Nombre */}
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editingRol.nombre}
                    onChange={(e) =>
                      setEditingRol({ ...editingRol, nombre: e.target.value })
                    }
                  />
                </div>
                {/* Descripción */}
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={editingRol.descripcion}
                    onChange={(e) =>
                      setEditingRol({
                        ...editingRol,
                        descripcion: e.target.value,
                      })
                    }
                  />
                </div>
                {/* Lista de permisos con scroll */}
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {permisosDisponibles.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={editingRol.permisos.some(
                          (p: any) =>
                            p.idPermiso === (perm.idPermiso ?? perm.id) ||
                            p.id === (perm.idPermiso ?? perm.id)
                        )}
                        onChange={() =>
                          togglePermiso(perm.idPermiso ?? perm.id, "editingRol")
                        }
                      />
                      {perm.id}
                    </label>
                  ))}
                </div>
              </form>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const permisosIds = editingRol.permisos.map(
                      (p: any) => p.idPermiso ?? p.id
                    );
                    await updateRol(
                      editingRol.id,
                      editingRol.nombre,
                      editingRol.descripcion,
                      permisosIds
                    );
                    await fetchRoles(); // refrescar lista
                    setEditingRol(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Modal Eliminar Rol */}
        {deletingRol && (
          <Dialog open={true} onOpenChange={() => setDeletingRol(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminar Rol</DialogTitle>
                <DialogDescription>
                  ¿Seguro que quieres dar de baja este rol?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteRol(deletingRol.id);
                    await fetchRoles(); // refrescar lista
                    setDeletingRol(null);
                  }}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Agregar Permiso */}
        {addingPermiso && (
          <Dialog open={true} onOpenChange={() => setAddingPermiso(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Permiso</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    id="nuevoNombre"
                    placeholder="Identificador del permiso"
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    id="nuevoDescripcion"
                    placeholder="Descripción del permiso"
                  />
                </div>
              </form>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const nombre = (
                      document.getElementById("nuevoNombre") as HTMLInputElement
                    ).value;
                    const descripcion = (
                      document.getElementById(
                        "nuevoDescripcion"
                      ) as HTMLInputElement
                    ).value;
                    await createPermiso(nombre, descripcion);
                    setAddingPermiso(false);
                  }}
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Modal Editar Permiso */}
        {editingPermiso && (
          <Dialog open={true} onOpenChange={() => setEditingPermiso(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Permiso</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editingPermiso.id}
                    onChange={(e) =>
                      setEditingPermiso({
                        ...editingPermiso,
                        id: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={editingPermiso.descripcion}
                    onChange={(e) =>
                      setEditingPermiso({
                        ...editingPermiso,
                        descripcion: e.target.value,
                      })
                    }
                  />
                </div>
              </form>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    await updatePermiso(
                      editingPermiso.idPermiso,
                      editingPermiso.id,
                      editingPermiso.descripcion
                    );
                    setEditingPermiso(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Modal Eliminar Permiso */}
        {deletingPermiso && (
          <Dialog open={true} onOpenChange={() => setDeletingPermiso(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminar Permiso</DialogTitle>
                <DialogDescription>
                  ¿Seguro que quieres eliminar este permiso? Si está asociado a
                  un rol, se quitará primero de ese rol.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deletePermiso(deletingPermiso.idPermiso);
                    setDeletingPermiso(null);
                  }}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}

function FormAgregarUsuario({
  roles,
  onCancel,
  onSuccess,
}: {
  roles: any[];
  onCancel: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    email: "",
    password: "",
    confirmPassword: "",
    idRol: null as number | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setField = (k: string, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es requerido";
    if (!form.apellido.trim()) e.apellido = "El apellido es requerido";
    if (!form.dni.trim()) e.dni = "El DNI es requerido";
    if (!form.email.trim()) e.email = "El email es requerido";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email no válido";
    if (!form.password) e.password = "La contraseña es requerida";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden";
    if (!form.idRol) e.idRol = "Debe seleccionar un rol";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);

      // 1) Crear persona
      const idPersona = await createPersona(
        form.nombre.trim(),
        form.apellido.trim(),
        form.dni.trim(),
        form.telefono.trim(),
        form.email.trim() // usamos el mismo mail
      );

      // 2) Crear usuario ACTIVO ligado a esa persona
      await createUsuario(
        form.email.trim(),
        form.password,
        form.idRol,
        idPersona,
        1 // Activo
      );

      await onSuccess();
    } catch (err: any) {
      console.error("❌ Error creando persona/usuario:", err);
      alert(err?.message ?? "Error al crear persona/usuario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Persona */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nombre</Label>
          <Input
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            className={errors.nombre ? "border-red-500" : ""}
            placeholder="Nombre"
          />
          {errors.nombre && (
            <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>
          )}
        </div>
        <div>
          <Label>Apellido</Label>
          <Input
            value={form.apellido}
            onChange={(e) => setField("apellido", e.target.value)}
            className={errors.apellido ? "border-red-500" : ""}
            placeholder="Apellido"
          />
          {errors.apellido && (
            <p className="text-xs text-red-500 mt-1">{errors.apellido}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>DNI</Label>
          <Input
            value={form.dni}
            onChange={(e) => setField("dni", e.target.value)}
            className={errors.dni ? "border-red-500" : ""}
            placeholder="12345678"
          />
          {errors.dni && (
            <p className="text-xs text-red-500 mt-1">{errors.dni}</p>
          )}
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input
            value={form.telefono}
            onChange={(e) => setField("telefono", e.target.value)}
            placeholder="+54 9 ..."
          />
        </div>
      </div>

      {/* Usuario */}
      <div>
        <Label>Email (Usuario)</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          className={errors.email ? "border-red-500" : ""}
          placeholder="usuario@email.com"
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contraseña</Label>
          <div className="relative">
            <Input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
              onClick={() => setShowPass((s) => !s)}
            >
              {showPass ? "Ocultar" : "Ver"}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password}</p>
          )}
        </div>
        <div>
          <Label>Confirmar contraseña</Label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              className={
                errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"
              }
              placeholder="Repite la contraseña"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
              onClick={() => setShowConfirm((s) => !s)}
            >
              {showConfirm ? "Ocultar" : "Ver"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      {/* Rol (como en tu modal original, radios de roles) */}
      <div>
        <Label>Rol</Label>
        <div
          className={`max-h-48 overflow-y-auto border rounded-md p-3 space-y-2 ${
            errors.idRol ? "border-red-500" : ""
          }`}
        >
          {roles.map((r: any) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="nuevoUsuarioRol"
                value={r.id}
                checked={form.idRol === r.id}
                onChange={() => setField("idRol", r.id)}
              />
              {r.nombre}
            </label>
          ))}
        </div>
        {errors.idRol && (
          <p className="text-xs text-red-500 mt-1">{errors.idRol}</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? "Creando..." : "Crear"}
        </Button>
      </DialogFooter>
    </div>
  );
}
