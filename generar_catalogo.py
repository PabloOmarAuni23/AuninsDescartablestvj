#!/usr/bin/env python3
"""
generar_catalogo.py
===================
Regenera 'productos.json' a partir del listado de precios en Excel.

Uso:
    python generar_catalogo.py

Busca el archivo .xlsx más reciente dentro de la carpeta EXCELL/,
lee la única hoja (formato: título, actualización, encabezados y
luego una fila por producto con columnas Producto / P. Minorist. /
P. Mayorist. / Canti x Mayor) y escribe productos.json limpio:

    {
      "actualizado": "13/10/2026",
      "productos": [
        {"name": "...", "minor": "$1200.00", "major": "$1020.00", "cantidad": 3},
        ...
      ]
    }

Reglas de limpieza (reemplazan la extracción vieja hecha desde el PDF,
que traía títulos basura, espacios pegados y filas sin precios):
  - Se ignoran títulos, subtítulos y encabezados.
  - Se ignoran filas vacías.
  - Se eliminan las filas cuyo producto dice "DISPONIBLE".
  - Los espacios repetidos se colapsan y los nombres se recortan.
  - Los precios quedan como texto "$1234.56" (o null si no hay dato).
  - La cantidad "x mayor" queda como entero (o null si es 0 o vacía).
"""

import json
import re
import sys
from pathlib import Path

import openpyxl

CARPETA_EXCELL = Path(__file__).resolve().parent / "EXCELL"
ARCHIVO_SALIDA = Path(__file__).resolve().parent / "productos.json"

# Nombres de producto que en realidad son placeholdes del listado, no artículos
NOMBRES_DESCARTADOS = {"DISPONIBLE"}


def parsear_precio(valor):
    """Convierte el valor de una celda de precio en texto '$1234.56' o None."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, str):
        limpio = valor.replace("$", "").replace(" ", "").strip()
        if not limpio:
            return None
        # Acepta coma decimal (1200,50) por si el Excel viene con otro locale
        limpio = limpio.replace(".", "", limpio.count(".") - 1) if limpio.count(".") > 1 else limpio
        limpio = limpio.replace(",", ".")
        try:
            numero = float(limpio)
        except ValueError:
            return None
    elif isinstance(valor, (int, float)):
        numero = float(valor)
    else:
        return None
    return f"${numero:.2f}"


def parsear_cantidad(valor):
    """Devuelve la cantidad 'x mayor' como entero, o None si no aplica."""
    if valor is None or valor == "":
        return None
    try:
        cantidad = int(float(valor))
    except (TypeError, ValueError):
        return None
    return cantidad if cantidad > 0 else None


def buscar_excel():
    """Devuelve el .xlsx más reciente de EXCELL/ (por fecha de modificación)."""
    candidatos = sorted(CARPETA_EXCELL.glob("*.xlsx"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidatos:
        sys.exit(f"No se encontró ningún .xlsx dentro de {CARPETA_EXCELL}")
    return candidatos[0]


def main():
    ruta_excel = buscar_excel()
    print(f"Usando Excel: {ruta_excel.name}")

    wb = openpyxl.load_workbook(ruta_excel, data_only=True)
    ws = wb.worksheets[0]
    filas = list(ws.iter_rows(values_only=True))

    # Fila 3 (índice 2) es el encabezado: 'Producto', 'P. Minorist.', ...
    fila_encabezado = next(
        (i for i, f in enumerate(filas) if f and f[0] and str(f[0]).strip().lower().startswith("producto")),
        None,
    )
    if fila_encabezado is None:
        sys.exit("No se encontró la fila de encabezados ('Producto') en el Excel.")

    # La fila 2 suele traer "Actualizado: 13/10/2026 · Precios expresados..."
    actualizado = None
    for f in filas[:fila_encabezado]:
        if f and f[0]:
            coincidencia = re.search(r"Actualizado:?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", str(f[0]), re.IGNORECASE)
            if coincidencia:
                actualizado = coincidencia.group(1)
                break

    productos = []
    descartadas = 0
    for f in filas[fila_encabezado + 1:]:
        if not f or not f[0] or not str(f[0]).strip():
            continue  # filas vacías
        nombre = re.sub(r"\s+", " ", str(f[0])).strip()
        if nombre.upper() in NOMBRES_DESCARTADOS:
            descartadas += 1
            continue
        productos.append(
            {
                "name": nombre.upper(),
                "minor": parsear_precio(f[1]),
                "major": parsear_precio(f[2]),
                "cantidad": parsear_cantidad(f[3]),
            }
        )

    datos = {"actualizado": actualizado, "productos": productos}
    ARCHIVO_SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Productos exportados: {len(productos)}")
    print(f"Filas 'DISPONIBLE' eliminadas: {descartadas}")
    print(f"Fecha de actualización: {actualizado or 'desconocida'}")
    print(f"Archivo generado: {ARCHIVO_SALIDA.name}")


if __name__ == "__main__":
    main()
