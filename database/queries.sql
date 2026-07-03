USE elecciones_db;

-- 1. Votos emitidos por departamento (válidos, observados, anulados)
SELECT
  d.nombre AS departamento,
  SUM(CASE WHEN v.estado = 'valido' THEN 1 ELSE 0 END) AS validos,
  SUM(CASE WHEN v.observado = 1 THEN 1 ELSE 0 END) AS observados,
  SUM(CASE WHEN v.estado = 'anulado' THEN 1 ELSE 0 END) AS anulados,
  COUNT(*) AS total_emitidos
FROM voto v
JOIN circuito c ON c.id_circuito = v.id_circuito
JOIN departamento d ON d.id_departamento = c.id_departamento
GROUP BY d.id_departamento, d.nombre
ORDER BY d.nombre;

-- 2. Votos emitidos por partido
SELECT
  pp.nombre AS partido,
  SUM(CASE WHEN v.estado = 'valido' THEN 1 ELSE 0 END) AS validos,
  SUM(CASE WHEN v.observado = 1 THEN 1 ELSE 0 END) AS observados,
  SUM(CASE WHEN v.estado = 'anulado' THEN 1 ELSE 0 END) AS anulados,
  COUNT(DISTINCT v.id_voto) AS total_votos_con_lista
FROM voto v
JOIN voto_lista vl ON vl.id_voto = v.id_voto
JOIN lista l ON l.id_lista = vl.id_lista
JOIN partido_politico pp ON pp.id_partido = l.id_partido
GROUP BY pp.id_partido, pp.nombre
ORDER BY pp.nombre;

-- 3. Votos emitidos por candidato
SELECT
  ciu.nombre_completo AS candidato,
  ca.cargo,
  SUM(CASE WHEN v.estado = 'valido' THEN 1 ELSE 0 END) AS validos,
  SUM(CASE WHEN v.observado = 1 THEN 1 ELSE 0 END) AS observados,
  SUM(CASE WHEN v.estado = 'anulado' THEN 1 ELSE 0 END) AS anulados
FROM voto v
JOIN voto_lista vl ON vl.id_voto = v.id_voto
JOIN lista_integrante li ON li.id_lista = vl.id_lista
JOIN candidato ca ON ca.id_candidato = li.id_candidato
JOIN ciudadano ciu ON ciu.id_ciudadano = ca.id_ciudadano
GROUP BY ca.id_candidato, ciu.nombre_completo, ca.cargo
ORDER BY validos DESC;
