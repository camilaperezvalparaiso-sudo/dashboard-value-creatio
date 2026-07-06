// Configuracion del dashboard. No contiene datos sensibles, solo referencias.
window.DASHBOARD_CONFIG = {
  // Clave compartida para entrar al dashboard (proteccion basica, no es seguridad real).
  PASSWORD: "valpa123",

  // URL de la Google Sheet publicada como CSV.
  // Sin "gid" a proposito: al reemplazar la hoja con "Archivo > Importar > Reemplazar
  // hoja actual", Google cambia el id interno de la pestana (gid). Sin ese parametro,
  // siempre exporta la primera/unica pestana, asi que el link no se rompe cada vez.
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv",

  // Objetivo mensual de % validadas para promotores (barras del ranking por promotor).
  // Cambialo cada mes segun corresponda. PROMOTOR_TARGET_DEFAULT aplica a todos los
  // promotores salvo que tengan una excepcion en PROMOTOR_TARGET_OVERRIDES (las claves
  // se comparan sin importar mayusculas/minusculas ni el orden de nombre/apellido).
  PROMOTOR_TARGET_DEFAULT: 0.45,
  PROMOTOR_TARGET_OVERRIDES: {
    "QUIROGA CRISTIAN": 0.55
  }
};
