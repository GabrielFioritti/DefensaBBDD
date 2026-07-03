const express = require('express');
const { query, withTransaction } = require('../db');

const router = express.Router();

function validarAnulacion(listasIds) {
  if (!listasIds || listasIds.length === 0) return 'blanco';
  const partidos = new Set();
  for (const l of listasIds) partidos.add(l.id_partido);
  if (partidos.size > 1) return 'anulado';
  if (listasIds.length > 2) return 'anulado';
  return 'valido';
}

router.get('/eleccion/:idEleccion/listas', async (req, res) => {
  try {
    const rows = await query(
      `SELECT l.*, pp.nombre AS partido_nombre
       FROM lista l
       JOIN partido_politico pp ON pp.id_partido = l.id_partido
       WHERE l.id_eleccion = ?
       ORDER BY l.numero`,
      [req.params.idEleccion]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/votante/:idVotante/participacion/:idEleccion', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM participacion WHERE id_votante = ? AND id_eleccion = ?',
      [req.params.idVotante, req.params.idEleccion]
    );
    res.json({ ya_voto: rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/emitir', async (req, res) => {
  try {
    const {
      id_votante, id_eleccion, id_circuito, listas = [], papeletas = [],
      en_blanco = false, forzar_anulado = false
    } = req.body;

    const votanteRows = await query(
      'SELECT * FROM votante WHERE id_ciudadano = ?',
      [id_votante]
    );
    if (!votanteRows.length) {
      return res.status(400).json({ error: 'El ciudadano no es votante habilitado' });
    }
    const votante = votanteRows[0];

    const participacion = await query(
      'SELECT id_participacion FROM participacion WHERE id_votante = ? AND id_eleccion = ?',
      [id_votante, id_eleccion]
    );
    if (participacion.length) {
      return res.status(409).json({ error: 'Ya emitió su voto en esta elección' });
    }

    const mesaRows = await query(
      'SELECT * FROM mesa WHERE id_circuito = ?',
      [id_circuito]
    );
    if (!mesaRows.length) {
      return res.status(400).json({ error: 'El circuito no tiene mesa configurada' });
    }
    if (mesaRows[0].cerrada) {
      return res.status(403).json({ error: 'La mesa está cerrada. No se pueden registrar más votos.' });
    }

    const observado = votante.id_circuito_asignado !== null &&
      Number(votante.id_circuito_asignado) !== Number(id_circuito);

    let estado = 'valido';
    if (en_blanco) {
      estado = 'blanco';
    } else if (forzar_anulado) {
      estado = 'anulado';
    } else if (listas.length) {
      const placeholders = listas.map(() => '?').join(',');
      const listasInfo = await query(
        `SELECT id_lista, id_partido FROM lista WHERE id_lista IN (${placeholders})`,
        listas
      );
      estado = validarAnulacion(listasInfo);
    }

    const result = await withTransaction(async (conn) => {
      await conn.execute(
        'INSERT INTO participacion (id_votante, id_eleccion) VALUES (?, ?)',
        [id_votante, id_eleccion]
      );

      const [votoResult] = await conn.execute(
        `INSERT INTO voto (id_circuito, id_eleccion, observado, estado)
         VALUES (?, ?, ?, ?)`,
        [id_circuito, id_eleccion, observado ? 1 : 0, estado]
      );
      const idVoto = votoResult.insertId;

      for (const idLista of listas) {
        await conn.execute('INSERT INTO voto_lista (id_voto, id_lista) VALUES (?, ?)', [idVoto, idLista]);
      }
      for (const idPapeleta of papeletas) {
        await conn.execute('INSERT INTO voto_papeleta (id_voto, id_papeleta) VALUES (?, ?)', [idVoto, idPapeleta]);
      }

      await conn.execute(
        'UPDATE circuito SET votos_emitidos = votos_emitidos + 1 WHERE id_circuito = ?',
        [id_circuito]
      );

      return { id_voto: idVoto, estado, observado };
    });

    res.status(201).json({
      message: 'Voto registrado. El sufragio es secreto: no queda vínculo entre votante y contenido.',
      ...result,
      requiere_autorizacion: observado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/autorizar-observado/:idVoto', async (req, res) => {
  try {
    const { id_presidente } = req.body;
    const mesa = await query(
      `SELECT m.* FROM mesa m
       JOIN voto v ON v.id_circuito = m.id_circuito
       WHERE v.id_voto = ? AND m.id_presidente = ?`,
      [req.params.idVoto, id_presidente]
    );
    if (!mesa.length) {
      return res.status(403).json({ error: 'Solo el presidente de la mesa puede autorizar este voto' });
    }

    await query(
      'UPDATE voto SET observado_autorizado = 1 WHERE id_voto = ? AND observado = 1',
      [req.params.idVoto]
    );
    res.json({ message: 'Voto observado autorizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/observados-pendientes/:idPresidente', async (req, res) => {
  try {
    const rows = await query(
      `SELECT v.id_voto, v.id_circuito, v.fecha_hora,
              c.ciudad_paraje, c.barrio
       FROM voto v
       JOIN mesa m ON m.id_circuito = v.id_circuito
       JOIN circuito c ON c.id_circuito = v.id_circuito
       WHERE m.id_presidente = ?
         AND v.observado = 1
         AND v.observado_autorizado = 0
         AND m.cerrada = 0
       ORDER BY v.fecha_hora`,
      [req.params.idPresidente]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cerrar-mesa/:idMesa', async (req, res) => {
  try {
    const { id_presidente } = req.body;
    const mesaRows = await query('SELECT * FROM mesa WHERE id_mesa = ?', [req.params.idMesa]);
    if (!mesaRows.length) return res.status(404).json({ error: 'Mesa no encontrada' });

    const mesa = mesaRows[0];
    if (mesa.cerrada) {
      return res.status(403).json({ error: 'La mesa ya está cerrada y no puede reabrirse' });
    }
    if (Number(mesa.id_presidente) !== Number(id_presidente)) {
      return res.status(403).json({ error: 'Solo el presidente puede cerrar la mesa' });
    }

    await query(
      'UPDATE mesa SET cerrada = 1, fecha_cierre = NOW() WHERE id_mesa = ?',
      [req.params.idMesa]
    );
    res.json({ message: 'Mesa cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/resultados/circuito/:idCircuito/:idEleccion', async (req, res) => {
  try {
    const { idCircuito, idEleccion } = req.params;
    const mesa = await query('SELECT cerrada FROM mesa WHERE id_circuito = ?', [idCircuito]);
    if (!mesa.length || !mesa[0].cerrada) {
      return res.status(403).json({ error: 'Los resultados solo están disponibles cuando la mesa fue cerrada' });
    }

    const totales = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN estado = 'valido' THEN 1 ELSE 0 END) AS validos,
         SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END) AS anulados,
         SUM(CASE WHEN estado = 'blanco' THEN 1 ELSE 0 END) AS blancos,
         SUM(CASE WHEN observado = 1 THEN 1 ELSE 0 END) AS observados
       FROM voto WHERE id_circuito = ? AND id_eleccion = ?`,
      [idCircuito, idEleccion]
    );

    const porLista = await query(
      `SELECT l.numero, pp.nombre AS partido, COUNT(*) AS votos
       FROM voto v
       JOIN voto_lista vl ON vl.id_voto = v.id_voto
       JOIN lista l ON l.id_lista = vl.id_lista
       JOIN partido_politico pp ON pp.id_partido = l.id_partido
       WHERE v.id_circuito = ? AND v.id_eleccion = ? AND v.estado = 'valido'
       GROUP BY l.id_lista, l.numero, pp.nombre
       ORDER BY votos DESC`,
      [idCircuito, idEleccion]
    );

    const total = totales[0].total || 0;
    const porListaConPorcentaje = porLista.map((row) => ({
      ...row,
      porcentaje: total ? ((row.votos / total) * 100).toFixed(2) : '0.00'
    }));

    res.json({ totales: totales[0], por_lista: porListaConPorcentaje });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reportes/departamento/:idEleccion', async (req, res) => {
  try {
    const rows = await query(
      `SELECT d.nombre AS departamento,
              SUM(CASE WHEN v.estado = 'valido' THEN 1 ELSE 0 END) AS validos,
              SUM(CASE WHEN v.observado = 1 THEN 1 ELSE 0 END) AS observados,
              SUM(CASE WHEN v.estado = 'anulado' THEN 1 ELSE 0 END) AS anulados,
              COUNT(*) AS total
       FROM voto v
       JOIN circuito c ON c.id_circuito = v.id_circuito
       JOIN departamento d ON d.id_departamento = c.id_departamento
       JOIN mesa m ON m.id_circuito = c.id_circuito
       WHERE v.id_eleccion = ? AND m.cerrada = 1
       GROUP BY d.id_departamento, d.nombre`,
      [req.params.idEleccion]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reportes/partido/:idEleccion', async (req, res) => {
  try {
    const rows = await query(
      `SELECT pp.nombre AS partido,
              SUM(CASE WHEN v.estado = 'valido' THEN 1 ELSE 0 END) AS validos,
              SUM(CASE WHEN v.observado = 1 THEN 1 ELSE 0 END) AS observados,
              SUM(CASE WHEN v.estado = 'anulado' THEN 1 ELSE 0 END) AS anulados,
              COUNT(DISTINCT v.id_voto) AS total
       FROM voto v
       JOIN voto_lista vl ON vl.id_voto = v.id_voto
       JOIN lista l ON l.id_lista = vl.id_lista
       JOIN partido_politico pp ON pp.id_partido = l.id_partido
       JOIN circuito c ON c.id_circuito = v.id_circuito
       JOIN mesa m ON m.id_circuito = c.id_circuito
       WHERE v.id_eleccion = ? AND m.cerrada = 1
       GROUP BY pp.id_partido, pp.nombre`,
      [req.params.idEleccion]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reportes/candidato/:idEleccion', async (req, res) => {
  try {
    const rows = await query(
      `SELECT ciu.nombre_completo AS candidato, ca.cargo,
              SUM(CASE WHEN v.estado = 'valido' THEN 1 ELSE 0 END) AS validos,
              SUM(CASE WHEN v.observado = 1 THEN 1 ELSE 0 END) AS observados,
              SUM(CASE WHEN v.estado = 'anulado' THEN 1 ELSE 0 END) AS anulados
       FROM voto v
       JOIN voto_lista vl ON vl.id_voto = v.id_voto
       JOIN lista_integrante li ON li.id_lista = vl.id_lista
       JOIN candidato ca ON ca.id_candidato = li.id_candidato
       JOIN ciudadano ciu ON ciu.id_ciudadano = ca.id_ciudadano
       JOIN circuito c ON c.id_circuito = v.id_circuito
       JOIN mesa m ON m.id_circuito = c.id_circuito
       WHERE v.id_eleccion = ? AND m.cerrada = 1
       GROUP BY ca.id_candidato, ciu.nombre_completo, ca.cargo`,
      [req.params.idEleccion]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
