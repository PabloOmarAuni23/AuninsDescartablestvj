/*
disparar-sincronizacion.gs  (código de Google Apps Script, va DENTRO de la
Google Sheet "listado-precios", no de este repositorio)

Qué hace: cada vez que editás la planilla, avisa por la API de GitHub para que
el workflow "Sincronizar catálogo desde Google Drive" se ejecute YA mismo, sin
esperar al cron de los 15 minutos.

Cómo instalarlo (una sola vez):
  1) Abrí la planilla https://docs.google.com/spreadsheets/d/1y3e341bygLkaqV_iVSipuS90O66rWvqtw2grXOjYhZs
  2) Menú Extensiones > Apps Script.
  3) Borrá el contenido de Código.gs y pegá este archivo completo.
  4) Creá el token: GitHub > Settings > Developer settings > Personal access
     tokens > Tokens (classic) > Generate new token (classic).
     Alcance (scope): marcá "repo". Copiá el token.
  5) En el editor de Apps Script: Archivo > Propiedades del proyecto > añadir
     la propiedad GH_TOKEN con el token copiado. Guardá.
  6) Volvé al editor y ejecutá la función "crearTriggerEdit" una vez (te va a
     pedir permisos; aceptá). Ya queda instalado.
  7) Probá: editá cualquier celda de la planilla y en ~1-2 minutos debería
     aparecer una corrida nueva en
     https://github.com/PabloOmarAuni23/AuninsDescartablestvj/actions
     (aunque no haya cambios, la corrida queda registrada).
*/

// After pasting: run completarCategorias once, then crearTriggerEdit once.
var REPO = "PabloOmarAuni23/AuninsDescartablestvj";

// Se ejecuta con cada edición de la planilla.
// Run once to fill blank cells in the Categoria column.
function completarCategorias() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var table = obtenerTablaProductos_(sheet);
  var firstDataRow = table.headerRow + 1;
  var rowCount = table.values.length - firstDataRow;
  if (rowCount <= 0) return;
  var output = [];
  for (var i = firstDataRow; i < table.values.length; i++) {
    var name = table.values[i][table.productColumn];
    var current = table.values[i][table.categoryColumn];
    output.push([current && String(current).trim() ? current : (name ? categorizarProducto_(name) : "")]);
  }
  sheet.getRange(firstDataRow + 1, table.categoryColumn + 1, output.length, 1).setValues(output);
}

function completarCategoriaFila_(event) {
  if (!event || !event.range) return;
  var sheet = event.range.getSheet();
  var table = obtenerTablaProductos_(sheet);
  var row = event.range.getRow() - 1;
  if (row <= table.headerRow || row >= table.values.length) return;
  var name = table.values[row][table.productColumn];
  var category = table.values[row][table.categoryColumn];
  if (name && (!category || !String(category).trim())) {
    sheet.getRange(row + 1, table.categoryColumn + 1).setValue(categorizarProducto_(name));
  }
}

function obtenerTablaProductos_(sheet) {
  var values = sheet.getDataRange().getValues();
  var headerRow = -1;
  var productColumn = -1;
  var categoryColumn = -1;
  for (var r = 0; r < values.length; r++) {
    var headers = values[r].map(normalizarTexto_);
    productColumn = headers.findIndex(function(h) { return h.indexOf("PRODUCTO") === 0; });
    if (productColumn >= 0) {
      headerRow = r;
      categoryColumn = headers.findIndex(function(h) { return h === "CATEGORIA" || h === "CATEGORIAS"; });
      break;
    }
  }
  if (headerRow < 0) throw new Error("No se encontró el encabezado Producto.");
  if (categoryColumn < 0) {
    sheet.insertColumnAfter(productColumn + 1);
    categoryColumn = productColumn + 1;
    sheet.getRange(headerRow + 1, categoryColumn + 1).setValue("Categoria");
    values = sheet.getDataRange().getValues();
  }
  return { values: values, headerRow: headerRow, productColumn: productColumn, categoryColumn: categoryColumn };
}

