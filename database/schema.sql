-- Sistema de Votación Electrónica - Grupo C
-- Modelo físico basado en MER_Obligatorio.pdf

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS elecciones_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE elecciones_db;

DROP TABLE IF EXISTS voto_papeleta;
DROP TABLE IF EXISTS voto_lista;
DROP TABLE IF EXISTS voto;
DROP TABLE IF EXISTS participacion;
DROP TABLE IF EXISTS lista_integrante;
DROP TABLE IF EXISTS lista;
DROP TABLE IF EXISTS candidato;
DROP TABLE IF EXISTS papeleta;
DROP TABLE IF EXISTS eleccion;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS policia_establecimiento;
DROP TABLE IF EXISTS mesa;
DROP TABLE IF EXISTS votante;
DROP TABLE IF EXISTS policia;
DROP TABLE IF EXISTS miembro_mesa;
DROP TABLE IF EXISTS circuito;
DROP TABLE IF EXISTS establecimiento;
DROP TABLE IF EXISTS zona;
DROP TABLE IF EXISTS comisaria;
DROP TABLE IF EXISTS municipio;
DROP TABLE IF EXISTS partido_politico;
DROP TABLE IF EXISTS organismo_estado;
DROP TABLE IF EXISTS departamento;
DROP TABLE IF EXISTS ciudadano;

