# Sistema de Votación Electrónica — BD2 Trabajo Obligatorio Grupo C

Prototipo cliente-servidor para la Corte Electoral de Uruguay. Implementa el MER del informe con MySQL y Node.js/Express.

## Requisitos cumplidos

- Arquitectura cliente-servidor con base de datos SQL relacional (MySQL 8)
- Registro de ciudadanos/votantes
- Carga de elecciones, circuitos, partidos, listas, candidatos y votantes
- Emisión de voto con **secreto del sufragio** (tablas `participacion` y `voto` separadas)
- Un voto por elección por votante
- Voto observado si el circuito no coincide con el padrón
- Cierre de mesa (sin reapertura ni votos posteriores)
- Resultados visibles solo con mesa cerrada
- Reportes por departamento, partido y candidato
- Imagen Docker lista para desplegar

## Inicio rápido con Docker

```bash
docker compose up --build
```

Luego abrir http://localhost:3000

La inicialización de Docker crea automáticamente usuarios demo:

| Rol | CI | Contraseña |
|-----|-----|------------|
| Votante | 12345678 | votante123 |
| Presidente mesa | 34567890 | presidente123 |
| Admin | 23456789 | admin123 |

## Inicio local (sin Docker)

```bash
npm install
# Configurar MySQL y copiar .env.example a .env
npm run init-db
npm start
```

## Estructura

```
database/
  schema.sql    # Modelo físico (MER + extensiones mínimas)
  seed.sql      # Datos de ejemplo — elección municipal Salto
  queries.sql   # Consultas de reportes de la consigna
server/         # API REST Express
public/         # Interfaz web
```

## Secreto del voto

El modelo separa **Participación** (quién votó) de **Voto** (qué se votó). No existe FK entre ambas tablas. La restricción de un voto por elección se garantiza con `UNIQUE(id_votante, id_eleccion)` en participación.

## Extensiones al MER documentado

- `municipio`: requerido por alcaldes/concejales (no estaba en el MER)
- `mesa.cerrada` / `fecha_cierre`: regla de negocio de cierre
- `voto.observado_autorizado`: autorización del presidente para votos observados
- `lista_integrante.orden`: orden en la lista electoral

## Informe

El informe en PDF está en `BD2_Trabajo_Obligatorio-Grupo_C.pdf`.
