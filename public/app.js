const API = '/api';
let session = JSON.parse(localStorage.getItem('session') || 'null');

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showMessage(el, text, ok = true) {
  el.textContent = text;
  el.className = `message ${ok ? 'ok' : 'err'}`;
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

async function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('btn-loading', loading);
}

function updateUI() {
  const logged = !!session;
  $('#user-bar').classList.toggle('hidden', !logged);
  $('#login-section').classList.toggle('hidden', logged);
  $('#votante-section').classList.toggle('hidden', !logged || session.rol === 'presidente_mesa');
  $('#presidente-section').classList.toggle('hidden', !logged || session.rol !== 'presidente_mesa');
  $('#admin-section').classList.toggle('hidden', !logged || session.rol !== 'admin');

  if (logged) {
    $('#user-name').textContent = session.nombre_completo;
    $('#user-role').textContent = session.rol;
    loadVotanteData();
    loadPresidenteData();
    loadAdminSelects();
  }
}

async function loadElecciones(selectors) {
  const elecciones = await api('/admin/elecciones');
  selectors.forEach((sel) => {
    sel.innerHTML = elecciones.map((e) =>
      `<option value="${e.id_eleccion}">${e.nombre} (${e.tipo})</option>`
    ).join('');
  });
  return elecciones;
}

async function loadCircuitos(selectors) {
  const circuitos = await api('/admin/circuitos');
  selectors.forEach((sel) => {
    sel.innerHTML = circuitos.map((c) =>
      `<option value="${c.id_circuito}" data-mesa="${c.id_mesa || ''}" data-cerrada="${c.mesa_cerrada || 0}">
        Circuito ${c.id_circuito} - ${c.establecimiento} (${c.departamento}) ${c.mesa_cerrada ? '[CERRADA]' : ''}
      </option>`
    ).join('');
  });
  return circuitos;
}

async function loadVotanteData() {
  if (!session || session.rol === 'presidente_mesa') return;
  await loadElecciones([$('#voto-eleccion')]);
  await loadCircuitos([$('#voto-circuito')]);
  await loadListas();
  $('#voto-eleccion').addEventListener('change', loadListas);
  $('#voto-circuito').addEventListener('change', updateCircuitoInfo);
  updateCircuitoInfo();
}

function updateCircuitoInfo() {
  const asignado = session.id_circuito_asignado;
  const actual = $('#voto-circuito').value;
  if (asignado && Number(asignado) !== Number(actual)) {
    $('#circuito-info').textContent =
      `⚠ Vota fuera de su circuito asignado (${asignado}). El voto se marcará como OBSERVADO.`;
  } else {
    $('#circuito-info').textContent = asignado
      ? `Circuito asignado por padrón: ${asignado}`
      : 'Sin circuito asignado en padrón.';
  }
}

async function loadListas() {
  const idEleccion = $('#voto-eleccion').value;
  if (!idEleccion) return;
  const listas = await api(`/votacion/eleccion/${idEleccion}/listas`);
  const container = $('#listas-container');
  if (!listas.length) {
    container.innerHTML = '<p class="info">No hay listas para esta elección.</p>';
    return;
  }
  container.innerHTML = '<h3>Seleccione lista(s)</h3>' + listas.map((l) => `
    <label class="lista-item">
      <input type="checkbox" name="lista" value="${l.id_lista}">
      <span>Lista ${l.numero} — ${l.partido_nombre} (${l.organo})</span>
    </label>
  `).join('');
}

async function loadPresidenteData() {
  if (!session || session.rol !== 'presidente_mesa') return;
  await loadElecciones([$('#pres-eleccion')]);
  await loadCircuitos([$('#pres-circuito')]);
  await loadObservadosPendientes();
  $('#pres-circuito').addEventListener('change', loadObservadosPendientes);
}

