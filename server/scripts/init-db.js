const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSqlFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const root = path.join(__dirname, '..', '..');
  const schemaPath = path.join(root, 'database', 'schema.sql');
  const seedPath = path.join(root, 'database', 'seed.sql');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    multipleStatements: true
  });

  console.log('Ejecutando schema...');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await connection.query(schema);

  console.log('Ejecutando seed...');
  const seed = fs.readFileSync(seedPath, 'utf8');
  await connection.query(seed);

  const hashVotante = await bcrypt.hash('votante123', 10);
  const hashPresidente = await bcrypt.hash('presidente123', 10);
  const hashAdmin = await bcrypt.hash('admin123', 10);

  await connection.query('USE elecciones_db');
  await connection.query('DELETE FROM usuario');
  await connection.query(
    `INSERT INTO usuario (id_ciudadano, password_hash, rol) VALUES
      (1, ?, 'votante'),
      (3, ?, 'presidente_mesa'),
      (2, ?, 'admin')`,
    [hashVotante, hashPresidente, hashAdmin]
  );

  console.log('Base de datos inicializada.');
  console.log('Usuarios demo:');
  console.log('  Votante: CI 12345678 / votante123');
  console.log('  Presidente mesa: CI 34567890 / presidente123');
  console.log('  Admin: CI 23456789 / admin123');

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
