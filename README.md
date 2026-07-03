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

## Entornos Docker

El proyecto tiene dos entornos Docker separados:

| Entorno | Archivo | Comando | Hot-reload |
|---------|---------|---------|------------|
| **Desarrollo** | `docker-compose.yml` | `docker compose up --build` | ✅ Sí |
| **Producción** | `docker-compose.prod.yml` | `docker compose -f docker-compose.prod.yml up --build -d` | ❌ No |

### Desarrollo (hot-reload)

```bash
docker compose up --build
```

Monta el código fuente como volúmenes, por lo que cualquier cambio en `server/`, `public/` o `database/` se refleja al instante. El servidor se reinicia automáticamente con `node --watch`.

Abrir http://localhost:3000

### Producción

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Construye la imagen con el código embebido (sin volúmenes). Ideal para deploy. Los contenedores se reinician automáticamente si fallan.

Abrir http://localhost:3000

### Usuarios demo

En ambos entornos se crean automáticamente al iniciar MySQL:

| Rol | CI | Contraseña |
|-----|-----|------------|
| Votante | 12345678 | votante123 |
| Presidente mesa | 34567890 | presidente123 |
| Admin | 23456789 | admin123 |

## Inicio local (sin Docker)

```bash
npm install
# Configurar MySQL local y copiar .env.example a .env
npm run init-db
npm start
```

Abrir http://localhost:3000

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
