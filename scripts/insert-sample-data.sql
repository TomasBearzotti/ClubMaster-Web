-- Insertar tipos de membresía
INSERT INTO TiposMembresia (Descripcion, MontoMensual) VALUES
('Membresía Básica', 15000.00),
('Membresía Premium', 25000.00),
('Membresía Familiar', 35000.00),
('Membresía Juvenil', 8000.00);

-- Insertar usuarios
INSERT INTO Usuarios (Email, ContrasenaHash, Rol) VALUES
('admin@clubmaster.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1), -- password: admin
('socio@clubmaster.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2); -- password: 1234

-- Insertar socios de ejemplo
INSERT INTO Socios (Nombre, Dni, Email, Telefono, Estado, TipoMembresiaId, UsuarioId) VALUES
('Juan Pérez', '12345678', 'juan.perez@email.com', '+54 11 1234-5678', 1, 1, 2),
('María González', '87654321', 'maria.gonzalez@email.com', '+54 11 2345-6789', 1, 2, NULL),
('Carlos Rodríguez', '11223344', 'carlos.rodriguez@email.com', '+54 11 3456-7890', 1, 3, NULL),
('Ana Martínez', '44332211', 'ana.martinez@email.com', '+54 11 4567-8901', 1, 4, NULL),
('Luis Torres', '55667788', 'luis.torres@email.com', '+54 11 5678-9012', 1, 1, NULL);

-- Insertar deportes
INSERT INTO Deportes (Nombre, MaxParticipantes) VALUES
('Fútbol 5', 10),
('Tenis', 2),
('Básquet', 10),
('Padel', 4),
('Natación', 1);

-- Insertar árbitros
INSERT INTO Arbitros (Nombre, Email, Disponibilidad) VALUES
('Carlos Mendoza', 'carlos.mendoza@email.com', 'Lunes,Martes,Miércoles'),
('María González', 'maria.gonzalez.arbitro@email.com', 'Jueves,Viernes,Sábado'),
('Roberto Silva', 'roberto.silva@email.com', 'Sábado,Domingo'),
('Ana Rodríguez', 'ana.rodriguez.arbitro@email.com', 'Lunes,Miércoles,Viernes');

-- Insertar torneos
INSERT INTO Torneos (Nombre, Disciplina, FechaInicio, Estado) VALUES
('Torneo de Fútbol 5 - Verano 2025', 'Fútbol 5', '2025-01-15', 0),
('Copa Tenis Club - 2025', 'Tenis', '2025-03-10', 0),
('Torneo de Básquet 3x3', 'Básquet', '2025-02-05', 0),
('Campeonato de Natación', 'Natación', '2024-12-15', 1);

-- Insertar cuotas de ejemplo para el mes actual
DECLARE @mes INT = MONTH(GETDATE())
DECLARE @anio INT = YEAR(GETDATE())

INSERT INTO Cuotas (Mes, Anio, Monto, Estado, FechaVencimiento, SocioId, FechaPago) VALUES
(@mes, @anio, 15000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 1, GETDATE()),
(@mes, @anio, 25000.00, 0, DATEFROMPARTS(@anio, @mes, 28), 2, NULL),
(@mes, @anio, 35000.00, 0, DATEFROMPARTS(@anio, @mes, 28), 3, NULL),
(@mes, @anio, 8000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 4, GETDATE()),
(@mes, @anio, 15000.00, 0, DATEFROMPARTS(@anio, @mes, 28), 5, NULL);

-- Insertar cuotas del mes anterior
SET @mes = @mes - 1
IF @mes = 0 
BEGIN
    SET @mes = 12
    SET @anio = @anio - 1
END

INSERT INTO Cuotas (Mes, Anio, Monto, Estado, FechaVencimiento, SocioId, FechaPago) VALUES
(@mes, @anio, 15000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 1, DATEADD(day, -5, DATEFROMPARTS(@anio, @mes, 28))),
(@mes, @anio, 25000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 2, DATEADD(day, -3, DATEFROMPARTS(@anio, @mes, 28))),
(@mes, @anio, 35000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 3, DATEADD(day, -7, DATEFROMPARTS(@anio, @mes, 28))),
(@mes, @anio, 8000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 4, DATEADD(day, -2, DATEFROMPARTS(@anio, @mes, 28))),
(@mes, @anio, 15000.00, 1, DATEFROMPARTS(@anio, @mes, 28), 5, DATEADD(day, -1, DATEFROMPARTS(@anio, @mes, 28)));
