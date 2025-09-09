USE [master]
GO
/****** Object:  Database [ClubMaster]    Script Date: 09/09/2025 11:37:42 ******/
CREATE DATABASE [ClubMaster]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'ClubMaster', FILENAME = N'C:\SQLData\ClubMaster.mdf' , SIZE = 73728KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'ClubMaster_log', FILENAME = N'C:\SQLData\Logs\ClubMaster_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [ClubMaster] SET COMPATIBILITY_LEVEL = 160
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [ClubMaster].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [ClubMaster] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [ClubMaster] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [ClubMaster] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [ClubMaster] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [ClubMaster] SET ARITHABORT OFF 
GO
ALTER DATABASE [ClubMaster] SET AUTO_CLOSE ON 
GO
ALTER DATABASE [ClubMaster] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [ClubMaster] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [ClubMaster] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [ClubMaster] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [ClubMaster] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [ClubMaster] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [ClubMaster] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [ClubMaster] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [ClubMaster] SET  ENABLE_BROKER 
GO
ALTER DATABASE [ClubMaster] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [ClubMaster] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [ClubMaster] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [ClubMaster] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [ClubMaster] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [ClubMaster] SET READ_COMMITTED_SNAPSHOT ON 
GO
ALTER DATABASE [ClubMaster] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [ClubMaster] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [ClubMaster] SET  MULTI_USER 
GO
ALTER DATABASE [ClubMaster] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [ClubMaster] SET DB_CHAINING OFF 
GO
ALTER DATABASE [ClubMaster] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [ClubMaster] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [ClubMaster] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [ClubMaster] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [ClubMaster] SET QUERY_STORE = ON
GO
ALTER DATABASE [ClubMaster] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
USE [ClubMaster]
GO
/****** Object:  User [clubadmin]    Script Date: 09/09/2025 11:37:42 ******/
CREATE USER [clubadmin] FOR LOGIN [clubadmin] WITH DEFAULT_SCHEMA=[dbo]
GO
ALTER ROLE [db_owner] ADD MEMBER [clubadmin]
GO
/****** Object:  Table [dbo].[Administradores]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Administradores](
	[IdAdministrador] [int] IDENTITY(1,1) NOT NULL,
	[IdPersona] [int] NOT NULL,
	[AreaResponsable] [nvarchar](150) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[IdAdministrador] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ArbitroDeportes]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ArbitroDeportes](
	[ArbitroId] [int] NOT NULL,
	[DeporteId] [int] NOT NULL,
 CONSTRAINT [PK_ArbitroDeportes] PRIMARY KEY CLUSTERED 
(
	[ArbitroId] ASC,
	[DeporteId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Arbitros]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Arbitros](
	[IdArbitro] [int] IDENTITY(1,1) NOT NULL,
	[IdPersona] [int] NULL,
 CONSTRAINT [PK_Arbitros] PRIMARY KEY CLUSTERED 
(
	[IdArbitro] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Comprobantes]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Comprobantes](
	[IdComprobante] [int] IDENTITY(1,1) NOT NULL,
	[FechaEmision] [datetime2](7) NOT NULL,
	[MontoPagado] [decimal](10, 2) NOT NULL,
	[MedioPago] [nvarchar](40) NOT NULL,
	[CuotaId] [int] NOT NULL,
	[SocioIdSocio] [int] NULL,
 CONSTRAINT [PK_Comprobantes] PRIMARY KEY CLUSTERED 
(
	[IdComprobante] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Cuotas]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Cuotas](
	[IdCuota] [int] IDENTITY(1,1) NOT NULL,
	[Mes] [int] NOT NULL,
	[Anio] [int] NOT NULL,
	[Monto] [decimal](10, 2) NOT NULL,
	[Estado] [int] NOT NULL,
	[FechaVencimiento] [datetime2](7) NOT NULL,
	[FechaPago] [datetime2](7) NULL,
	[Recargo] [decimal](10, 2) NULL,
	[SocioId] [int] NOT NULL,
	[MetodoPago] [nvarchar](50) NULL,
	[NumeroTransaccion] [nvarchar](100) NULL,
 CONSTRAINT [PK_Cuotas] PRIMARY KEY CLUSTERED 
(
	[IdCuota] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Deportes]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Deportes](
	[IdDeporte] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](80) NOT NULL,
	[MaxParticipantes] [int] NOT NULL,
 CONSTRAINT [PK_Deportes] PRIMARY KEY CLUSTERED 
(
	[IdDeporte] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DisponibilidadArbitro]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DisponibilidadArbitro](
	[IdDisponibilidad] [int] IDENTITY(1,1) NOT NULL,
	[IdArbitro] [int] NULL,
	[DiaSemana] [nvarchar](50) NULL,
	[HoraInicio] [time](7) NULL,
	[HoraFin] [time](7) NULL,
 CONSTRAINT [PK__Disponib__AE82DB17EACB501A] PRIMARY KEY CLUSTERED 
(
	[IdDisponibilidad] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Equipos]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Equipos](
	[IdEquipo] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](100) NOT NULL,
	[Disciplina] [nvarchar](50) NOT NULL,
	[CapitanId] [int] NOT NULL,
	[FechaCreacion] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[IdEquipo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[EstadisticasPartido]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[EstadisticasPartido](
	[IdEstadistica] [int] IDENTITY(1,1) NOT NULL,
	[PartidoId] [int] NOT NULL,
	[ParticipanteId] [int] NOT NULL,
	[NombreCampo] [nvarchar](50) NOT NULL,
	[Valor] [nvarchar](100) NOT NULL,
	[FechaRegistro] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_EstadisticasPartido] PRIMARY KEY CLUSTERED 
(
	[IdEstadistica] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[FilasPos]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[FilasPos](
	[IdFila] [int] IDENTITY(1,1) NOT NULL,
	[ParticipanteId] [int] NOT NULL,
	[Puntos] [int] NOT NULL,
	[Jugados] [int] NOT NULL,
	[Ganados] [int] NOT NULL,
	[Empatados] [int] NOT NULL,
	[Perdidos] [int] NOT NULL,
	[TablaPosicionesIdTabla] [int] NULL,
 CONSTRAINT [PK_FilasPos] PRIMARY KEY CLUSTERED 
(
	[IdFila] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fixtures]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fixtures](
	[IdFixture] [int] IDENTITY(1,1) NOT NULL,
	[Tipo] [int] NOT NULL,
	[TorneoId] [int] NOT NULL,
 CONSTRAINT [PK_Fixtures] PRIMARY KEY CLUSTERED 
(
	[IdFixture] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IntegrantesEquipo]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IntegrantesEquipo](
	[IdIntegrante] [int] IDENTITY(1,1) NOT NULL,
	[EquipoId] [int] NOT NULL,
	[SocioId] [int] NOT NULL,
	[FechaIngreso] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[IdIntegrante] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[EquipoId] ASC,
	[SocioId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Participantes]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Participantes](
	[IdParticipante] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](120) NOT NULL,
	[EsEquipo] [bit] NOT NULL,
	[TorneoId] [int] NOT NULL,
	[SocioId] [int] NULL,
	[EquipoId] [int] NULL,
 CONSTRAINT [PK_Participantes] PRIMARY KEY CLUSTERED 
(
	[IdParticipante] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Partidos]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Partidos](
	[IdPartido] [int] IDENTITY(1,1) NOT NULL,
	[FechaHora] [datetime2](7) NOT NULL,
	[Estado] [int] NOT NULL,
	[ParticipanteAId] [int] NOT NULL,
	[ParticipanteBId] [int] NULL,
	[ArbitroId] [int] NULL,
	[TorneoId] [int] NOT NULL,
	[FixtureIdFixture] [int] NULL,
	[FechaPartido] [date] NULL,
	[HoraPartido] [nvarchar](10) NULL,
	[Fase] [nvarchar](50) NULL,
	[Grupo] [nvarchar](10) NULL,
	[Lugar] [nvarchar](100) NULL,
	[EstadoPartido] [nvarchar](20) NULL,
 CONSTRAINT [PK_Partidos] PRIMARY KEY CLUSTERED 
(
	[IdPartido] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Permiso]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Permiso](
	[IdPermiso] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](100) NOT NULL,
	[Descripcion] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[IdPermiso] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Personas]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Personas](
	[IdPersona] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](120) NOT NULL,
	[Apellido] [nvarchar](120) NOT NULL,
	[Dni] [nvarchar](15) NOT NULL,
	[Telefono] [nvarchar](20) NULL,
	[Mail] [nvarchar](100) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[IdPersona] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PlantillasEstadisticas]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PlantillasEstadisticas](
	[IdPlantilla] [int] IDENTITY(1,1) NOT NULL,
	[IdDeporte] [int] NOT NULL,
	[NombreCampo] [nvarchar](50) NOT NULL,
	[TipoDato] [nvarchar](20) NOT NULL,
	[EsObligatorio] [bit] NOT NULL,
	[Orden] [int] NOT NULL,
 CONSTRAINT [PK_PlantillasEstadisticas] PRIMARY KEY CLUSTERED 
(
	[IdPlantilla] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Rol]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Rol](
	[IdRol] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](100) NOT NULL,
	[Descripcion] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[IdRol] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RolesPermiso]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RolesPermiso](
	[IdRolesPermiso] [int] IDENTITY(1,1) NOT NULL,
	[IdRol] [int] NOT NULL,
	[IdPermiso] [int] NOT NULL,
	[FechaAsignacion] [datetime] NOT NULL,
	[EstadoPermiso] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[IdRolesPermiso] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RolesRoles]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RolesRoles](
	[IdRolesRoles] [int] IDENTITY(1,1) NOT NULL,
	[PadreRolId] [int] NOT NULL,
	[HijoRolId] [int] NOT NULL,
	[TipoRelacion] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[IdRolesRoles] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Socios]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Socios](
	[IdSocio] [int] IDENTITY(1,1) NOT NULL,
	[Estado] [int] NOT NULL,
	[TipoMembresiaId] [int] NOT NULL,
	[UsuarioId] [int] NULL,
	[IdPersona] [int] NULL,
 CONSTRAINT [PK_Socios] PRIMARY KEY CLUSTERED 
(
	[IdSocio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TablasPos]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TablasPos](
	[IdTabla] [int] IDENTITY(1,1) NOT NULL,
	[TorneoId] [int] NOT NULL,
 CONSTRAINT [PK_TablasPos] PRIMARY KEY CLUSTERED 
(
	[IdTabla] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TiposMembresia]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TiposMembresia](
	[IdTipo] [int] IDENTITY(1,1) NOT NULL,
	[Descripcion] [nvarchar](60) NOT NULL,
	[MontoMensual] [decimal](10, 2) NOT NULL,
 CONSTRAINT [PK_TiposMembresia] PRIMARY KEY CLUSTERED 
(
	[IdTipo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Torneos]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Torneos](
	[IdTorneo] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](100) NOT NULL,
	[Disciplina] [nvarchar](max) NOT NULL,
	[FechaInicio] [datetime2](7) NOT NULL,
	[Estado] [int] NOT NULL,
	[Descripcion] [nvarchar](500) NULL,
	[MaxParticipantes] [int] NULL,
	[FechaFin] [datetime] NULL,
	[PremioGanador] [nvarchar](255) NULL,
 CONSTRAINT [PK_Torneos] PRIMARY KEY CLUSTERED 
(
	[IdTorneo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Usuarios]    Script Date: 09/09/2025 11:37:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Usuarios](
	[IdUsuario] [int] IDENTITY(1,1) NOT NULL,
	[Email] [nvarchar](100) NOT NULL,
	[ContrasenaHash] [nvarchar](120) NOT NULL,
	[IdPersona] [int] NULL,
	[IdRol] [int] NULL,
 CONSTRAINT [PK_Usuarios] PRIMARY KEY CLUSTERED 
(
	[IdUsuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Index [IX_ArbitroDeportes_DeporteId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_ArbitroDeportes_DeporteId] ON [dbo].[ArbitroDeportes]
(
	[DeporteId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Comprobantes_CuotaId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Comprobantes_CuotaId] ON [dbo].[Comprobantes]
(
	[CuotaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Comprobantes_SocioIdSocio]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Comprobantes_SocioIdSocio] ON [dbo].[Comprobantes]
(
	[SocioIdSocio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Cuotas_SocioId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Cuotas_SocioId] ON [dbo].[Cuotas]
(
	[SocioId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_EstadisticasPartido_PartidoId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_EstadisticasPartido_PartidoId] ON [dbo].[EstadisticasPartido]
(
	[PartidoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FilasPos_ParticipanteId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_FilasPos_ParticipanteId] ON [dbo].[FilasPos]
(
	[ParticipanteId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FilasPos_TablaPosicionesIdTabla]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_FilasPos_TablaPosicionesIdTabla] ON [dbo].[FilasPos]
(
	[TablaPosicionesIdTabla] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fixtures_TorneoId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Fixtures_TorneoId] ON [dbo].[Fixtures]
(
	[TorneoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Participantes_SocioId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Participantes_SocioId] ON [dbo].[Participantes]
(
	[SocioId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Participantes_TorneoId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Participantes_TorneoId] ON [dbo].[Participantes]
(
	[TorneoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Partidos_ArbitroId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_ArbitroId] ON [dbo].[Partidos]
(
	[ArbitroId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Partidos_Fase]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_Fase] ON [dbo].[Partidos]
(
	[Fase] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Partidos_FechaPartido]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_FechaPartido] ON [dbo].[Partidos]
(
	[FechaPartido] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Partidos_FixtureIdFixture]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_FixtureIdFixture] ON [dbo].[Partidos]
(
	[FixtureIdFixture] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Partidos_ParticipanteAId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_ParticipanteAId] ON [dbo].[Partidos]
(
	[ParticipanteAId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Partidos_ParticipanteBId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_ParticipanteBId] ON [dbo].[Partidos]
(
	[ParticipanteBId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Partidos_TorneoId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Partidos_TorneoId] ON [dbo].[Partidos]
(
	[TorneoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Socios_TipoMembresiaId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_Socios_TipoMembresiaId] ON [dbo].[Socios]
(
	[TipoMembresiaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_TablasPos_TorneoId]    Script Date: 09/09/2025 11:37:43 ******/