function categorizarProducto_(name) {
  var t = normalizarTexto_(name);
  if (t.indexOf("ARRANQUE") >= 0) return "Bolsas de arranque";
  if (/BOLSA|SOBRE|CAMISETA|BOUTIQUE|EMBLOCADA/.test(t)) {
    if (t.indexOf("RINON") >= 0) return "Bolsas riñón";
    if (/\bPP\b|POLIPROPILENO/.test(t)) return "Bolsas de polipropileno (PP)";
    if (t.indexOf("CAMISETA") >= 0) return "Bolsas camiseta";
    if (t.indexOf("BOUTIQUE") >= 0) return "Bolsas boutique y kraft";
    return "Otras bolsas y sobres";
  }
  if (t.indexOf("CAJA") >= 0 && t.indexOf("CORRUGAD") >= 0) return "Cajas corrugadas";
  if ((t.indexOf("BANDEJA") >= 0 || t.indexOf("BAND ") === 0) && t.indexOf("MICRO") >= 0) return "Bandejas microondas";
  if (t.indexOf("BAND ") === 0) return "Bandejas, fuentes y dips";
  if (/VASO|PLATO|CUBIERTO|VAJILLA|AGITADOR/.test(t)) return "Vajilla descartable";
  if (/BANDEJA|ESTUCHE|POTE|ENVASE|TAPA/.test(t)) return "Envases, bandejas y potes";
  if (t.indexOf("CAJA") >= 0) return "Cajas y embalajes";
  if (/GLOBO|COTILLON|CUMPLE|PINATA|ANTIFAZ|ANTEOJO|BANDERIN|BANDERA|BENGALA|MASCARA|MONO|GORRO|VELA|CORTINA|GALERA|COLLAR|ESCARAPELA|PELUCA|GUIRNALDA|SERPENTINA/.test(t)) return "Cotillón y fiestas";
  if (/ABROCHADORA|ACUARELA|CARPETA|CUADERNO|CARTULINA|MARCADOR|LAPICERA|LAPIZ|CRAYON|COMPAS|CORRECTOR|TIJERA|PLASTICOLA|FELPA|TALONARIO|CALCULADORA|ETIQUETA|LIBRETA|LIBRO|MAPA|PIZARRA|PLASTILINA|PINCEL|REPUESTO|SILICONA/.test(t)) return "Librería y manualidades";
  if (/MOLDE|PIROTIN|TARTERA|OBLEA|FAJA|PALILLO|PINCHO|SOUFFLE|CUCHARA|CUCHILLO|ESPADITA|SORBETE/.test(t)) return "Repostería y gastronomía";
  if (/CINTA|CARTON|FOLEX|PAPEL|SERVILLETA|ALUMINIO|ROLLO|FILM|MANTEL/.test(t)) return "Papeles y envoltorios";
  if (/COFIA|BARBIJO|HIGIENICO|TOALLA|ROCIADOR|JABON|GUANTE/.test(t)) return "Higiene y limpieza";
  if (/MACETA|LAMPARA|PILA|PARLANTE|ORGANIZADOR|HIELERA|BIDON|TAZA|MATE|CUBETA|CUBO|EMBUDO|ENSALADERA|FRAPERA|MAMADERA|SALERO|SERVILLETERO|SACACORCHO|UTENSILLO|COLAGADOR|COLADOR|CAJITA|COPA|MALETIN|JUGUETE|INFLADOR|LLAVERO|RELOJ PERSONAJE|PRECINTO|HILO|PALITO|TRABAS|COLERO|PORTA/.test(t)) return "Hogar, cocina y accesorios";
  return "Varios y accesorios";
}

function normalizarTexto_(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function onEdit(e) {
  completarCategoriaFila_(e);
  // Espera 30 segundos: si editaste muchas celdas seguidas, agrupa todo
  // en un solo disparo y evita lanzar el workflow de corrida en corrida.
  ScriptApp.newTrigger("dispararSincronizacion")
    .timeBased()
    .after(30 * 1000)
    .create();
}

// Llama a la API de GitHub para disparar el workflow del repositorio.
function dispararSincronizacion() {
  var token = PropertiesService.getScriptProperties().getProperty("GH_TOKEN");
  if (!token) {
    throw new Error("Falta la propiedad GH_TOKEN en Propiedades del proyecto.");
  }
  var respuesta = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + REPO + "/dispatches",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json"
      },
      payload: JSON.stringify({ event_type: "actualizar-catalogo" }),
      muteHttpExceptions: true
    }
  );
  // 204 = OK (GitHub no devuelve cuerpo); 2xx también sirve.
  Logger.log("GitHub respondió: " + respuesta.getResponseCode());
  // Borramos los triggers temporales para no acumular duplicados.
  borrarTriggersTemporales();
}

// Ejecutar UNA VEZ tras pegar el script: instala el trigger onEdit.
function crearTriggerEdit() {
  borrarTriggersTemporales();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "onEdit") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("onEdit").forSpreadsheet(
    SpreadsheetApp.getActiveSpreadsheet()
  ).onEdit().create();
}

function borrarTriggersTemporales() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "dispararSincronizacion") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
