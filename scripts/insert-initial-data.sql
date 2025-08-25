-- Insertar datos iniciales para ClubMaster

-- Limpiar datos existentes (opcional)
DELETE FROM ArbitroDeportes;
DELETE FROM Cuotas;
DELETE FROM Torneos;
DELETE FROM Arbitros;
DELETE FROM Socios;
DELETE FROM Usuarios;
DELETE FROM TiposMembresia;
DELETE FROM Deportes;

-- Resetear contadores de identidad
DBCC CHECKIDENT ('ArbitroDeportes', RESEED, 0);
DBCC CHECKIDENT ('Cuotas', RESEED, 0);
DBCC CHECKIDENT ('Torneos', RESEED, 0);
DBCC CHECKIDENT ('Arbitros', RESEED, 0);
DBCC CHECKIDENT ('Socios', RESEED, 0);
DBCC CHECKIDENT ('Usuarios', RESEED, 0);
DBCC CHECKIDENT ('TiposMembresia', RESEED, 0);
DBCC CHECKIDENT ('Deportes', RESEED, 0);

-- Insertar Deportes
INSERT INTO Deportes (Nombre, Descripcion, Estado) VALUES
('Fútbol 5', 'Fútbol de salón con 5 jugadores por equipo', 1),
('Fútbol 11', 'Fútbol tradicional con 11 jugadores por equipo', 1),
('Básquet', 'Baloncesto', 1),
('Tenis', 'Tenis individual o dobles', 1),
('Padel', 'Padel en parejas', 1),
('Volley', 'Volleyball', 1),
('Natación', 'Deportes acuáticos', 1);

-- Insertar Tipos de Membresía
INSERT INTO TiposMembresia (Nombre, Descripcion, Precio, Estado) VALUES
('Básica', 'Acceso básico a las instalaciones', 15000.00, 1),
('Premium', 'Acceso completo + clases grupales', 25000.00, 1),
('Familiar', 'Membresía para toda la familia', 35000.00, 1),
('Juvenil', 'Membresía especial para menores de 18 años', 8000.00, 1),
('Senior', 'Membresía para mayores de 65 años', 12000.00, 1);

