// Configuracion del dashboard. No contiene datos sensibles, solo referencias.
window.DASHBOARD_CONFIG = {
  // Clave compartida para entrar al dashboard (proteccion basica, no es seguridad real).
  PASSWORD: "valpa123",

  // URLs de las 3 pestanas de la misma Google Sheet, exportadas como CSV.
  // IMPORTANTE sobre el "gid" (identificador interno de cada pestana): si alguna vez
  // reemplazas los datos de una pestana con "Archivo > Importar > Reemplazar hoja
  // actual", Google le asigna un gid nuevo y el link de esa pestana se rompe (da
  // "Failed to fetch"). Para evitarlo, al actualizar datos usa en cambio "Archivo >
  // Importar > Reemplazar datos en la celda seleccionada" (parado en la celda A1), que
  // sí mantiene el mismo gid. Si igualmente se rompe, avisale a Claude el link nuevo
  // de esa pestana para actualizar el gid aca.
  SHEET_TASKS_CSV_URL: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv&gid=556148938",
  SHEET_SKU_VALIDACION_CSV_URL: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv&gid=1946182298",

  // Archivos de venta, uno por distribuidor (el codigo de cliente solo es unico DENTRO
  // de cada distribuidor, por eso van separados). cod_ddc_wh debe matchear el que usa
  // la hoja de tareas para ese distribuidor.
  VENTA_SOURCES: [
    { cod_ddc_wh: "135908", url: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv&gid=1747963733" },
    { cod_ddc_wh: "166364", url: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv&gid=16708678" }
  ],

  // Bases de clientes (BC), una por distribuidor. Mismo codigo de cliente que en venta.
  CLIENTES_SOURCES: [
    { cod_ddc_wh: "135908", url: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv&gid=2058094724" },
    { cod_ddc_wh: "166364", url: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv&gid=1716528710" }
  ],

  // Objetivo mensual de % validadas para promotores (barras del ranking por promotor).
  // Cambialo cada mes segun corresponda. PROMOTOR_TARGET_DEFAULT aplica a todos los
  // promotores salvo que tengan una excepcion en PROMOTOR_TARGET_OVERRIDES (las claves
  // se comparan sin importar mayusculas/minusculas ni el orden de nombre/apellido).
  PROMOTOR_TARGET_DEFAULT: 0.45,
  PROMOTOR_TARGET_OVERRIDES: {
    "QUIROGA CRISTIAN": 0.55
  }
};
