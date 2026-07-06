(function () {
  const CFG = window.DASHBOARD_CONFIG || {};

  // ---------- Gate (clave de acceso) ----------
  const gateEl = document.getElementById("gate");
  const appEl = document.getElementById("app");
  const gateInput = document.getElementById("gate-input");
  const gateBtn = document.getElementById("gate-btn");
  const gateError = document.getElementById("gate-error");

  function unlock() {
    gateEl.style.display = "none";
    appEl.classList.remove("app-hidden");
    if (!window.__dashboardLoaded) {
      window.__dashboardLoaded = true;
      loadData();
    }
  }

  function tryUnlock() {
    if (gateInput.value === CFG.PASSWORD) {
      localStorage.setItem("dvc_unlocked", "1");
      unlock();
    } else {
      gateError.textContent = "Clave incorrecta.";
    }
  }

  gateBtn.addEventListener("click", tryUnlock);
  gateInput.addEventListener("keydown", e => { if (e.key === "Enter") tryUnlock(); });

  document.getElementById("btn-logout").addEventListener("click", () => {
    localStorage.removeItem("dvc_unlocked");
    location.reload();
  });

  // ---------- CSV parsing ----------
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ""; }
        else if (c === '\r') { /* ignore */ }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
        else field += c;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
  }

  function num(v) {
    if (v === undefined || v === null || v === "") return 0;
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function rowsFromCsv(text) {
    const table = parseCsv(text);
    if (table.length < 2) return [];
    const headers = table[0].map(h => h.trim());
    const idx = {};
    headers.forEach((h, i) => idx[h] = i);

    const need = ["PILAR", "dia", "PROMOTOR", "supervisor", "desc_ddc_wh", "BUSINESS", "CANAL",
      "SEGMENTO", "TAREA", "CANTIDAD_TAREAS", "TAREAS_COMPLETADAS", "TAREAS_VALIDADAS",
      "TAREAS_COMPLETADAS_NO_VALIDADAS", "bultos_esperado", "bultos_validado"];
    const missing = need.filter(h => !(h in idx));
    if (missing.length) {
      throw new Error("Faltan columnas en la hoja: " + missing.join(", "));
    }

    const out = [];
    for (let r = 1; r < table.length; r++) {
      const row = table[r];
      if (!row || row[idx.PILAR] !== "VALUE_CREATION") continue;
      const tarea = row[idx.TAREA] || "";
      const val = num(row[idx.TAREAS_VALIDADAS]);

      // Tareas *BONUS*: si no estan validadas, no cuentan como enviadas (se excluyen
      // del todo); si estan validadas, cuentan como enviadas y validadas normalmente.
      const isBonus = /BONUS/i.test(tarea);
      if (isBonus && val !== 1) continue;

      out.push({
        dia: row[idx.dia] || "",
        promotor: row[idx.PROMOTOR] || "",
        supervisor: row[idx.supervisor] || "",
        distribuidor: row[idx.desc_ddc_wh] || "",
        business: row[idx.BUSINESS] || "",
        canal: row[idx.CANAL] || "",
        segmento: row[idx.SEGMENTO] || "",
        tarea: tarea,
        cant: num(row[idx.CANTIDAD_TAREAS]),
        comp: num(row[idx.TAREAS_COMPLETADAS]),
        val: val,
        compNoVal: num(row[idx.TAREAS_COMPLETADAS_NO_VALIDADAS]),
        bultosEsp: num(row[idx.bultos_esperado]),
        bultosVal: num(row[idx.bultos_validado])
      });
    }
    return out;
  }

  // ---------- Data load ----------
  let DATA = [];
  let segmentColors = new Map();
  const PALETTE = ["#d4930f", "#8b5cf6", "#16a34a", "#06b6d4", "#db2777", "#f97316", "#dc2626", "#4f46e5", "#64748b"];
  const TOTAL_COLOR = "#0ea5b8";
  const statusEl = document.getElementById("status");

  function buildSegmentColors(rows) {
    const sums = new Map();
    rows.forEach(r => {
      const key = r.segmento || "(sin dato)";
      sums.set(key, (sums.get(key) || 0) + (r.cant || 0));
    });
    const ordered = Array.from(sums.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const map = new Map();
    ordered.forEach((name, i) => map.set(name, PALETTE[i % PALETTE.length]));
    return map;
  }

  function loadData() {
    statusEl.textContent = "Cargando datos...";
    statusEl.className = "status status-loading";
    fetch(CFG.SHEET_CSV_URL, { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(text => {
        DATA = rowsFromCsv(text);
        segmentColors = buildSegmentColors(DATA);
        if (DATA.length === 0) {
          statusEl.textContent = "La hoja no tiene filas con PILAR = VALUE_CREATION.";
          statusEl.className = "status status-error";
        } else {
          statusEl.textContent = "";
          statusEl.className = "status";
        }
        const maxDia = DATA.reduce((m, r) => r.dia > m ? r.dia : m, "");
        document.getElementById("badge-updated").textContent = "📅 Datos al dia: " + (maxDia || "-");
        document.getElementById("badge-count").textContent = fmtInt(DATA.length) + " registros";
        populateFilters();
        render();
      })
      .catch(err => {
        statusEl.textContent = "No se pudo cargar la base: " + err.message;
        statusEl.className = "status status-error";
      });
  }

  document.getElementById("btn-refresh").addEventListener("click", loadData);

  // ---------- Filters ----------
  const ALL_FILTERS = [
    { field: "dia", label: "Dia", kind: "daterange" },
    { field: "distribuidor", label: "Distribuidor", id: "f-distribuidor", kind: "select" },
    { field: "supervisor", label: "Supervisor", id: "f-supervisor", kind: "select" },
    { field: "promotor", label: "Promotor", id: "f-promotor", kind: "select" },
    { field: "canal", label: "Canal", id: "f-canal", kind: "select" },
    { field: "business", label: "Negocio", kind: "chip" },
    { field: "segmento", label: "Segmento", kind: "card" }
  ];
  const state = { diaDesde: "", diaHasta: "" };
  ALL_FILTERS.forEach(f => { if (f.kind !== "daterange") state[f.field] = "TODOS"; });

  function ymdToInputDate(ymd) {
    if (!ymd || ymd.length !== 8) return "";
    return ymd.slice(0, 4) + "-" + ymd.slice(4, 6) + "-" + ymd.slice(6, 8);
  }
  function inputDateToYmd(v) { return v ? v.replace(/-/g, "") : ""; }
  function fmtDiaDisplay(ymd) {
    if (!ymd || ymd.length !== 8) return ymd;
    return ymd.slice(6, 8) + "/" + ymd.slice(4, 6) + "/" + ymd.slice(0, 4);
  }

  function uniqueSorted(arr, field) {
    return Array.from(new Set(arr.map(r => r[field]).filter(v => v))).sort((a, b) => String(a).localeCompare(String(b)));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let filtersBuilt = false;
  function populateFilters() {
    ALL_FILTERS.filter(f => f.kind === "select").forEach(f => {
      const sel = document.getElementById(f.id);
      const current = state[f.field];
      const values = uniqueSorted(DATA, f.field);
      sel.innerHTML = '<option value="TODOS">(Todos)</option>' + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
      sel.value = values.includes(current) ? current : "TODOS";
      state[f.field] = sel.value;
    });

    const dias = uniqueSorted(DATA, "dia");
    if (dias.length) {
      const minD = ymdToInputDate(dias[0]), maxD = ymdToInputDate(dias[dias.length - 1]);
      const desdeEl = document.getElementById("f-dia-desde"), hastaEl = document.getElementById("f-dia-hasta");
      desdeEl.min = minD; desdeEl.max = maxD;
      hastaEl.min = minD; hastaEl.max = maxD;
    }

    const businessValues = uniqueSorted(DATA, "business");
    const chipHost = document.getElementById("f-business-chips");
    chipHost.innerHTML = businessValues.map(v =>
      `<button type="button" class="chip" data-value="${escapeHtml(v)}">${escapeHtml(v)}</button>`
    ).join("");
    chipHost.querySelectorAll(".chip").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-value");
        state.business = (state.business === v) ? "TODOS" : v;
        render();
      });
    });

    if (!filtersBuilt) {
      filtersBuilt = true;
      ALL_FILTERS.filter(f => f.kind === "select").forEach(f => {
        document.getElementById(f.id).addEventListener("change", (e) => {
          state[f.field] = e.target.value;
          render();
        });
      });
      document.getElementById("f-dia-desde").addEventListener("change", (e) => {
        state.diaDesde = inputDateToYmd(e.target.value);
        render();
      });
      document.getElementById("f-dia-hasta").addEventListener("change", (e) => {
        state.diaHasta = inputDateToYmd(e.target.value);
        render();
      });
      document.getElementById("btn-reset").addEventListener("click", () => {
        ALL_FILTERS.forEach(f => {
          if (f.kind === "select") { state[f.field] = "TODOS"; document.getElementById(f.id).value = "TODOS"; }
          else if (f.kind !== "daterange") { state[f.field] = "TODOS"; }
        });
        state.diaDesde = ""; state.diaHasta = "";
        document.getElementById("f-dia-desde").value = "";
        document.getElementById("f-dia-hasta").value = "";
        render();
      });
    }
  }

  function matchesAllExcept(r, exceptField) {
    if (exceptField !== "dia") {
      if (state.diaDesde && r.dia < state.diaDesde) return false;
      if (state.diaHasta && r.dia > state.diaHasta) return false;
    }
    return ALL_FILTERS.every(f => {
      if (f.kind === "daterange" || f.field === exceptField) return true;
      return state[f.field] === "TODOS" || r[f.field] === state[f.field];
    });
  }

  function getFiltered() {
    return DATA.filter(r => matchesAllExcept(r, null));
  }

  function getFilteredExcept(exceptField) {
    return DATA.filter(r => matchesAllExcept(r, exceptField));
  }

  function sumBy(rows, key) { return rows.reduce((acc, r) => acc + (r[key] || 0), 0); }
  function pct(n, d) { return d ? n / d : 0; }
  function fmtPct(x) { return (x * 100).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; }
  function fmtInt(x) { return x.toLocaleString("es-AR"); }

  function renderKpis(rows) {
    const cant = sumBy(rows, "cant"), comp = sumBy(rows, "comp"), val = sumBy(rows, "val"),
      compNoVal = sumBy(rows, "compNoVal");
    const cards = [
      { label: "Tareas (Value Creation)", value: fmtInt(cant) },
      { label: "% Completadas", value: fmtPct(pct(comp, cant)) },
      { label: "% Validadas", value: fmtPct(pct(val, cant)) },
      { label: "% Completadas no validadas", value: fmtPct(pct(compNoVal, comp)) }
    ];
    document.getElementById("kpis").innerHTML = cards.map(c =>
      `<div class="kpi-card"><div class="kpi-label">${c.label}</div><div class="kpi-value">${c.value}</div></div>`
    ).join("");
  }

  function groupBy(rows, field) {
    const map = new Map();
    rows.forEach(r => {
      const key = r[field] || "(sin dato)";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    const result = [];
    map.forEach((groupRows, key) => {
      const cant = sumBy(groupRows, "cant"), comp = sumBy(groupRows, "comp"),
        val = sumBy(groupRows, "val"), compNoVal = sumBy(groupRows, "compNoVal");
      result.push({ name: key, cant, comp, val, compNoVal, pctVal: pct(val, cant), pctComp: pct(comp, cant) });
    });
    result.sort((a, b) => b.pctVal - a.pctVal);
    return result;
  }

  function colorForPct(p) {
    const clamp = Math.max(0, Math.min(1, p));
    let r, g, b = 90;
    if (clamp < 0.5) { const t = clamp / 0.5; r = 192; g = Math.round(57 + (184 - 57) * t); }
    else { const t = (clamp - 0.5) / 0.5; r = Math.round(192 - (192 - 30) * t); g = Math.round(184 + (143 - 184) * t); }
    return `rgba(${r},${g},${b},0.25)`;
  }

  function renderTable(containerId, rows, opts) {
    opts = opts || {};
    const shown = rows.slice(0, opts.limit || rows.length);
    let html = '<table class="rank-table"><thead><tr><th>#</th><th>' + (opts.nameLabel || "Nombre") +
      '</th><th>Tareas</th><th>Completadas</th><th>Validadas</th><th>% Validada</th><th>% Completada</th></tr></thead><tbody>';
    shown.forEach((r, i) => {
      html += `<tr>
        <td class="num">${i + 1}</td>
        <td class="name-cell">${escapeHtml(r.name)}</td>
        <td class="num">${fmtInt(r.cant)}</td>
        <td class="num">${fmtInt(r.comp)}</td>
        <td class="num">${fmtInt(r.val)}</td>
        <td class="pct-cell" style="background:${colorForPct(r.pctVal)}">${fmtPct(r.pctVal)}</td>
        <td class="num">${fmtPct(r.pctComp)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById(containerId).innerHTML = html;
  }

  function semaforoColor(p) {
    if (p < 0.33) return "#dc2626";
    if (p < 0.66) return "#e6b800";
    return "#16a34a";
  }

  function tokenSet(s) { return new Set(String(s).toUpperCase().trim().split(/\s+/).filter(Boolean)); }
  function sameTokens(a, b) {
    const A = tokenSet(a), B = tokenSet(b);
    if (A.size !== B.size) return false;
    for (const t of A) if (!B.has(t)) return false;
    return true;
  }
  function getPromotorTarget(name) {
    const overrides = CFG.PROMOTOR_TARGET_OVERRIDES || {};
    for (const key in overrides) {
      if (sameTokens(key, name)) return overrides[key];
    }
    return CFG.PROMOTOR_TARGET_DEFAULT != null ? CFG.PROMOTOR_TARGET_DEFAULT : 1;
  }

  function renderRankBars(containerId, rows, limit, targetFn) {
    const shown = rows.slice(0, limit || rows.length);
    const html = shown.map((r, i) => {
      const color = semaforoColor(r.pctVal);
      const target = targetFn ? targetFn(r.name) : 1;
      const width = Math.max(2, Math.min(100, (r.pctVal / target) * 100));
      return `<div class="rankbar">
        <div class="rankbar-pos">${i + 1}</div>
        <div class="rankbar-body">
          <div class="rankbar-name" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</div>
          <div class="rankbar-track"><div class="rankbar-fill" style="width:${width}%;background:${color}"></div></div>
        </div>
        <div class="rankbar-pct" style="color:${color}">${fmtPct(r.pctVal)}</div>
      </div>`;
    }).join("");
    document.getElementById(containerId).innerHTML = html;
  }

  function renderSegmentCards() {
    const rows = getFilteredExcept("segmento");
    const cant = sumBy(rows, "cant"), val = sumBy(rows, "val");
    const bySegmento = groupBy(rows, "segmento").slice().sort((a, b) => b.cant - a.cant);

    const cardsData = [
      { name: "Total", key: "TODOS", color: TOTAL_COLOR, cant, val, pctVal: pct(val, cant) }
    ].concat(bySegmento.map(s => ({
      name: s.name, key: s.name, color: segmentColors.get(s.name) || "#64748b",
      cant: s.cant, val: s.val, pctVal: s.pctVal
    })));

    const hasSelection = state.segmento !== "TODOS";
    document.getElementById("segment-cards").innerHTML = cardsData.map(c => {
      const active = state.segmento === c.key;
      const dimmed = hasSelection && !active;
      const cls = "segment-card" + (active ? " active" : "") + (dimmed ? " dimmed" : "");
      return `<div class="${cls}" style="--seg-color:${c.color}" data-key="${escapeHtml(c.key)}">
        <div class="segment-label">${active ? "&#10003; " : ""}${escapeHtml(c.name)}</div>
        <div class="segment-value">${fmtPct(c.pctVal)}</div>
        <div class="segment-caption">% Validadas &middot; ${fmtInt(c.cant)} tareas</div>
      </div>`;
    }).join("");

    document.querySelectorAll("#segment-cards .segment-card").forEach(el => {
      el.addEventListener("click", () => {
        const key = el.getAttribute("data-key");
        state.segmento = (state.segmento === key) ? "TODOS" : key;
        render();
      });
    });
  }

  const FILTER_TAG_LABELS = { dia: "Periodo", distribuidor: "Dist", supervisor: "Sup", promotor: "Prom", canal: "Canal", business: "Negocio", segmento: "Segmento" };
  function renderActiveTags() {
    const simpleActive = ALL_FILTERS.filter(f => f.kind !== "daterange" && state[f.field] !== "TODOS");
    const diaActive = !!(state.diaDesde || state.diaHasta);
    document.getElementById("filters-count").textContent = simpleActive.length + (diaActive ? 1 : 0);

    let tagsHtml = "";
    if (diaActive) {
      const label = state.diaDesde && state.diaHasta
        ? fmtDiaDisplay(state.diaDesde) + " &rarr; " + fmtDiaDisplay(state.diaHasta)
        : state.diaDesde ? "desde " + fmtDiaDisplay(state.diaDesde) : "hasta " + fmtDiaDisplay(state.diaHasta);
      tagsHtml += `<span class="tag">${FILTER_TAG_LABELS.dia}: ${label} <button type="button" data-field="dia">&times;</button></span>`;
    }
    tagsHtml += simpleActive.map(f =>
      `<span class="tag">${FILTER_TAG_LABELS[f.field]}: ${escapeHtml(state[f.field])} <button type="button" data-field="${f.field}">&times;</button></span>`
    ).join("");
    document.getElementById("active-tags").innerHTML = tagsHtml;

    document.querySelectorAll("#active-tags .tag button").forEach(btn => {
      btn.addEventListener("click", () => {
        const field = btn.getAttribute("data-field");
        if (field === "dia") {
          state.diaDesde = ""; state.diaHasta = "";
          document.getElementById("f-dia-desde").value = "";
          document.getElementById("f-dia-hasta").value = "";
        } else {
          state[field] = "TODOS";
          const sel = document.getElementById("f-" + field);
          if (sel) sel.value = "TODOS";
        }
        render();
      });
    });
    document.querySelectorAll("#f-business-chips .chip").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-value") === state.business);
    });
  }

  function render() {
    const rows = getFiltered();
    renderKpis(rows);
    renderActiveTags();
    renderSegmentCards();

    const byPromotor = groupBy(rows, "promotor");
    const bySupervisor = groupBy(rows, "supervisor");
    const byDistribuidor = groupBy(rows, "distribuidor");
    const byTarea = groupBy(rows, "tarea");

    renderTable("table-promotor", byPromotor, { nameLabel: "Promotor" });
    renderTable("table-supervisor", bySupervisor, { nameLabel: "Supervisor" });
    renderTable("table-distribuidor", byDistribuidor, { nameLabel: "Distribuidor" });
    renderTable("table-tarea", byTarea, { nameLabel: "Tarea" });

    renderRankBars("rank-promotor", byPromotor, 15, getPromotorTarget);
    renderRankBars("rank-supervisor", bySupervisor);
    renderRankBars("rank-distribuidor", byDistribuidor);
  }

  // ---------- Init (al final, ya que todo lo anterior esta definido) ----------
  if (localStorage.getItem("dvc_unlocked") === "1") {
    unlock();
  }
})();
