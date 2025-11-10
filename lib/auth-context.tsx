"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface User {
  id: number;
  email: string;
  nombreCompleto: string;
  nombreUsuario: string;
  rol: string;
  tipoUsuario: string;
  persona: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email: string;
  };
  socioId?: number;
  administradorId?: number;
  arbitroId?: number;
}

interface AuthContextType {
  users: User[];
  currentUser: User | null;
  addUser: (user: User) => void;
  removeUser: (userId: number) => void;
  switchUser: (userId: number) => void;
  logout: () => void;
  logoutAll: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Cargar usuarios del localStorage al inicializar
  useEffect(() => {
    const savedUsers = localStorage.getItem("clubmaster-users");
    const savedCurrentUserId = localStorage.getItem("clubmaster-current-user");

    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers);
        setUsers(parsedUsers);

        if (savedCurrentUserId) {
          const currentUserId = Number.parseInt(savedCurrentUserId);
          const foundUser = parsedUsers.find(
            (user: User) => user.id === currentUserId
          );
          if (foundUser) {
            setCurrentUser(foundUser);
          }
        }
      } catch (error) {
        console.error("Error loading saved users:", error);
        localStorage.removeItem("clubmaster-users");
        localStorage.removeItem("clubmaster-current-user");
      }
    }
  }, []);

  // Guardar usuarios en localStorage cuando cambien
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem("clubmaster-users", JSON.stringify(users));
    } else {
      localStorage.removeItem("clubmaster-users");
    }
  }, [users]);

  // Guardar usuario actual en localStorage cuando cambie
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        "clubmaster-current-user",
        currentUser.id.toString()
      );
    } else {
      localStorage.removeItem("clubmaster-current-user");
    }
  }, [currentUser]);

  const addUser = (user: User) => {
    setUsers((prev) => {
      // Verificar si el usuario ya existe
      const existingUserIndex = prev.findIndex((u) => u.id === user.id);
      if (existingUserIndex >= 0) {
        // Actualizar usuario existente
        const updated = [...prev];
        updated[existingUserIndex] = user;
        setCurrentUser(user);
        return updated;
      } else {
        // Agregar nuevo usuario
        setCurrentUser(user);
        return [...prev, user];
      }
    });
  };

  const removeUser = (userId: number) => {
    setUsers((prev) => {
      const filtered = prev.filter((user) => user.id !== userId);
      // Si el usuario removido era el actual, cambiar al primero disponible
      if (currentUser?.id === userId) {
        setCurrentUser(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
  };

  const switchUser = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const logout = () => {
    if (currentUser) {
      removeUser(currentUser.id);
    }
  };

  const logoutAll = () => {
    setUsers([]);
    setCurrentUser(null);
    localStorage.removeItem("clubmaster-users");
    localStorage.removeItem("clubmaster-current-user");
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        addUser,
        removeUser,
        switchUser,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
