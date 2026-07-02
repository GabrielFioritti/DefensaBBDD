const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db');

const router = express.Router();

function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad -= 1;
  return edad;
}

router.post('/register', async (req, res) => {
  try {
    const { ci, cc, nombre_completo, fecha_nacimiento, password, rol = 'votante' } = req.body;
    if (!ci || !cc || !nombre_completo || !fecha_nacimiento || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (calcularEdad(fecha_nacimiento) < 18) {
      return res.status(400).json({ error: 'Debe ser mayor de 18 años para registrarse' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = await withTransaction(async (conn) => {
      const [ciudadanoResult] = await conn.execute(
        `INSERT INTO ciudadano (ci, cc, nombre_completo, fecha_nacimiento)
         VALUES (?, ?, ?, ?)`,
        [ci, cc, nombre_completo, fecha_nacimiento]
      );
      const idCiudadano = ciudadanoResult.insertId;

      if (rol === 'votante') {
        await conn.execute('INSERT INTO votante (id_ciudadano) VALUES (?)', [idCiudadano]);
      }

      await conn.execute(
        'INSERT INTO usuario (id_ciudadano, password_hash, rol) VALUES (?, ?, ?)',
        [idCiudadano, hash, rol === 'presidente_mesa' ? 'presidente_mesa' : 'votante']
      );

      return idCiudadano;
    });

    res.status(201).json({ message: 'Registro exitoso', id_ciudadano: id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'CI o CC ya registrados' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { ci, password } = req.body;
    const rows = await query(
      `SELECT u.id_usuario, u.password_hash, u.rol, c.id_ciudadano, c.ci, c.cc,
              c.nombre_completo, v.id_circuito_asignado
       FROM usuario u
       JOIN ciudadano c ON c.id_ciudadano = u.id_ciudadano
       LEFT JOIN votante v ON v.id_ciudadano = c.id_ciudadano
       WHERE c.ci = ?`,
      [ci]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    res.json({
      id_usuario: user.id_usuario,
      id_ciudadano: user.id_ciudadano,
      ci: user.ci,
      cc: user.cc,
      nombre_completo: user.nombre_completo,
      rol: user.rol,
      id_circuito_asignado: user.id_circuito_asignado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