CREATE TABLE departamento (
  id_departamento INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE municipio (
  id_municipio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  id_departamento INT NOT NULL,
  CONSTRAINT fk_municipio_departamento
    FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

CREATE TABLE organismo_estado (
  id_organismo INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE ciudadano (
  id_ciudadano INT AUTO_INCREMENT PRIMARY KEY,
  ci VARCHAR(20) NOT NULL UNIQUE,
  cc VARCHAR(20) NOT NULL UNIQUE,
  nombre_completo VARCHAR(200) NOT NULL,
  fecha_nacimiento DATE NOT NULL
);

CREATE TABLE zona (
  id_zona INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE establecimiento (
  id_establecimiento INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('Escuela', 'Liceo', 'Universidad', 'Otro') NOT NULL,
  id_zona INT NOT NULL,
  CONSTRAINT fk_establecimiento_zona
    FOREIGN KEY (id_zona) REFERENCES zona(id_zona)
);

CREATE TABLE circuito (
  id_circuito INT AUTO_INCREMENT PRIMARY KEY,
  id_establecimiento INT NOT NULL,
  id_departamento INT NOT NULL,
  ciudad_paraje VARCHAR(100) NOT NULL,
  barrio VARCHAR(100) NULL,
  accesible TINYINT(1) NOT NULL DEFAULT 0,
  cc_desde VARCHAR(20) NOT NULL,
  cc_hasta VARCHAR(20) NOT NULL,
  votos_emitidos INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_circuito_establecimiento
    FOREIGN KEY (id_establecimiento) REFERENCES establecimiento(id_establecimiento),
  CONSTRAINT fk_circuito_departamento
    FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

CREATE TABLE votante (
  id_ciudadano INT PRIMARY KEY,
  id_circuito_asignado INT NULL,
  CONSTRAINT fk_votante_ciudadano
    FOREIGN KEY (id_ciudadano) REFERENCES ciudadano(id_ciudadano),
  CONSTRAINT fk_votante_circuito
    FOREIGN KEY (id_circuito_asignado) REFERENCES circuito(id_circuito)
);

CREATE TABLE miembro_mesa (
  id_ciudadano INT PRIMARY KEY,
  id_organismo INT NOT NULL,
  CONSTRAINT fk_miembro_ciudadano
    FOREIGN KEY (id_ciudadano) REFERENCES ciudadano(id_ciudadano),
  CONSTRAINT fk_miembro_organismo
    FOREIGN KEY (id_organismo) REFERENCES organismo_estado(id_organismo)
);

CREATE TABLE comisaria (
  id_comisaria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  id_departamento INT NOT NULL,
  CONSTRAINT fk_comisaria_departamento
    FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

CREATE TABLE policia (
  id_ciudadano INT PRIMARY KEY,
  id_comisaria INT NOT NULL,
  CONSTRAINT fk_policia_ciudadano
    FOREIGN KEY (id_ciudadano) REFERENCES ciudadano(id_ciudadano),
  CONSTRAINT fk_policia_comisaria
    FOREIGN KEY (id_comisaria) REFERENCES comisaria(id_comisaria)
);

CREATE TABLE policia_establecimiento (
  id_establecimiento INT NOT NULL,
  id_policia INT NOT NULL,
  PRIMARY KEY (id_establecimiento, id_policia),
  CONSTRAINT fk_pe_establecimiento
    FOREIGN KEY (id_establecimiento) REFERENCES establecimiento(id_establecimiento),
  CONSTRAINT fk_pe_policia
    FOREIGN KEY (id_policia) REFERENCES policia(id_ciudadano)
);

CREATE TABLE mesa (
  id_mesa INT AUTO_INCREMENT PRIMARY KEY,
  id_circuito INT NOT NULL UNIQUE,
  id_presidente INT NOT NULL,
  id_secretario INT NOT NULL,
  id_vocal INT NOT NULL,
  cerrada TINYINT(1) NOT NULL DEFAULT 0,
  fecha_cierre DATETIME NULL,
  CONSTRAINT fk_mesa_circuito
    FOREIGN KEY (id_circuito) REFERENCES circuito(id_circuito),
  CONSTRAINT fk_mesa_presidente
    FOREIGN KEY (id_presidente) REFERENCES miembro_mesa(id_ciudadano),
  CONSTRAINT fk_mesa_secretario
    FOREIGN KEY (id_secretario) REFERENCES miembro_mesa(id_ciudadano),
  CONSTRAINT fk_mesa_vocal
    FOREIGN KEY (id_vocal) REFERENCES miembro_mesa(id_ciudadano)
);

CREATE TABLE partido_politico (
  id_partido INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  direccion_sede VARCHAR(250) NULL,
  id_presidente INT NULL,
  id_vicepresidente INT NULL,
  CONSTRAINT fk_partido_presidente
    FOREIGN KEY (id_presidente) REFERENCES ciudadano(id_ciudadano),
  CONSTRAINT fk_partido_vicepresidente
    FOREIGN KEY (id_vicepresidente) REFERENCES ciudadano(id_ciudadano)
);

CREATE TABLE eleccion (
  id_eleccion INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  fecha DATE NOT NULL,
  tipo ENUM('presidencial', 'municipal', 'ballotage', 'plebiscito', 'referendum') NOT NULL
);

CREATE TABLE papeleta (
  id_papeleta INT AUTO_INCREMENT PRIMARY KEY,
  id_eleccion INT NOT NULL,
  color VARCHAR(50) NOT NULL,
  descripcion VARCHAR(200) NULL,
  es_lista TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_papeleta_eleccion
    FOREIGN KEY (id_eleccion) REFERENCES eleccion(id_eleccion)
);

CREATE TABLE candidato (
  id_candidato INT AUTO_INCREMENT PRIMARY KEY,
  id_ciudadano INT NOT NULL,
  id_partido INT NOT NULL,
  id_eleccion INT NOT NULL,
  cargo ENUM('intendente', 'alcalde', 'presidente', 'vicepresidente', 'edil', 'concejal', 'senador', 'diputado', 'otro') NOT NULL,
  id_departamento INT NULL,
  id_municipio INT NULL,
  CONSTRAINT fk_candidato_ciudadano
    FOREIGN KEY (id_ciudadano) REFERENCES ciudadano(id_ciudadano),
  CONSTRAINT fk_candidato_partido
    FOREIGN KEY (id_partido) REFERENCES partido_politico(id_partido),
  CONSTRAINT fk_candidato_eleccion
    FOREIGN KEY (id_eleccion) REFERENCES eleccion(id_eleccion),
  CONSTRAINT fk_candidato_departamento
    FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento),
  CONSTRAINT fk_candidato_municipio
    FOREIGN KEY (id_municipio) REFERENCES municipio(id_municipio)
);

CREATE TABLE lista (
  id_lista INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL UNIQUE,
  id_partido INT NOT NULL,
  id_eleccion INT NOT NULL,
  organo ENUM('diputados', 'senadores', 'junta_departamental', 'concejales') NOT NULL,
  id_departamento INT NULL,
  id_candidato_apoya INT NULL,
  id_papeleta INT NULL,
  CONSTRAINT fk_lista_partido
    FOREIGN KEY (id_partido) REFERENCES partido_politico(id_partido),
  CONSTRAINT fk_lista_eleccion
    FOREIGN KEY (id_eleccion) REFERENCES eleccion(id_eleccion),
  CONSTRAINT fk_lista_departamento
    FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento),
  CONSTRAINT fk_lista_candidato_apoya
    FOREIGN KEY (id_candidato_apoya) REFERENCES candidato(id_candidato),
  CONSTRAINT fk_lista_papeleta
    FOREIGN KEY (id_papeleta) REFERENCES papeleta(id_papeleta)
);

CREATE TABLE lista_integrante (
  id_lista INT NOT NULL,
  id_candidato INT NOT NULL,
  orden INT NOT NULL,
  PRIMARY KEY (id_lista, id_candidato),
  CONSTRAINT fk_integrante_lista
    FOREIGN KEY (id_lista) REFERENCES lista(id_lista),
  CONSTRAINT fk_integrante_candidato
    FOREIGN KEY (id_candidato) REFERENCES candidato(id_candidato)
);

CREATE TABLE participacion (
  id_participacion INT AUTO_INCREMENT PRIMARY KEY,
  id_votante INT NOT NULL,
  id_eleccion INT NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_votante_eleccion UNIQUE (id_votante, id_eleccion),
  CONSTRAINT fk_participacion_votante
    FOREIGN KEY (id_votante) REFERENCES votante(id_ciudadano),
  CONSTRAINT fk_participacion_eleccion
    FOREIGN KEY (id_eleccion) REFERENCES eleccion(id_eleccion)
);

CREATE TABLE voto (
  id_voto INT AUTO_INCREMENT PRIMARY KEY,
  id_circuito INT NOT NULL,
  id_eleccion INT NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observado TINYINT(1) NOT NULL DEFAULT 0,
  observado_autorizado TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('valido', 'anulado', 'blanco') NOT NULL DEFAULT 'valido',
  CONSTRAINT fk_voto_circuito
    FOREIGN KEY (id_circuito) REFERENCES circuito(id_circuito),
  CONSTRAINT fk_voto_eleccion
    FOREIGN KEY (id_eleccion) REFERENCES eleccion(id_eleccion)
);

CREATE TABLE voto_lista (
  id_voto INT NOT NULL,
  id_lista INT NOT NULL,
  PRIMARY KEY (id_voto, id_lista),
  CONSTRAINT fk_vl_voto
    FOREIGN KEY (id_voto) REFERENCES voto(id_voto),
  CONSTRAINT fk_vl_lista
    FOREIGN KEY (id_lista) REFERENCES lista(id_lista)
);

CREATE TABLE voto_papeleta (
  id_voto INT NOT NULL,
  id_papeleta INT NOT NULL,
  PRIMARY KEY (id_voto, id_papeleta),
  CONSTRAINT fk_vp_voto
    FOREIGN KEY (id_voto) REFERENCES voto(id_voto),
  CONSTRAINT fk_vp_papeleta
    FOREIGN KEY (id_papeleta) REFERENCES papeleta(id_papeleta)
);

CREATE TABLE usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  id_ciudadano INT NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('votante', 'presidente_mesa', 'admin') NOT NULL DEFAULT 'votante',
  CONSTRAINT fk_usuario_ciudadano
    FOREIGN KEY (id_ciudadano) REFERENCES ciudadano(id_ciudadano)
);

SET FOREIGN_KEY_CHECKS = 1;
