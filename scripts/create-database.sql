-- Crear base de datos ClubMaster
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ClubMaster')
BEGIN
    CREATE DATABASE ClubMaster;
    PRINT 'Base de datos ClubMaster creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La base de datos ClubMaster ya existe';
END

USE ClubMaster;

-- Tabla de Deportes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Deportes' AND xtype='U')
BEGIN
    CREATE TABLE Deportes (
        IdDeporte INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(500),
        Estado INT DEFAULT 1 -- 1=Activo, 0=Inactivo
    );
    PRINT 'Tabla Deportes creada';
END

-- Tabla de Tipos de Membresía
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TiposMembresia' AND xtype='U')
BEGIN
    CREATE TABLE TiposMembresia (
        IdTipoMembresia INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(500),
        Precio DECIMAL(10,2) NOT NULL,
        Estado INT DEFAULT 1 -- 1=Activo, 0=Inactivo
    );
    PRINT 'Tabla TiposMembresia creada';
END

-- Tabla de Usuarios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Usuarios' AND xtype='U')
BEGIN
    CREATE TABLE Usuarios (
        IdUsuario INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        ContrasenaHash NVARCHAR(255) NOT NULL,
        Rol INT NOT NULL, -- 1=Admin, 2=Socio
        SocioId INT NULL,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        Estado INT DEFAULT 1 -- 1=Activo, 0=Inactivo
    );
    PRINT 'Tabla Usuarios creada';
END

-- Tabla de Socios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Socios' AND xtype='U')
BEGIN
    CREATE TABLE Socios (
        IdSocio INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Apellido NVARCHAR(100) NOT NULL,
        Dni NVARCHAR(20) NOT NULL UNIQUE,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Telefono NVARCHAR(20),
        TipoMembresiaId INT NOT NULL,
        FechaIngreso DATETIME DEFAULT GETDATE(),
        Estado INT DEFAULT 1, -- 1=Activo, 0=Inactivo, 2=Suspendido
        UsuarioId INT NULL,
        FOREIGN KEY (TipoMembresiaId) REFERENCES TiposMembresia(IdTipoMembresia),
        FOREIGN KEY (UsuarioId) REFERENCES Usuarios(IdUsuario)
    );
    PRINT 'Tabla Socios creada';
END

-- Tabla de Árbitros
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Arbitros' AND xtype='U')
BEGIN
    CREATE TABLE Arbitros (
        IdArbitro INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Apellido NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Telefono NVARCHAR(20),
        Experiencia INT DEFAULT 0, -- Años de experiencia
        Calificacion DECIMAL(3,2) DEFAULT 5.0, -- Calificación de 1 a 5
        Estado INT DEFAULT 1 -- 1=Disponible, 0=No disponible
    );
    PRINT 'Tabla Arbitros creada';
END

-- Tabla de relación Árbitros-Deportes (muchos a muchos)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ArbitroDeportes' AND xtype='U')
BEGIN
    CREATE TABLE ArbitroDeportes (
        IdArbitroDeporte INT IDENTITY(1,1) PRIMARY KEY,
        ArbitroId INT NOT NULL,
        DeporteId INT NOT NULL,
        FOREIGN KEY (ArbitroId) REFERENCES Arbitros(IdArbitro),
        FOREIGN KEY (DeporteId) REFERENCES Deportes(IdDeporte),
        UNIQUE(ArbitroId, DeporteId)
    );
    PRINT 'Tabla ArbitroDeportes creada';
END

-- Tabla de Torneos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Torneos' AND xtype='U')
BEGIN
    CREATE TABLE Torneos (
        IdTorneo INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(200) NOT NULL,
        Descripcion NVARCHAR(1000),
        FechaInicio DATETIME NOT NULL,
        FechaFin DATETIME NOT NULL,
        MaxParticipantes INT,
        DeporteId INT NOT NULL,
        Estado INT DEFAULT 0, -- 0=Activo, 1=Finalizado, 2=Cancelado
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (DeporteId) REFERENCES Deportes(IdDeporte)
    );
    PRINT 'Tabla Torneos creada';
END

-- Tabla de Cuotas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Cuotas' AND xtype='U')
BEGIN
    CREATE TABLE Cuotas (
        IdCuota INT IDENTITY(1,1) PRIMARY KEY,
        SocioId INT NOT NULL,
        Periodo NVARCHAR(50) NOT NULL, -- Ej: "Enero 2025"
        Monto DECIMAL(10,2) NOT NULL,
        FechaVencimiento DATETIME NOT NULL,
        FechaPago DATETIME NULL,
        Estado INT DEFAULT 0, -- 0=Pendiente, 1=Pagada, 2=Vencida
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (SocioId) REFERENCES Socios(IdSocio)
    );
    PRINT 'Tabla Cuotas creada';
END

-- Agregar foreign key de Usuarios a Socios si no existe
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Usuarios_SocioId')
BEGIN
    ALTER TABLE Usuarios 
    ADD CONSTRAINT FK_Usuarios_SocioId 
    FOREIGN KEY (SocioId) REFERENCES Socios(IdSocio);
    PRINT 'Foreign key FK_Usuarios_SocioId agregada';
END

-- Crear índices para mejorar performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Socios_Email')
BEGIN
    CREATE INDEX IX_Socios_Email ON Socios(Email);
    PRINT 'Índice IX_Socios_Email creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Socios_Dni')
BEGIN
    CREATE INDEX IX_Socios_Dni ON Socios(Dni);
    PRINT 'Índice IX_Socios_Dni creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Cuotas_SocioId_Periodo')
BEGIN
    CREATE INDEX IX_Cuotas_SocioId_Periodo ON Cuotas(SocioId, Periodo);
    PRINT 'Índice IX_Cuotas_SocioId_Periodo creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Usuarios_Email')
BEGIN
    CREATE INDEX IX_Usuarios_Email ON Usuarios(Email);
    PRINT 'Índice IX_Usuarios_Email creado';
END

PRINT 'Base de datos ClubMaster configurada correctamente';
