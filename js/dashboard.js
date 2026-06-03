/* ============================================================
   dashboard.js — Tablero SGM · Chilquinta Distribución
   Lee JSON en data/ y renderiza el tablero.
   Intervalos configurables: dashboard + SEC/Clima por separado.
   ============================================================ */

const DATA = './data/';
let lbPhotos = [], lbIndex = 0;
let timerDash = null, timerExt = null;

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 60000);
  loadConfig().then(() => {
    loadAll();
    restoreSelectors();
  });
});

function updateClock() {
  const now = new Date();
  document.getElementById('topbar-date').textContent =
    now.toLocaleDateString('es-CL',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
       .replace(/^\w/, c => c.toUpperCase());
  document.getElementById('topbar-time').textContent =
    'Actualizado ' + now.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
}

/* ── CONFIG ───────────────────────────────────────────────── */
let appConfig = {
  intervalo_sec_horas: 6,
  intervalo_clima_horas: 6,
  intervalo_whatsapp_minutos: 15
};

async function loadConfig() {
  try {
    const r = await fetch(`${DATA}config.json?t=${Date.now()}`);
    const c = await r.json();
    appConfig = { ...appConfig, ...c };
    // Sincronizar selector de externa con config
    const selExt = document.getElementById('sel-external');
    const horas  = Math.max(appConfig.intervalo_sec_horas, appConfig.intervalo_clima_horas);
    if ([...selExt.options].some(o => parseInt(o.value) === horas)) {
      selExt.value = horas;
    }
  } catch { /* usa defaults */ }
}

/* ── CARGA COMPLETA ───────────────────────────────────────── */
async function loadAll() {
  await Promise.allSettled([
    loadGroup('sgm','feed-sgm','sgm'),
    loadGroup('sat','feed-sat','sat'),
    loadClima(),
    loadSEC()
  ]);
  updateStatCounters();
}

/* ── GRUPOS WHATSAPP ──────────────────────────────────────── */
async function loadGroup(file, feedId, prefix) {
  try {
    const res  = await fetch(`${DATA}${file}.json?t=${Date.now()}`);
    const data = await res.json();
    const r    = data.resumen || {};

    setText(`resumen-${prefix}-text`, r.descripcion_general || 'Sin descripción disponible.');
    setText(`${prefix}-ejecutadas`, r.total_actividades ?? '—');
    setText(`${prefix}-fotos`,      r.total_fotos ?? '—');
    setText(`${prefix}-tecnicos`,   r.tecnicos_activos ?? '—');

    const pct = r.avance_pct ?? 0;
    setText(`${prefix}-pct`, pct + '%');
    document.getElementById(`${prefix}-bar`).style.width = pct + '%';
    setText(`${prefix}-last-sync`, formatTs(r.ultima_actualizacion));

    renderFeed(data.actividades || [], feedId);
  } catch {
    setText(`resumen-${prefix}-text`, 'No se pudo cargar. Ejecuta el extractor desde tu PC.');
  }
}

function renderFeed(actividades, containerId) {
  const el = document.getElementById(containerId);
  if (!actividades.length) {
    el.innerHTML = '<div class="empty-state">Sin actividades registradas aún.</div>';
    return;
  }
  el.innerHTML = [...actividades]
    .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(act => {
      const fotos = act.fotos || [];
      const hora  = formatTs(act.timestamp);
      const tipo  = esc(act.tipo || 'General');
      const desc  = esc(act.descripcion || '');
      const fj    = JSON.stringify(fotos).replace(/"/g,'&quot;');

      const imgEl = (src, cls, extraHtml='') =>
        src ? `<div class="gimg ${cls}" onclick='openLightbox(${fj},${fotos.indexOf(src)},"${esc(act.descripcion||'')}","${esc(hora)}")'><img src="${src}" alt="foto"/>${extraHtml}</div>`
            : `<div class="gimg ${cls}"><span class="gimg-placeholder">📷</span></div>`;

      const mainImg  = imgEl(fotos[0], 'gimg-main');
      const sideImg1 = imgEl(fotos[1], 'gimg-side');
      const sideImg2 = fotos.length > 2
        ? imgEl(fotos[2], 'gimg-side', `<div class="gimg-more">+${fotos.length-2}</div>`)
        : `<div class="gimg gimg-side"><span class="gimg-placeholder" style="font-size:16px">📷</span></div>`;

      return `
        <div class="activity-card">
          <div class="activity-card-head">
            <span class="act-type">${tipo}</span>
            <span class="act-time">${hora}</span>
          </div>
          <div class="act-desc">${desc}</div>
          ${fotos.length ? `
          <div class="gallery">
            ${mainImg}
            <div class="gallery-side">${sideImg1}${sideImg2}</div>
          </div>
          <div class="gallery-caption">📷 ${fotos.length} fotografía${fotos.length!==1?'s':''} · clic para ampliar</div>` : ''}
        </div>`;
    }).join('');
}

/* ── CLIMA ────────────────────────────────────────────────── */
async function loadClima() {
  try {
    const r    = await fetch(`${DATA}clima.json?t=${Date.now()}`);
    const data = await r.json();
    const v    = data.ciudades?.find(c => c.ciudad==='Valparaíso') || {};

    setText('clima-temp',   `${v.max??'—'}° / ${v.min??'—'}°`);
    setText('clima-detail', `Valparaíso · ${data.fecha||'Hoy'} · ${v.condicion||''}`);
    setText('clima-last-sync', formatTs(data.actualizado));
    document.getElementById('clima-icon').textContent = condIcon(v.condicion||'');

    document.getElementById('clima-ciudades').innerHTML =
      (data.ciudades||[]).map(c => `
        <div class="ciudad-item">
          <div><div class="ciudad-name">${esc(c.ciudad)}</div><div class="ciudad-cond">${esc(c.condicion||'')}</div></div>
          <div><div class="ciudad-max">${c.max??'—'}°</div><div class="ciudad-min">${c.min??'—'}°</div></div>
        </div>`).join('');

    const chart = document.getElementById('clima-chart');
    const horas = data.horas || [];
    if (horas.length) {
      const max = Math.max(...horas.map(h=>h.temp));
      chart.innerHTML = horas.map((h,i) =>
        `<div class="bar ${i>=2&&i<=5?'bar-red':'bar-light'}" style="height:${Math.round((h.temp/max)*100)}%" title="${h.hora}: ${h.temp}°"></div>`
      ).join('');
    }
  } catch {
    setText('clima-detail','Sin datos de clima. Ejecuta el extractor desde tu PC.');
  }
}

/* ── SEC ──────────────────────────────────────────────────── */
async function loadSEC() {
  try {
    const r    = await fetch(`${DATA}sec.json?t=${Date.now()}`);
    const data = await r.json();
    const pct  = data.pct_normal ?? 99.9;

    document.getElementById('sec-alerta-text').innerHTML =
      `<strong>${pct}%</strong> de los clientes del país con servicio eléctrico normal · ${data.fecha||''}`;
    setText('sec-last-sync', formatTs(data.actualizado));

    const regiones = data.regiones || [];
    const total    = data.total_nacional || regiones.reduce((s,r)=>s+(r.clientes||0),0);
    const maxVal   = Math.max(...regiones.map(r=>r.clientes||0), 1);

    setText('sec-total', `Total nacional: ${total.toLocaleString('es-CL')} clientes sin suministro`);
    setText('stat-sec',  total.toLocaleString('es-CL'));

    document.getElementById('sec-bars').innerHTML = [...regiones]
      .sort((a,b)=>(b.clientes||0)-(a.clientes||0))
      .map(r => {
        const p = Math.round(((r.clientes||0)/maxVal)*100);
        return `
          <div class="sec-bar-row">
            <div class="sec-bar-label">${esc(r.region)}</div>
            <div class="sec-bar-track"><div class="sec-bar-fill" style="width:${p}%"></div></div>
            <div class="sec-bar-val">${(r.clientes||0).toLocaleString('es-CL')}</div>
          </div>`;
      }).join('');
  } catch {
    setText('sec-alerta-text','Sin datos SEC. Ejecuta el extractor desde tu PC.');
  }
}

/* ── CONTADORES GLOBALES ──────────────────────────────────── */
function updateStatCounters() {
  setText('stat-mant',  document.getElementById('sgm-ejecutadas').textContent);
  setText('stat-sat',   document.getElementById('sat-ejecutadas').textContent);
  const f1 = parseInt(document.getElementById('sgm-fotos').textContent)||0;
  const f2 = parseInt(document.getElementById('sat-fotos').textContent)||0;
  setText('stat-fotos', (f1+f2)||'—');
}

/* ── ACTUALIZACIÓN MANUAL ─────────────────────────────────── */
async function triggerSync() {
  const btn = document.getElementById('btn-sync');
  btn.classList.add('syncing');
  btn.innerHTML = '<svg class="sync-icon spinning" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg> Actualizando...';
  await loadAll();
  updateClock();
  btn.classList.remove('syncing');
  btn.innerHTML = '<svg class="sync-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg> Actualizar ahora';
}

/* ── SELECTORES DE INTERVALO ──────────────────────────────── */
function onDashboardInterval() {
  const min = parseInt(document.getElementById('sel-dashboard').value);
  localStorage.setItem('sgm_dash_interval', min);
  clearInterval(timerDash);
  if (min > 0) timerDash = setInterval(() => { loadAll(); updateClock(); }, min * 60000);
}

function onExternalInterval() {
  const h = parseInt(document.getElementById('sel-external').value);
  localStorage.setItem('sgm_ext_interval', h);
  // Actualizar config en memoria para que el extractor local lo tome
  appConfig.intervalo_sec_horas   = h;
  appConfig.intervalo_clima_horas = h;
  clearInterval(timerExt);
  if (h > 0) timerExt = setInterval(() => { loadClima(); loadSEC(); }, h * 3600000);
}

function restoreSelectors() {
  const savedDash = localStorage.getItem('sgm_dash_interval');
  const savedExt  = localStorage.getItem('sgm_ext_interval');
  if (savedDash !== null) {
    document.getElementById('sel-dashboard').value = savedDash;
    onDashboardInterval();
  }
  if (savedExt !== null) {
    document.getElementById('sel-external').value = savedExt;
    onExternalInterval();
  }
}

/* ── LIGHTBOX ─────────────────────────────────────────────── */
function openLightbox(fotos, index, desc, hora) {
  lbPhotos = fotos;
  lbIndex  = Math.max(0, Math.min(index, fotos.length-1));
  document.getElementById('lb-caption').textContent = desc;
  document.getElementById('lb-meta').textContent    = hora;
  renderLbPhoto();
  document.getElementById('lightbox').classList.add('open');
}
function renderLbPhoto() {
  document.getElementById('lb-img').src = lbPhotos[lbIndex] || '';
  document.getElementById('lb-counter').textContent = `${lbIndex+1} / ${lbPhotos.length}`;
}
function lbNav(dir) {
  lbIndex = Math.max(0, Math.min(lbPhotos.length-1, lbIndex+dir));
  renderLbPhoto();
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key==='ArrowLeft')  lbNav(-1);
  if (e.key==='ArrowRight') lbNav(1);
  if (e.key==='Escape')     closeLightbox();
});

/* ── UTILIDADES ───────────────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  } catch { return ts; }
}
function condIcon(cond) {
  const c = (cond||'').toLowerCase();
  if (c.includes('lluvia')||c.includes('llovizna')) return '🌧';
  if (c.includes('nublado')) return '☁';
  if (c.includes('parcial')) return '⛅';
  if (c.includes('niebla')||c.includes('neblina')) return '🌫';
  return '☀';
}
