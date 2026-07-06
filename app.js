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
      out.push({
        dia: row[idx.dia] || "",
        promotor: row[idx.PROMOTOR] || "",
        supervisor: row[idx.supervisor] || "",
        distribuidor: row[idx.desc_ddc_wh] || "",
        business: row[idx.BUSINESS] || "",
        canal: row[idx.CANAL] || "",
        segmento: row[idx.SEGMENTO] || "",
        tarea: row[idx.TAREA] || "",
        cant: num(row[idx.CANTIDAD_TAREAS]),
        comp: num(row[idx.TAREAS_COMPLETADAS]),
        val: num(row[idx.TAREAS_VALIDADAS]),
        compNoVal: num(row[idx.TAREAS_COMPLETADAS_NO_VALIDADAS]),
        bultosEsp: num(row[idx.bultos_esperado]),
        bultosVal: num(row[idx.bultos_validado])
      });
    }
    return out;
  }

  // ---------- Data load ----------
  let DATA = [];
  const statusEl = document.getElementById("status");

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
        if (DATA.length === 0) {
          statusEl.textContent = "La hoja no tiene filas con PILAR = VALUE_CREATION.";
          statusEl.className = "status status-error";
        } else {
          statusEl.textContent = "";
          statusEl.className = "status";
        }
        const maxDia = DATA.reduce((m, r) => r.dia > m ? r.dia : m, "");
        document.getElementById("updatedAt").textContent = "Datos al dia: " + (maxDia || "-") + " (" + DATA.length + " tareas)";
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
  const FILTER_FIELDS = [
    { id: "f-dia", field: "dia" },
    { id: "f-business", field: "business" },
    { id: "f-canal", field: "canal" },
    { id: "f-distribuidor", field: "distribuidor" },
    { id: "f-supervisor", field: "supervisor" },
    { id: "f-promotor", field: "promotor" }
  ];
  const state = {};
  FILTER_FIELDS.forEach(f => state[f.field] = "TODOS");

  function uniqueSorted(arr, field) {
    return Array.from(new Set(arr.map(r => r[field]).filter(v => v))).sort((a, b) => String(a).localeCompare(String(b)));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let filtersBuilt = false;
  function populateFilters() {
    FILTER_FIELDS.forEach(f => {
      const sel = document.getElementById(f.id);
      const current = state[f.field];
      const values = uniqueSorted(DATA, f.field);
      sel.innerHTML = '<option value="TODOS">(Todos)</option>' + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
      sel.value = values.includes(current) ? current : "TODOS";
      state[f.field] = sel.value;
    });
    if (!filtersBuilt) {
      filtersBuilt = true;
      FILTER_FIELDS.forEach(f => {
        document.getElementById(f.id).addEventListener("change", (e) => {
          state[f.field] = e.target.value;
          render();
        });
      });
      document.getElementById("btn-reset").addEventListener("click", () => {
        FILTER_FIELDS.forEach(f => {
          state[f.field] = "TODOS";
          document.getElementById(f.id).value = "TODOS";
        });
        render();
      });
    }
  }

  function getFiltered() {
    return DATA.filter(r => FILTER_FIELDS.every(f => state[f.field] === "TODOS" || r[f.field] === state[f.field]));
  }

  function sumBy(rows, key) { return rows.reduce((acc, r) => acc + (r[key] || 0), 0); }
  function pct(n, d) { return d ? n / d : 0; }
  function fmtPct(x) { return (x * 100).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; }
  function fmtInt(x) { return x.toLocaleString("es-AR"); }

  function renderKpis(rows) {
    const cant = sumBy(rows, "cant"), comp = sumBy(rows, "comp"), val = sumBy(rows, "val"),
      compNoVal = sumBy(rows, "compNoVal"), bultosEsp = sumBy(rows, "bultosEsp"), bultosVal = sumBy(rows, "bultosVal");
    const cards = [
      { label: "Tareas (Value Creation)", value: fmtInt(cant) },
      { label: "% Completadas", value: fmtPct(pct(comp, cant)) },
      { label: "% Validadas", value: fmtPct(pct(val, cant)) },
      { label: "% Completadas no validadas", value: fmtPct(pct(compNoVal, comp)) },
      { label: "% Bultos validados", value: fmtPct(pct(bultosVal, bultosEsp)) }
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

  const charts = {};
  function renderChart(canvasId, rows, limit) {
    const shown = rows.slice(0, limit || rows.length);
    const ctx = document.getElementById(canvasId).getContext("2d");
    const labels = shown.map(r => r.name);
    const values = shown.map(r => +(r.pctVal * 100).toFixed(1));
    const colors = shown.map(r => colorForPct(r.pctVal).replace("0.25", "0.8"));
    if (charts[canvasId]) {
      charts[canvasId].data.labels = labels;
      charts[canvasId].data.datasets[0].data = values;
      charts[canvasId].data.datasets[0].backgroundColor = colors;
      charts[canvasId].update();
      return;
    }
    charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ label: "% Validada", data: values, backgroundColor: colors }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } } }
      }
    });
  }

  function render() {
    const rows = getFiltered();
    renderKpis(rows);
    const byPromotor = groupBy(rows, "promotor");
    const bySupervisor = groupBy(rows, "supervisor");
    const byDistribuidor = groupBy(rows, "distribuidor");
    const bySegmento = groupBy(rows, "segmento");
    const byTarea = groupBy(rows, "tarea");

    renderTable("table-promotor", byPromotor, { nameLabel: "Promotor" });
    renderTable("table-supervisor", bySupervisor, { nameLabel: "Supervisor" });
    renderTable("table-distribuidor", byDistribuidor, { nameLabel: "Distribuidor" });
    renderTable("table-segmento", bySegmento, { nameLabel: "Segmento" });
    renderTable("table-tarea", byTarea, { nameLabel: "Tarea" });

    renderChart("chart-promotor", byPromotor, 15);
    renderChart("chart-supervisor", bySupervisor);
    renderChart("chart-distribuidor", byDistribuidor);
    renderChart("chart-segmento", bySegmento);
  }

  // ---------- Init (al final, ya que todo lo anterior esta definido) ----------
  if (localStorage.getItem("dvc_unlocked") === "1") {
    unlock();
  }
})();
