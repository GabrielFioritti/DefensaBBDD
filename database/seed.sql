-- Datos de ejemplo para simular elección municipal (Salto)
USE elecciones_db;

INSERT INTO departamento (nombre) VALUES
  ('Salto'), ('Artigas'), ('Montevideo');

INSERT INTO municipio (nombre, id_departamento) VALUES
  ('Salto', 1),
  ('Constitución', 1),
  ('Bella Unión', 2);

INSERT INTO organismo_estado (nombre) VALUES
  ('Ministerio del Interior'),
  ('Intendencia de Salto'),
  ('ANEP');

INSERT INTO zona (nombre) VALUES
  ('Zona Norte Salto'),
  ('Zona Centro Salto');

INSERT INTO establecimiento (nombre, tipo, id_zona) VALUES
  ('Liceo Nº 1', 'Liceo', 2),
  ('Escuela Nº 45', 'Escuela', 1);

INSERT INTO circuito (id_establecimiento, id_departamento, ciudad_paraje, barrio, accesible, cc_desde, cc_hasta) VALUES
  (1, 1, 'Salto', 'Centro', 1, '100001', '100500'),
  (2, 1, 'Salto', 'Norte', 0, '100501', '101000');

INSERT INTO ciudadano (ci, cc, nombre_completo, fecha_nacimiento) VALUES
  ('12345678', '100150', 'Juan Pérez García', '1990-05-15'),
  ('23456789', '100250', 'María González López', '1985-08-20'),
  ('34567890', '100350', 'Carlos Rodríguez Silva', '1978-03-10'),
  ('45678901', '100450', 'Ana Martínez Ruiz', '1992-11-25'),
  ('56789012', '100550', 'Pedro Fernández Díaz', '1980-07-08'),
  ('67890123', '100650', 'Laura Sánchez Torres', '1995-01-30'),
  ('78901234', '100750', 'Roberto Díaz Castro', '1975-12-05'),
  ('89012345', '100850', 'Sofía Herrera Vega', '1988-09-18'),
  ('90123456', '100950', 'Diego Morales Pintos', '1993-04-22'),
  ('11223344', '101050', 'Valentina Acosta Lima', '1991-06-14');

INSERT INTO votante (id_ciudadano, id_circuito_asignado) VALUES
  (1, 1), (2, 1), (5, 1), (6, 2), (9, 2), (10, 2);

INSERT INTO miembro_mesa (id_ciudadano, id_organismo) VALUES
  (3, 1), (4, 2), (7, 3);

INSERT INTO comisaria (nombre, id_departamento) VALUES
  ('Comisaría 1ª Salto', 1),
  ('Comisaría Artigas', 2);

INSERT INTO policia (id_ciudadano, id_comisaria) VALUES
  (8, 1);

INSERT INTO policia_establecimiento (id_establecimiento, id_policia) VALUES
  (1, 8), (2, 8);

INSERT INTO mesa (id_circuito, id_presidente, id_secretario, id_vocal) VALUES
  (1, 3, 4, 7),
  (2, 3, 4, 7);

INSERT INTO partido_politico (nombre, direccion_sede, id_presidente, id_vicepresidente) VALUES
  ('Frente Amplio', 'Av. Brasil 1234, Salto', 1, 2),
  ('Partido Nacional', 'Bvar. Artigas 567, Salto', 5, 6),
  ('Partido Colorado', 'Calle Uruguay 890, Salto', 9, 10);

INSERT INTO eleccion (nombre, fecha, tipo) VALUES
  ('Elecciones Municipales 2025', '2025-05-11', 'municipal');

INSERT INTO papeleta (id_eleccion, color, descripcion, es_lista) VALUES
  (1, 'celeste', 'Listas Junta Departamental', 1),
  (1, 'blanco', 'Candidatos a Intendente', 0),
  (1, 'verde', 'Candidatos a Alcalde', 0);

INSERT INTO candidato (id_ciudadano, id_partido, id_eleccion, cargo, id_departamento, id_municipio) VALUES
  (1, 1, 1, 'intendente', 1, NULL),
  (5, 2, 1, 'intendente', 1, NULL),
  (9, 3, 1, 'intendente', 1, NULL),
  (2, 1, 1, 'alcalde', 1, 1),
  (6, 2, 1, 'alcalde', 1, 1),
  (10, 3, 1, 'alcalde', 1, 1),
  (1, 1, 1, 'edil', 1, NULL),
  (5, 1, 1, 'edil', 1, NULL),
  (2, 2, 1, 'edil', 1, NULL),
  (6, 2, 1, 'edil', 1, NULL);

INSERT INTO lista (numero, id_partido, id_eleccion, organo, id_departamento, id_candidato_apoya, id_papeleta) VALUES
  (1001, 1, 1, 'junta_departamental', 1, 1, 1),
  (1002, 2, 1, 'junta_departamental', 1, 5, 1),
  (1003, 3, 1, 'junta_departamental', 1, 9, 1);

INSERT INTO lista_integrante (id_lista, id_candidato, orden) VALUES
  (1, 7, 1), (1, 8, 2),
  (2, 9, 1), (2, 10, 2),
  (3, 7, 1);

-- Usuarios demo (hashes bcrypt pre-computados)
INSERT INTO usuario (id_ciudadano, password_hash, rol) VALUES
  (1, '$2a$10$PnlcAH7C9VgZgpy2PYH/Tux2mQUhI5umqbFNNFXw6Q4XVvRv2ehh2', 'votante'),
  (3, '$2a$10$IS64jsT4zleli/jY0/sQN.D36wywHAEA56/.LsFV6nqCCo1hqbzUq', 'presidente_mesa'),
  (2, '$2a$10$PcIcmANSbP76Yleg67TUMu50/qF1BkOnJDaf/cDBzj5hNTipzNoLC', 'admin');
