# ClubMaster 🏆

## Descripción
ClubMaster es un sistema integral de gestión para clubes deportivos.  
Permite centralizar la administración del club: gestión de socios, control de cuotas, organización de torneos, contratación de árbitros y seguimiento de estadísticas de partidos.  
El objetivo es facilitar las tareas administrativas y deportivas, reducir errores y mejorar la toma de decisiones en instituciones deportivas.

## Tecnologías utilizadas

### Backend
- **Lenguaje:** TypeScript
- **Framework:** Next.js (API Routes)
- **Arquitectura:** modular (Socios, Cuotas, Torneos, Árbitros, Seguridad)
- **Base de datos:** consultas con el driver `mssql` hacia SQL Server

### Frontend
- **Lenguaje:** TypeScript
- **Framework:** React + Next.js
- **UI/UX:** TailwindCSS + ShadCN UI + Recharts (para visualizaciones)
- **Autenticación:** sistema de usuarios y roles (Administrador, Socio, Árbitro)

### Base de Datos
- **Gestor:** SQL Server Management Studio 2019
- **Modelo:** relacional con claves foráneas y restricciones de integridad
- **Tablas principales:** Socios, Personas, Cuotas, Torneos, Partidos, Árbitros, Roles, Usuarios, EstadisticasPartido
- **Características:**
  - Generación automática de cuotas
  - Control de estados (activa, pagada, vencida)
  - Fixtures automáticos y tablas de posiciones
  - Estadísticas personalizadas por disciplina

## Instalación y ejecución
1. Clonar el repositorio:
   `git clone https://github.com/TomasBearzotti/ClubMaster-Web.git`
2. Instalar dependencias:
   `npm install`
3. Configurar la conexión a SQL Server:
    `lib/sql-server.ts`  
4. Levantar el entorno de desarrollo:
   `npm run dev`  
5. Acceder:
   `http://localhost:3000`

   ## Autor
- **Tomás Bearzotti** – Ingeniería en Sistemas de la Universidad Abierta Interamericana
