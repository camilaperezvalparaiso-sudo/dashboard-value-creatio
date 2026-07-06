// Configuracion del dashboard. No contiene datos sensibles, solo referencias.
window.DASHBOARD_CONFIG = {
  // Clave compartida para entrar al dashboard (proteccion basica, no es seguridad real).
  PASSWORD: "valpa123",

  // URL de la Google Sheet publicada como CSV.
  // Sin "gid" a proposito: al reemplazar la hoja con "Archivo > Importar > Reemplazar
  // hoja actual", Google cambia el id interno de la pestana (gid). Sin ese parametro,
  // siempre exporta la primera/unica pestana, asi que el link no se rompe cada vez.
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/1RbMNjl8USGEVMO7j6xfa0eNLAJ-7sfK4zIFpYhBmRvQ/export?format=csv"
};