CREATE NONCLUSTERED INDEX [IX_TablasPos_TorneoId] ON [dbo].[TablasPos]
(
	[TorneoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Equipos] ADD  DEFAULT (getdate()) FOR [FechaCreacion]
GO
ALTER TABLE [dbo].[EstadisticasPartido] ADD  DEFAULT (getdate()) FOR [FechaRegistro]
GO
ALTER TABLE [dbo].[IntegrantesEquipo] ADD  DEFAULT (getdate()) FOR [FechaIngreso]
GO
ALTER TABLE [dbo].[Partidos] ADD  DEFAULT ('Programado') FOR [EstadoPartido]
GO
ALTER TABLE [dbo].[PlantillasEstadisticas] ADD  DEFAULT ((0)) FOR [EsObligatorio]
GO
ALTER TABLE [dbo].[PlantillasEstadisticas] ADD  DEFAULT ((0)) FOR [Orden]
GO
ALTER TABLE [dbo].[RolesPermiso] ADD  DEFAULT (getdate()) FOR [FechaAsignacion]
GO
ALTER TABLE [dbo].[RolesPermiso] ADD  DEFAULT ((1)) FOR [EstadoPermiso]
GO
ALTER TABLE [dbo].[Administradores]  WITH CHECK ADD FOREIGN KEY([IdPersona])
REFERENCES [dbo].[Personas] ([IdPersona])
GO
ALTER TABLE [dbo].[ArbitroDeportes]  WITH CHECK ADD  CONSTRAINT [FK_ArbitroDeportes_Arbitros_ArbitroId] FOREIGN KEY([ArbitroId])
REFERENCES [dbo].[Arbitros] ([IdArbitro])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ArbitroDeportes] CHECK CONSTRAINT [FK_ArbitroDeportes_Arbitros_ArbitroId]
GO
ALTER TABLE [dbo].[ArbitroDeportes]  WITH CHECK ADD  CONSTRAINT [FK_ArbitroDeportes_Deportes_DeporteId] FOREIGN KEY([DeporteId])
REFERENCES [dbo].[Deportes] ([IdDeporte])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ArbitroDeportes] CHECK CONSTRAINT [FK_ArbitroDeportes_Deportes_DeporteId]
GO
ALTER TABLE [dbo].[Arbitros]  WITH CHECK ADD FOREIGN KEY([IdPersona])
REFERENCES [dbo].[Personas] ([IdPersona])
GO
ALTER TABLE [dbo].[Arbitros]  WITH CHECK ADD  CONSTRAINT [FK_Arbitros_Personas_IdPersona] FOREIGN KEY([IdPersona])
REFERENCES [dbo].[Personas] ([IdPersona])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[Arbitros] CHECK CONSTRAINT [FK_Arbitros_Personas_IdPersona]
GO
ALTER TABLE [dbo].[Comprobantes]  WITH CHECK ADD  CONSTRAINT [FK_Comprobantes_Cuotas_CuotaId] FOREIGN KEY([CuotaId])
REFERENCES [dbo].[Cuotas] ([IdCuota])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Comprobantes] CHECK CONSTRAINT [FK_Comprobantes_Cuotas_CuotaId]
GO
ALTER TABLE [dbo].[Comprobantes]  WITH CHECK ADD  CONSTRAINT [FK_Comprobantes_Socios_SocioIdSocio] FOREIGN KEY([SocioIdSocio])
REFERENCES [dbo].[Socios] ([IdSocio])
GO
ALTER TABLE [dbo].[Comprobantes] CHECK CONSTRAINT [FK_Comprobantes_Socios_SocioIdSocio]
GO
ALTER TABLE [dbo].[Cuotas]  WITH CHECK ADD  CONSTRAINT [FK_Cuotas_Socios_SocioId] FOREIGN KEY([SocioId])
REFERENCES [dbo].[Socios] ([IdSocio])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Cuotas] CHECK CONSTRAINT [FK_Cuotas_Socios_SocioId]
GO
ALTER TABLE [dbo].[DisponibilidadArbitro]  WITH CHECK ADD  CONSTRAINT [FK__Disponibi__IdArb__0B5CAFEA] FOREIGN KEY([IdArbitro])
REFERENCES [dbo].[Arbitros] ([IdArbitro])
GO
ALTER TABLE [dbo].[DisponibilidadArbitro] CHECK CONSTRAINT [FK__Disponibi__IdArb__0B5CAFEA]
GO
ALTER TABLE [dbo].[Equipos]  WITH CHECK ADD FOREIGN KEY([CapitanId])
REFERENCES [dbo].[Socios] ([IdSocio])
GO
ALTER TABLE [dbo].[EstadisticasPartido]  WITH CHECK ADD  CONSTRAINT [FK_EstadisticasPartido_Participantes] FOREIGN KEY([ParticipanteId])
REFERENCES [dbo].[Participantes] ([IdParticipante])
GO
ALTER TABLE [dbo].[EstadisticasPartido] CHECK CONSTRAINT [FK_EstadisticasPartido_Participantes]
GO
ALTER TABLE [dbo].[EstadisticasPartido]  WITH CHECK ADD  CONSTRAINT [FK_EstadisticasPartido_Partidos] FOREIGN KEY([PartidoId])
REFERENCES [dbo].[Partidos] ([IdPartido])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[EstadisticasPartido] CHECK CONSTRAINT [FK_EstadisticasPartido_Partidos]
GO
ALTER TABLE [dbo].[FilasPos]  WITH CHECK ADD  CONSTRAINT [FK_FilasPos_Participantes_ParticipanteId] FOREIGN KEY([ParticipanteId])
REFERENCES [dbo].[Participantes] ([IdParticipante])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[FilasPos] CHECK CONSTRAINT [FK_FilasPos_Participantes_ParticipanteId]
GO
ALTER TABLE [dbo].[FilasPos]  WITH CHECK ADD  CONSTRAINT [FK_FilasPos_TablasPos_TablaPosicionesIdTabla] FOREIGN KEY([TablaPosicionesIdTabla])
REFERENCES [dbo].[TablasPos] ([IdTabla])
GO
ALTER TABLE [dbo].[FilasPos] CHECK CONSTRAINT [FK_FilasPos_TablasPos_TablaPosicionesIdTabla]
GO
ALTER TABLE [dbo].[Fixtures]  WITH CHECK ADD  CONSTRAINT [FK_Fixtures_Torneos_TorneoId] FOREIGN KEY([TorneoId])
REFERENCES [dbo].[Torneos] ([IdTorneo])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Fixtures] CHECK CONSTRAINT [FK_Fixtures_Torneos_TorneoId]
GO
ALTER TABLE [dbo].[IntegrantesEquipo]  WITH CHECK ADD FOREIGN KEY([EquipoId])
REFERENCES [dbo].[Equipos] ([IdEquipo])
GO
ALTER TABLE [dbo].[IntegrantesEquipo]  WITH CHECK ADD FOREIGN KEY([SocioId])
REFERENCES [dbo].[Socios] ([IdSocio])
GO
ALTER TABLE [dbo].[Participantes]  WITH CHECK ADD  CONSTRAINT [FK_Participantes_Equipos] FOREIGN KEY([EquipoId])
REFERENCES [dbo].[Equipos] ([IdEquipo])
GO
ALTER TABLE [dbo].[Participantes] CHECK CONSTRAINT [FK_Participantes_Equipos]
GO
ALTER TABLE [dbo].[Participantes]  WITH CHECK ADD  CONSTRAINT [FK_Participantes_Socios_SocioId] FOREIGN KEY([SocioId])
REFERENCES [dbo].[Socios] ([IdSocio])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[Participantes] CHECK CONSTRAINT [FK_Participantes_Socios_SocioId]
GO
ALTER TABLE [dbo].[Participantes]  WITH CHECK ADD  CONSTRAINT [FK_Participantes_Torneos_TorneoId] FOREIGN KEY([TorneoId])
REFERENCES [dbo].[Torneos] ([IdTorneo])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Participantes] CHECK CONSTRAINT [FK_Participantes_Torneos_TorneoId]
GO
ALTER TABLE [dbo].[Partidos]  WITH CHECK ADD  CONSTRAINT [FK_Partidos_Arbitros_ArbitroId] FOREIGN KEY([ArbitroId])
REFERENCES [dbo].[Arbitros] ([IdArbitro])
GO
ALTER TABLE [dbo].[Partidos] CHECK CONSTRAINT [FK_Partidos_Arbitros_ArbitroId]
GO
ALTER TABLE [dbo].[Partidos]  WITH CHECK ADD  CONSTRAINT [FK_Partidos_Fixtures_FixtureIdFixture] FOREIGN KEY([FixtureIdFixture])
REFERENCES [dbo].[Fixtures] ([IdFixture])
GO
ALTER TABLE [dbo].[Partidos] CHECK CONSTRAINT [FK_Partidos_Fixtures_FixtureIdFixture]
GO
ALTER TABLE [dbo].[Partidos]  WITH CHECK ADD  CONSTRAINT [FK_Partidos_Participantes_ParticipanteAId] FOREIGN KEY([ParticipanteAId])
REFERENCES [dbo].[Participantes] ([IdParticipante])
GO
ALTER TABLE [dbo].[Partidos] CHECK CONSTRAINT [FK_Partidos_Participantes_ParticipanteAId]
GO
ALTER TABLE [dbo].[Partidos]  WITH CHECK ADD  CONSTRAINT [FK_Partidos_Participantes_ParticipanteBId] FOREIGN KEY([ParticipanteBId])
REFERENCES [dbo].[Participantes] ([IdParticipante])
GO
ALTER TABLE [dbo].[Partidos] CHECK CONSTRAINT [FK_Partidos_Participantes_ParticipanteBId]
GO
ALTER TABLE [dbo].[Partidos]  WITH CHECK ADD  CONSTRAINT [FK_Partidos_Torneos_TorneoId] FOREIGN KEY([TorneoId])
REFERENCES [dbo].[Torneos] ([IdTorneo])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Partidos] CHECK CONSTRAINT [FK_Partidos_Torneos_TorneoId]
GO
ALTER TABLE [dbo].[PlantillasEstadisticas]  WITH CHECK ADD  CONSTRAINT [FK_Plantilla_Deporte] FOREIGN KEY([IdDeporte])
REFERENCES [dbo].[Deportes] ([IdDeporte])
GO
ALTER TABLE [dbo].[PlantillasEstadisticas] CHECK CONSTRAINT [FK_Plantilla_Deporte]
GO
ALTER TABLE [dbo].[PlantillasEstadisticas]  WITH CHECK ADD  CONSTRAINT [FK_PlantillasEstadisticas_Deportes] FOREIGN KEY([IdDeporte])
REFERENCES [dbo].[Deportes] ([IdDeporte])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PlantillasEstadisticas] CHECK CONSTRAINT [FK_PlantillasEstadisticas_Deportes]
GO
ALTER TABLE [dbo].[RolesPermiso]  WITH CHECK ADD FOREIGN KEY([IdPermiso])
REFERENCES [dbo].[Permiso] ([IdPermiso])
GO
ALTER TABLE [dbo].[RolesPermiso]  WITH CHECK ADD FOREIGN KEY([IdRol])
REFERENCES [dbo].[Rol] ([IdRol])
GO
ALTER TABLE [dbo].[RolesRoles]  WITH CHECK ADD FOREIGN KEY([HijoRolId])
REFERENCES [dbo].[Rol] ([IdRol])
GO
ALTER TABLE [dbo].[RolesRoles]  WITH CHECK ADD FOREIGN KEY([PadreRolId])
REFERENCES [dbo].[Rol] ([IdRol])
GO
ALTER TABLE [dbo].[Socios]  WITH CHECK ADD FOREIGN KEY([IdPersona])
REFERENCES [dbo].[Personas] ([IdPersona])
GO
ALTER TABLE [dbo].[Socios]  WITH CHECK ADD  CONSTRAINT [FK_Socios_Personas_IdPersona] FOREIGN KEY([IdPersona])
REFERENCES [dbo].[Personas] ([IdPersona])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[Socios] CHECK CONSTRAINT [FK_Socios_Personas_IdPersona]
GO
ALTER TABLE [dbo].[Socios]  WITH CHECK ADD  CONSTRAINT [FK_Socios_TiposMembresia_TipoMembresiaId] FOREIGN KEY([TipoMembresiaId])
REFERENCES [dbo].[TiposMembresia] ([IdTipo])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Socios] CHECK CONSTRAINT [FK_Socios_TiposMembresia_TipoMembresiaId]
GO
ALTER TABLE [dbo].[TablasPos]  WITH CHECK ADD  CONSTRAINT [FK_TablasPos_Torneos_TorneoId] FOREIGN KEY([TorneoId])
REFERENCES [dbo].[Torneos] ([IdTorneo])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[TablasPos] CHECK CONSTRAINT [FK_TablasPos_Torneos_TorneoId]
GO
ALTER TABLE [dbo].[Usuarios]  WITH CHECK ADD FOREIGN KEY([IdPersona])
REFERENCES [dbo].[Personas] ([IdPersona])
GO
ALTER TABLE [dbo].[Usuarios]  WITH CHECK ADD FOREIGN KEY([IdRol])
REFERENCES [dbo].[Rol] ([IdRol])
GO
ALTER TABLE [dbo].[Participantes]  WITH CHECK ADD  CONSTRAINT [CK_Participantes_Tipo] CHECK  (([EsEquipo]=(1) AND [EquipoId] IS NOT NULL AND [SocioId] IS NULL OR [EsEquipo]=(0) AND [SocioId] IS NOT NULL AND [EquipoId] IS NULL))
GO
ALTER TABLE [dbo].[Participantes] CHECK CONSTRAINT [CK_Participantes_Tipo]
GO
USE [master]
GO
ALTER DATABASE [ClubMaster] SET  READ_WRITE 
GO