async function loadObservadosPendientes() {
  if (!session || session.rol !== 'presidente_mesa') return;
  const container = $('#observados-container');
  const msg = $('#observados-message');
  msg.textContent = '';
  try {
    const votos = await api(`/votacion/observados-pendientes/${session.id_ciudadano}`);
    if (!votos.length) {
      container.innerHTML = '<p class="info" id="observados-empty">No hay votos observados sin autorizar.</p>';
      return;
    }
    container.innerHTML = '<ul class="observados-list">' + votos.map((v) => `
      <li class="observado-item">
        <span>Voto #${v.id_voto} — Circuito ${v.id_circuito} (${v.ciudad_paraje}, ${v.barrio || 'sin barrio'}) — ${new Date(v.fecha_hora).toLocaleString()}</span>
        <button class="btn-primary btn-small btn-autorizar" data-id="${v.id_voto}">Autorizar</button>
      </li>
    `).join('') + '</ul>';
    container.querySelectorAll('.btn-autorizar').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await setLoading(btn, true);
        try {
          await api(`/votacion/autorizar-observado/${btn.dataset.id}`, {
            method: 'POST',
            body: JSON.stringify({ id_presidente: session.id_ciudadano })
          });
          showMessage(msg, 'Voto observado autorizado correctamente.', true);
          await loadObservadosPendientes();
        } catch (err) {
          showMessage(msg, err.message, false);
          await setLoading(btn, false);
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="info">Error al cargar: ${err.message}</p>`;
  }
}

function renderTabla(tbody, data, cols) {
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="99" class="empty">Sin datos</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((row) => {
    const cells = cols.map((c) => {
      let val = row[c.key];
      if (c.fn) val = c.fn(val, row);
      return `<td>${val ?? ''}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}

async function loadAdminData() {
  if (!session || session.rol !== 'admin') return;
  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;
  const tabId = activeTab.dataset.tab;
  if (tabId === 'tab-eleccion') await renderElecciones();
  else if (tabId === 'tab-partido') await renderPartidos();
  else if (tabId === 'tab-lista') await renderListas();
  else if (tabId === 'tab-candidato') await renderCandidatos();
  else if (tabId === 'tab-votante') await renderVotantes();
}

async function renderElecciones() {
  const data = await api('/admin/elecciones');
  const cols = [
    { key: 'id_eleccion' },
    { key: 'nombre' },
    { key: 'fecha', fn: (v) => { if (!v) return '-'; const d = new Date(v); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; } },
    { key: 'tipo' }
  ];
  renderTabla(
    document.querySelector('#lista-elecciones table tbody'),
    data, cols
  );
}

async function renderPartidos() {
  const data = await api('/admin/partidos');
  const cols = [
    { key: 'id_partido' },
    { key: 'nombre' },
    { key: 'direccion_sede', fn: (v) => v || '-' },
    { key: 'presidente_nombre', fn: (v) => v || '-' },
    { key: 'vicepresidente_nombre', fn: (v) => v || '-' }
  ];
  renderTabla(
    document.querySelector('#lista-partidos table tbody'),
    data, cols
  );
}

async function renderListas() {
  const data = await api('/admin/listas');
  const cols = [
    { key: 'numero' },
    { key: 'partido' },
    { key: 'eleccion' },
    { key: 'organo' }
  ];
  renderTabla(
    document.querySelector('#lista-listas table tbody'),
    data, cols
  );
}

async function renderCandidatos() {
  const data = await api('/admin/candidatos');
  const cols = [
    { key: 'id_candidato' },
    { key: 'nombre_completo' },
    { key: 'partido' },
    { key: 'cargo' }
  ];
  renderTabla(
    document.querySelector('#lista-candidatos table tbody'),
    data, cols
  );
}

async function renderVotantes() {
  const data = await api('/admin/votantes');
  const cols = [
    { key: 'id_ciudadano' },
    { key: 'ci' },
    { key: 'nombre_completo' },
    { key: 'id_circuito_asignado', fn: (v) => v ?? 'Sin asignar' },
    { key: 'establecimiento', fn: (v) => v || '-' },
    { key: 'departamento', fn: (v) => v || '-' }
  ];
  renderTabla(
    document.querySelector('#lista-votantes table tbody'),
    data, cols
  );
}

async function loadAdminSelects() {
  if (!session || session.rol !== 'admin') return;
  const [partidos, elecciones, circuitos] = await Promise.all([
    api('/admin/partidos'),
    api('/admin/elecciones'),
    api('/admin/circuitos')
  ]);
  const partidoOpts = partidos.map((p) => `<option value="${p.id_partido}">${p.nombre}</option>`).join('');
  const eleccionOpts = elecciones.map((e) => `<option value="${e.id_eleccion}">${e.nombre}</option>`).join('');
  const circuitoOpts = circuitos.map((c) => `<option value="${c.id_circuito}">${c.id_circuito} - ${c.establecimiento}</option>`).join('');

  ['#lista-partido', '#cand-partido'].forEach((sel) => { $(sel).innerHTML = partidoOpts; });
  ['#lista-eleccion', '#cand-eleccion'].forEach((sel) => { $(sel).innerHTML = eleccionOpts; });
  $('#vot-circuito').innerHTML = circuitoOpts;

  loadAdminData();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    session = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ci: $('#login-ci').value.trim(),
        password: $('#login-password').value
      })
    });
    localStorage.setItem('session', JSON.stringify(session));
    showMessage($('#auth-message'), 'Ingreso exitoso', true);
    updateUI();
  } catch (err) {
    showMessage($('#auth-message'), err.message, false);
  }
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ci: $('#reg-ci').value.trim(),
        cc: $('#reg-cc').value,
        nombre_completo: $('#reg-nombre').value,
        fecha_nacimiento: $('#reg-fecha').value,
        password: $('#reg-password').value
      })
    });
    showMessage($('#auth-message'), 'Registro exitoso. Ahora puede ingresar.', true);
  } catch (err) {
    showMessage($('#auth-message'), err.message, false);
  }
});

