#!/usr/bin/env python3
"""
disparar-sincronizacion.gs  (código de Google Apps Script, va DENTRO de la
Google Sheet "listado-precios", no de este repositorio)

Qué hace: cada vez que editás la planilla, avisa por la API de GitHub para que
el workflow "Sincronizar catálogo desde Google Drive" se ejecute YA mismo, sin
esperar al cron de los 30 minutos.

Cómo instalarlo (una sola vez):
  1) Abrí la planilla https://docs.google.com/spreadsheets/d/1kYNYTLA2BjPgWNtGw5GO1OVzXPsS_D0thsgD3trYAjk
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
"""

REPO = "PabloOmarAuni23/AuninsDescartablestvj";

// Se ejecuta con cada edición de la planilla.
function onEdit(e) {
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
