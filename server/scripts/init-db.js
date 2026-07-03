const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

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

  console.log('Ejecutando seed (datos + usuarios demo)...');
  const seed = fs.readFileSync(seedPath, 'utf8');
  await connection.query(seed);

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