$('#btn-logout').addEventListener('click', () => {
  session = null;
  localStorage.removeItem('session');
  updateUI();
});

$('#btn-emitir').addEventListener('click', async () => {
  const btn = $('#btn-emitir');
  const msg = $('#voto-message');
  await setLoading(btn, true);
  try {
    const idEleccion = $('#voto-eleccion').value;
    const check = await api(`/votacion/votante/${session.id_ciudadano}/participacion/${idEleccion}`);
    if (check.ya_voto) {
      showMessage(msg, 'Ya votó en esta elección.', false);
      await setLoading(btn, false);
      return;
    }

    const enBlanco = $('#voto-blanco').checked;
    const listas = enBlanco ? [] : [...$$('input[name=lista]:checked')].map((el) => Number(el.value));

    const result = await api('/votacion/emitir', {
      method: 'POST',
      body: JSON.stringify({
        id_votante: session.id_ciudadano,
        id_eleccion: Number(idEleccion),
        id_circuito: Number($('#voto-circuito').value),
        listas,
        en_blanco: enBlanco
      })
    });

    let text = `Voto registrado. Estado: ${result.estado}.`;
    if (result.observado) text += ' Marcado como OBSERVADO — requiere autorización del presidente.';
    showMessage(msg, text, true);
    await setLoading(btn, false);
  } catch (err) {
    showMessage(msg, err.message, false);
    await setLoading(btn, false);
  }
});