-- Insertar Usuarios (con contraseñas hasheadas)
-- admin: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi (password: admin)
-- 1234: $2a$10$N9qo8uLOickgx2ZMRZoMye.fDdh9jO1Js.xvgs/KVLOmz8Q9NuuK2 (password: 1234)
INSERT INTO Usuarios (Email, ContrasenaHash, Rol) VALUES
('admin@clubmaster.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('socio@clubmaster.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.fDdh9jO1Js.xvgs/KVLOmz8Q9NuuK2', 2),
('juan.perez@email.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.fDdh9jO1Js.xvgs/KVLOmz8Q9NuuK2', 2),
('maria.gonzalez@email.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.fDdh9jO1Js.xvgs/KVLOmz8Q9NuuK2', 2);

-- Insertar Socios
INSERT INTO Socios (Nombre, Apellido, Dni, Email, Telefono, TipoMembresiaId, FechaIngreso, Estado, UsuarioId) VALUES
('Juan', 'Pérez', '12345678', 'juan.perez@email.com', '+54 11 1234-5678', 2, '2023-01-15', 1, 3),
('María', 'González', '87654321', 'maria.gonzalez@email.com', '+54 11 2345-6789', 1, '2023-02-20', 1, 4),
('Carlos', 'Rodríguez', '11223344', 'carlos.rodriguez@email.com', '+54 11 3456-7890', 3, '2023-03-10', 1, NULL),
('Ana', 'Martínez', '44332211', 'ana.martinez@email.com', '+54 11 4567-8901', 4, '2023-04-05', 2, NULL),
('Luis', 'Torres', '55667788', 'luis.torres@email.com', '+54 11 5678-9012', 1, '2023-05-12', 1, NULL),
('Socio', 'Demo', '99887766', 'socio@clubmaster.com', '+54 11 9988-7766', 2, '2023-01-01', 1, 2);

-- Actualizar usuarios con SocioId
UPDATE Usuarios SET SocioId = 1 WHERE IdUsuario = 3;
UPDATE Usuarios SET SocioId = 2 WHERE IdUsuario = 4;
UPDATE Usuarios SET SocioId = 6 WHERE IdUsuario = 2;

-- Insertar Árbitros
INSERT INTO Arbitros (Nombre, Apellido, Email, Telefono, Experiencia, Calificacion, Estado) VALUES
('Carlos', 'Mendoza', 'carlos.mendoza@arbitros.com', '+54 11 1111-2222', 8, 4.8, 1),
('María', 'González', 'maria.gonzalez@arbitros.com', '+54 11 3333-4444', 5, 4.6, 1),
('Roberto', 'Silva', 'roberto.silva@arbitros.com', '+54 11 5555-6666', 12, 4.9, 1),
('Ana', 'Rodríguez', 'ana.rodriguez@arbitros.com', '+54 11 7777-8888', 6, 4.7, 1),
('Luis', 'Torres', 'luis.torres@arbitros.com', '+54 11 9999-0000', 10, 4.5, 1);

-- Insertar relaciones Árbitro-Deportes
INSERT INTO ArbitroDeportes (ArbitroId, DeporteId) VALUES
(1, 1), (1, 2), -- Carlos: Fútbol 5 y 11
(2, 1), (2, 3), -- María: Fútbol 5 y Básquet
(3, 4), (3, 5), -- Roberto: Tenis y Padel
(4, 3), (4, 6), -- Ana: Básquet y Volley
(5, 1), (5, 4); -- Luis: Fútbol 5 y Tenis

-- Insertar Torneos
INSERT INTO Torneos (Nombre, Descripcion, FechaInicio, FechaFin, MaxParticipantes, DeporteId, Estado) VALUES
('Torneo de Fútbol 5 - Verano 2025', 'Torneo de verano para equipos de fútbol 5', '2025-01-15', '2025-02-28', 16, 1, 0),
('Copa Tenis Club - 2025', 'Torneo anual de tenis individual', '2025-03-10', '2025-04-20', 32, 4, 0),
('Torneo de Básquet 3x3', 'Competencia de básquet modalidad 3 contra 3', '2025-02-05', '2025-03-15', 12, 3, 0),
('Campeonato de Natación', 'Competencia de natación por categorías', '2025-01-20', '2025-01-22', 45, 7, 1),
('Torneo de Padel - Parejas', 'Torneo de padel en modalidad parejas', '2025-04-05', '2025-05-10', 24, 5, 0);

-- Insertar Cuotas para Mayo 2025
INSERT INTO Cuotas (SocioId, Periodo, Monto, FechaVencimiento, Estado) VALUES
(1, 'Mayo 2025', 25000.00, '2025-05-31', 0), -- Juan Pérez - Premium
(2, 'Mayo 2025', 15000.00, '2025-05-31', 1), -- María González - Básica
(3, 'Mayo 2025', 35000.00, '2025-05-31', 2), -- Carlos Rodríguez - Familiar
(4, 'Mayo 2025', 8000.00, '2025-05-31', 1),  -- Ana Martínez - Juvenil
(5, 'Mayo 2025', 15000.00, '2025-05-31', 0), -- Luis Torres - Básica
(6, 'Mayo 2025', 25000.00, '2025-05-31', 0); -- Socio Demo - Premium

-- Insertar Cuotas para Abril 2025
INSERT INTO Cuotas (SocioId, Periodo, Monto, FechaVencimiento, FechaPago, Estado) VALUES
(1, 'Abril 2025', 25000.00, '2025-04-30', '2025-04-25', 1), -- Juan Pérez - Pagada
(2, 'Abril 2025', 15000.00, '2025-04-30', '2025-04-28', 1), -- María González - Pagada
(3, 'Abril 2025', 35000.00, '2025-04-30', NULL, 2),         -- Carlos Rodríguez - Vencida
(4, 'Abril 2025', 8000.00, '2025-04-30', '2025-04-30', 1),  -- Ana Martínez - Pagada
(5, 'Abril 2025', 15000.00, '2025-04-30', '2025-04-29', 1), -- Luis Torres - Pagada
(6, 'Abril 2025', 25000.00, '2025-04-30', '2025-04-20', 1); -- Socio Demo - Pagada

-- Insertar Cuotas para Marzo 2025
INSERT INTO Cuotas (SocioId, Periodo, Monto, FechaVencimiento, FechaPago, Estado) VALUES
(1, 'Marzo 2025', 25000.00, '2025-03-31', '2025-03-25', 1),
(2, 'Marzo 2025', 15000.00, '2025-03-31', '2025-03-28', 1),
(3, 'Marzo 2025', 35000.00, '2025-03-31', '2025-03-30', 1),
(4, 'Marzo 2025', 8000.00, '2025-03-31', '2025-03-29', 1),
(5, 'Marzo 2025', 15000.00, '2025-03-31', '2025-03-31', 1),
(6, 'Marzo 2025', 25000.00, '2025-03-31', '2025-03-20', 1);

PRINT 'Datos iniciales insertados correctamente en ClubMaster';
