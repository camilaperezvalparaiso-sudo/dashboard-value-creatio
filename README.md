# Dashboard Value Creation (web, en vivo)

Dashboard estatico (HTML/CSS/JS) con KPIs, rankings y graficos de las tareas Value
Creation. Lee los datos en vivo desde una Google Sheet publicada, asi que se puede
actualizar la base sin tocar codigo ni hacer deploy.

## Estructura

- `index.html` / `style.css` / `app.js`: la app (corre entera en el navegador).
- `config.js`: clave de acceso y URL de la Google Sheet. Es el unico archivo que
  hay que tocar para configurar el sitio.

## Actualizar los datos cada dia

1. Abri la Google Sheet que armaste (la que tiene la base pegada/importada).
2. Reemplaza el contenido con la base nueva (por ejemplo: `Archivo > Importar >
   Subir` el CSV del dia, con "Reemplazar hoja actual").
3. Listo. La proxima vez que alguien abra el dashboard (o apriete "Actualizar
   datos"), va a leer la version mas reciente de la hoja. No hace falta hacer
   nada mas: no hay que tocar Git ni el codigo.

## Configuracion inicial (una sola vez)

### 1. Google Sheet como fuente de datos

1. Cre&aacute; la hoja, import&aacute; la base (separador `;`).
2. Compartila con "Cualquier persona con el enlace" -> Lector.
3. Cop&aacute; la URL del navegador (la de `.../edit...`) y pas&aacute;sela a
   qui&eacute;n configure `config.js` (o edit&aacute; vos misma
   `SHEET_CSV_URL` reemplazando `SHEET_ID` por el ID de la hoja, en esta forma):
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=GID
   ```
   `SHEET_ID` es la parte de la URL entre `/d/` y `/edit`. `GID` es el numero
   despu&eacute;s de `gid=` en la URL cuando ten&eacute;s abierta la pesta&ntilde;a
   correcta (si no aparece, dejar `gid=0`).

### 2. Clave de acceso

Se define en `config.js` (`PASSWORD`). Cambiala ah&iacute; si alguna vez quer&eacute;s
rotarla, y avisale al equipo la nueva clave.

### 3. Publicarlo en GitHub Pages

1. Cre&aacute; un repositorio nuevo (vac&iacute;o) en https://github.com/new, por
   ejemplo `dashboard-value-creation`.
2. En esta carpeta:
   ```
   git remote add origin https://github.com/TU_USUARIO/dashboard-value-creation.git
   git branch -M main
   git push -u origin main
   ```
3. En GitHub: **Settings > Pages** del repositorio -> Source: rama `main`,
   carpeta `/ (root)` -> Guardar.
4. El sitio queda en `https://TU_USUARIO.github.io/dashboard-value-creation/`.
5. Compart&iacute; el link + la clave con promotores, supervisores y dem&aacute;s
   personal.

## Notas

- El dashboard solo muestra tareas con `PILAR = VALUE_CREATION` (se filtra
  autom&aacute;ticamente al leer la hoja).
- Los filtros (D&iacute;a, Negocio, Canal, Distribuidor, Supervisor, Promotor) se
  aplican en vivo sobre KPIs, tablas y gr&aacute;ficos a la vez.
- La clave de acceso es una protecci&oacute;n b&aacute;sica (evita que cualquiera
  que llegue al link vea los datos), no es seguridad real: cualquiera que revise
  el c&oacute;digo fuente puede encontrarla.