$('#btn-cerrar-mesa').addEventListener('click', async () => {
  const btn = $('#btn-cerrar-mesa');
  const msg = $('#pres-message');
  await setLoading(btn, true);
  try {
    const opt = $('#pres-circuito').selectedOptions[0];
    const idMesa = opt.dataset.mesa;
    if (!idMesa) throw new Error('Circuito sin mesa');
    await api(`/votacion/cerrar-mesa/${idMesa}`, {
      method: 'POST',
      body: JSON.stringify({ id_presidente: session.id_ciudadano })
    });
    showMessage(msg, '✅ Mesa cerrada. No se pueden registrar más votos ni reabrirla.', true);
    await loadCircuitos([$('#pres-circuito')]);
    await setLoading(btn, false);
  } catch (err) {
    showMessage(msg, err.message, false);
    await setLoading(btn, false);
  }
});

$('#btn-ver-resultados').addEventListener('click', async () => {
  try {
    const idCircuito = $('#pres-circuito').value;
    const idEleccion = $('#pres-eleccion').value;
    const data = await api(`/votacion/resultados/circuito/${idCircuito}/${idEleccion}`);
    $('#resultados-output').textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    $('#resultados-output').textContent = err.message;
  }
});

async function loadReporte(path) {
  const idEleccion = $('#pres-eleccion').value;
  const data = await api(`${path}/${idEleccion}`);
  $('#reportes-output').textContent = JSON.stringify(data, null, 2);
}

$('#btn-reporte-depto').addEventListener('click', () => loadReporte('/votacion/reportes/departamento'));
$('#btn-reporte-partido').addEventListener('click', () => loadReporte('/votacion/reportes/partido'));
$('#btn-reporte-candidato').addEventListener('click', () => loadReporte('/votacion/reportes/candidato'));

$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    $$('.tab-panel').forEach((p) => p.classList.add('hidden'));
    tab.classList.add('active');
    $(`#${tab.dataset.tab}`).classList.remove('hidden');
    if (session && session.rol === 'admin') loadAdminData();
  });
});

$('#form-eleccion').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/admin/elecciones', {
      method: 'POST',
      body: JSON.stringify({
        nombre: $('#eleccion-nombre').value,
        fecha: $('#eleccion-fecha').value,
        tipo: $('#eleccion-tipo').value
      })
    });
    showMessage($('#admin-message'), 'Elección creada', true);
    renderElecciones();
  } catch (err) {
    showMessage($('#admin-message'), err.message, false);
  }
});

$('#form-partido').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/admin/partidos', {
      method: 'POST',
      body: JSON.stringify({
        nombre: $('#partido-nombre').value,
        direccion_sede: $('#partido-sede').value
      })
    });
    showMessage($('#admin-message'), 'Partido creado', true);
    renderPartidos();
  } catch (err) {
    showMessage($('#admin-message'), err.message, false);
  }
});

$('#form-lista').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/admin/listas', {
      method: 'POST',
      body: JSON.stringify({
        numero: Number($('#lista-numero').value),
        id_partido: Number($('#lista-partido').value),
        id_eleccion: Number($('#lista-eleccion').value),
        organo: $('#lista-organo').value
      })
    });
    showMessage($('#admin-message'), 'Lista creada', true);
    renderListas();
  } catch (err) {
    showMessage($('#admin-message'), err.message, false);
  }
});

$('#form-candidato').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/admin/candidatos', {
      method: 'POST',
      body: JSON.stringify({
        id_ciudadano: Number($('#cand-ciudadano').value),
        id_partido: Number($('#cand-partido').value),
        id_eleccion: Number($('#cand-eleccion').value),
        cargo: $('#cand-cargo').value
      })
    });
    showMessage($('#admin-message'), 'Candidato creado', true);
    renderCandidatos();
  } catch (err) {
    showMessage($('#admin-message'), err.message, false);
  }
});

$('#form-votante').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/admin/votantes', {
      method: 'POST',
      body: JSON.stringify({
        id_ciudadano: Number($('#vot-ciudadano').value),
        id_circuito_asignado: Number($('#vot-circuito').value)
      })
    });
    showMessage($('#admin-message'), 'Votante asignado a circuito', true);
    renderVotantes();
  } catch (err) {
    showMessage($('#admin-message'), err.message, false);
  }
});

updateUI();
