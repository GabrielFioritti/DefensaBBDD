const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/departamentos', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM departamento ORDER BY nombre'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/circuitos', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT c.*, e.nombre AS establecimiento, e.tipo AS tipo_establecimiento,
              d.nombre AS departamento, m.cerrada AS mesa_cerrada, m.id_mesa
       FROM circuito c
       JOIN establecimiento e ON e.id_establecimiento = c.id_establecimiento
       JOIN departamento d ON d.id_departamento = c.id_departamento
       LEFT JOIN mesa m ON m.id_circuito = c.id_circuito
       ORDER BY c.id_circuito`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/circuitos', async (req, res) => {
  try {
    const {
      id_establecimiento, id_departamento, ciudad_paraje, barrio,
      accesible, cc_desde, cc_hasta,
      id_presidente, id_secretario, id_vocal
    } = req.body;

    const result = await query(
      `INSERT INTO circuito (id_establecimiento, id_departamento, ciudad_paraje, barrio, accesible, cc_desde, cc_hasta)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_establecimiento, id_departamento, ciudad_paraje, barrio || null, accesible ? 1 : 0, cc_desde, cc_hasta]
    );

    if (id_presidente && id_secretario && id_vocal) {
      await query(
        `INSERT INTO mesa (id_circuito, id_presidente, id_secretario, id_vocal)
         VALUES (?, ?, ?, ?)`,
        [result.insertId, id_presidente, id_secretario, id_vocal]
      );
    }

    res.status(201).json({ id_circuito: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/elecciones', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM eleccion ORDER BY fecha DESC'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/elecciones', async (req, res) => {
  try {
    const { nombre, fecha, tipo } = req.body;
    const result = await query(
      'INSERT INTO eleccion (nombre, fecha, tipo) VALUES (?, ?, ?)',
      [nombre, fecha, tipo]
    );
    res.status(201).json({ id_eleccion: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/partidos', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT p.*,
              cp.nombre_completo AS presidente_nombre,
              cv.nombre_completo AS vicepresidente_nombre
       FROM partido_politico p
       LEFT JOIN ciudadano cp ON cp.id_ciudadano = p.id_presidente
       LEFT JOIN ciudadano cv ON cv.id_ciudadano = p.id_vicepresidente
       ORDER BY p.nombre`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/partidos', async (req, res) => {
  try {
    const { nombre, direccion_sede, id_presidente, id_vicepresidente } = req.body;
    const result = await query(
      `INSERT INTO partido_politico (nombre, direccion_sede, id_presidente, id_vicepresidente)
       VALUES (?, ?, ?, ?)`,
      [nombre, direccion_sede || null, id_presidente || null, id_vicepresidente || null]
    );
    res.status(201).json({ id_partido: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/listas', async (req, res) => {
  try {
    const { id_eleccion } = req.query;
    let sql = `
      SELECT l.*, pp.nombre AS partido, e.nombre AS eleccion
      FROM lista l
      JOIN partido_politico pp ON pp.id_partido = l.id_partido
      JOIN eleccion e ON e.id_eleccion = l.id_eleccion`;
    const params = [];
    if (id_eleccion) {
      sql += ' WHERE l.id_eleccion = ?';
      params.push(id_eleccion);
    }
    sql += ' ORDER BY l.numero';
    res.json(await query(sql, params));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/listas', async (req, res) => {
  try {
    const { numero, id_partido, id_eleccion, organo, id_departamento, id_candidato_apoya, id_papeleta } = req.body;
    const result = await query(
      `INSERT INTO lista (numero, id_partido, id_eleccion, organo, id_departamento, id_candidato_apoya, id_papeleta)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [numero, id_partido, id_eleccion, organo, id_departamento || null, id_candidato_apoya || null, id_papeleta || null]
    );
    res.status(201).json({ id_lista: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/candidatos', async (req, res) => {
  try {
    const { id_eleccion } = req.query;
    let sql = `
      SELECT ca.*, c.nombre_completo, c.ci, pp.nombre AS partido
      FROM candidato ca
      JOIN ciudadano c ON c.id_ciudadano = ca.id_ciudadano
      JOIN partido_politico pp ON pp.id_partido = ca.id_partido`;
    const params = [];
    if (id_eleccion) {
      sql += ' WHERE ca.id_eleccion = ?';
      params.push(id_eleccion);
    }
    sql += ' ORDER BY ca.cargo, c.nombre_completo';
    res.json(await query(sql, params));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/candidatos', async (req, res) => {
  try {
    const { id_ciudadano, id_partido, id_eleccion, cargo, id_departamento, id_municipio } = req.body;
    const result = await query(
      `INSERT INTO candidato (id_ciudadano, id_partido, id_eleccion, cargo, id_departamento, id_municipio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_ciudadano, id_partido, id_eleccion, cargo, id_departamento || null, id_municipio || null]
    );
    res.status(201).json({ id_candidato: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/votantes', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT v.id_ciudadano, c.ci, c.nombre_completo, v.id_circuito_asignado,
              e.nombre AS establecimiento, d.nombre AS departamento
       FROM votante v
       JOIN ciudadano c ON c.id_ciudadano = v.id_ciudadano
       LEFT JOIN circuito ci ON ci.id_circuito = v.id_circuito_asignado
       LEFT JOIN establecimiento e ON e.id_establecimiento = ci.id_establecimiento
       LEFT JOIN departamento d ON d.id_departamento = ci.id_departamento
       ORDER BY c.nombre_completo`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/votantes', async (req, res) => {
  try {
    const { id_ciudadano, id_circuito_asignado } = req.body;
    await query(
      'INSERT INTO votante (id_ciudadano, id_circuito_asignado) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_circuito_asignado = VALUES(id_circuito_asignado)',
      [id_ciudadano, id_circuito_asignado]
    );
    res.status(201).json({ message: 'Votante registrado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/establecimientos', async (_req, res) => {
  try {
    res.json(await query(
      `SELECT e.*, z.nombre AS zona FROM establecimiento e JOIN zona z ON z.id_zona = e.id_zona`
    ));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
