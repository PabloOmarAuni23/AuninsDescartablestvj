#!/usr/bin/env python3
"""
generar_catalogo.py
===================
Regenera 'productos.json' a partir del listado de precios en Excel.

Uso:
    python generar_catalogo.py [ruta/al/archivo.xlsx]

Si no se indica ruta, busca el archivo .xlsx más reciente dentro de la
carpeta EXCELL/. La ruta también puede venir de la variable de entorno
RUTA_EXCELL (la usa el workflow de GitHub Actions).
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
import unicodedata
from pathlib import Path

import openpyxl

CARPETA_EXCELL = Path(__file__).resolve().parent / "EXCELL"
ARCHIVO_SALIDA = Path(__file__).resolve().parent / "productos.json"

# Nombres de producto que en realidad son placeholdes del listado, no artículos
NOMBRES_DESCARTADOS = {"DISPONIBLE"}


def normalizar_texto(valor):
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    return "".join(c for c in texto if not unicodedata.combining(c)).upper()


def categorizar_producto(nombre, categoria_planilla=None):
    """Usa la categoría de la planilla si existe; si no, clasifica por nombre."""
    if categoria_planilla is not None and str(categoria_planilla).strip():
        return re.sub(r"\s+", " ", str(categoria_planilla)).strip()

    texto = normalizar_texto(nombre)
    if "ARRANQUE" in texto:
        return "Bolsas de arranque"
    if "BOLSA" in texto or "SOBRE" in texto or "CAMISETA" in texto or "BOUTIQUE" in texto or "EMBLOCADA" in texto:
        if "RINON" in texto:
            return "Bolsas riñón"
        if re.search(r"\bPP\b|POLIPROPILENO", texto):
            return "Bolsas de polipropileno (PP)"
        if "CAMISETA" in texto:
            return "Bolsas camiseta"
        if "BOUTIQUE" in texto:
            return "Bolsas boutique y kraft"
        return "Otras bolsas y sobres"
    if "CAJA" in texto and "CORRUGAD" in texto:
        return "Cajas corrugadas"
    if ("BANDEJA" in texto or texto.startswith("BAND ")) and "MICRO" in texto:
        return "Bandejas microondas"
    if texto.startswith("BAND "):
        return "Bandejas, fuentes y dips"
    if any(p in texto for p in ("VASO", "PLATO", "CUBIERTO", "VAJILLA", "AGITADOR")):
        return "Vajilla descartable"
    if any(p in texto for p in ("BANDEJA", "ESTUCHE", "POTE", "ENVASE", "TAPA")):
        return "Envases, bandejas y potes"
    if "CAJA" in texto:
        return "Cajas y embalajes"
    if any(p in texto for p in ("ROLLO", "FILM", "PAPEL", "SERVILLETA", "ALUMINIO")):
        return "Papeles y envoltorios"
    if any(p in texto for p in ("HIGIENE", "LIMPIEZA", "GUANTE", "JABON")):
        return "Higiene y limpieza"
    if any(p in texto for p in ("GLOBO", "COTILLON", "CUMPLE", "PINATA", "ANTIFAZ", "ANTEOJO", "BANDERIN", "BANDERA", "BENGALA", "MASCARA", "MONO", "GORRO", "VELA", "CORTINA", "GALERA", "COLLAR", "ESCARAPELA", "PELUCA", "GUIRNALDA", "SERPENTINA", "NIEVE AEROSOL", "MAQUILLAJE ARTISTICO", "TUBO PULSERA", "AROS EXTRA", "AROS GRANDES")):
        return "Cotillón y fiestas"
    if any(p in texto for p in ("ABROCHADORA", "ACUARELA", "CARPETA", "CUADERNO", "CARTULINA", "MARCADOR", "LAPICERA", "LAPIZ", "CRAYON", "COMPAS", "CORRECTOR", "TIJERA", "PLASTICOLA", "FELPA", "TALONARIO", "CALCULADORA", "ETIQUETA", "GOMA ", "LIBRETA", "LIBRO", "MAPA", "PIZARRA", "PLASTILINA", "PINCEL", "REPUESTO", "SET ESCOLAR", "SET DE LIBRERIA", "TEMPERA", "TIZA", "SACAPUNTA", "ASIGNATURA", "PINTA PELO", "GLITTER", "ESFERA TELGOPOR", "SILICONA")):
        return "Librería y manualidades"
    if any(p in texto for p in ("MOLDE", "PIROTIN", "TARTERA", "OBLEA", "FAJA", "PALILLO", "PINCHO", "SOUFFLE", "CUCHARA", "CUCHILLO", "ESPADITA", "SORBETE")):
        return "Repostería y gastronomía"
    if any(p in texto for p in ("CINTA", "CARTON", "FOLEX", "FAJA", "PAPEL", "SERVILLETA", "ALUMINIO", "ROLLO", "FILM", "MANTEL")):
        return "Papeles y envoltorios"
    if any(p in texto for p in ("COFIA", "BARBIJO", "HIGIENICO", "TOALLA", "ROCIADOR", "JABON", "GUANTE")):
        return "Higiene y limpieza"
    if any(p in texto for p in ("MACETA", "LAMPARA", "PILA", "PARLANTE", "ORGANIZADOR", "HIELERA", "BIDON", "TAZA", "MATE", "CUBETA", "CUBO", "EMBUDO", "ENSALADERA", "FRAPERA", "MAMADERA", "SALERO", "SERVILLETERO", "SACACORCHO", "UTENSILLO", "PINZA PARA ENSALADA", "PORTA BOTELLA", "PORTA PANCHO", "PORTA SUPER PANCHO", "POSA PAVA", "COLAGADOR", "COLADOR", "CAJITA", "ENVACE", "ENVASE", "COPA ", "TARTERA", "MALETIN", "JUGUETE", "INFLADOR", "LLAVERO", "RELOJ PERSONAJE", "PRECINTO", "HILO ", "VARITA", "PALITO", "TRABAS", "COLERO", "ARO ", "SILICONA")):
        return "Hogar, cocina y accesorios"
    return "Varios y accesorios"


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
    # Ruta del Excel: argumento de línea de comandos > variable de entorno > el más reciente de EXCELL/
    ruta_excel = Path(sys.argv[1]) if len(sys.argv) > 1 else buscar_excel()
    if not ruta_excel.is_file():
        sys.exit(f"No existe el archivo: {ruta_excel}")
    print(f"Usando Excel: {ruta_excel}")

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

    encabezados = [normalizar_texto(celda) for celda in filas[fila_encabezado]]

    def buscar_columna(predicado, alternativa=None):
        return next((i for i, encabezado in enumerate(encabezados) if predicado(encabezado)), alternativa)

    indice_producto = buscar_columna(lambda h: h.startswith("PRODUCTO"), 0)
    indice_categoria = buscar_columna(lambda h: h in {"CATEGORIA", "CATEGORIAS"})
    indice_minorista = buscar_columna(lambda h: "MINORIST" in h, 2 if indice_categoria is not None else 1)
    indice_mayorista = buscar_columna(lambda h: "MAYORIST" in h, 3 if indice_categoria is not None else 2)
    indice_cantidad = buscar_columna(lambda h: "CANTI" in h, 4 if indice_categoria is not None else 3)

    def valor_celda(fila, indice):
        return fila[indice] if indice is not None and indice < len(fila) else None

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
        producto = valor_celda(f, indice_producto)
        if not f or not producto or not str(producto).strip():
            continue  # filas vacías
        nombre = re.sub(r"\s+", " ", str(producto)).strip()
        if nombre.upper() in NOMBRES_DESCARTADOS:
            descartadas += 1
            continue
        productos.append(
            {
                "name": nombre.upper(),
                "minor": parsear_precio(valor_celda(f, indice_minorista)),
                "major": parsear_precio(valor_celda(f, indice_mayorista)),
                "cantidad": parsear_cantidad(valor_celda(f, indice_cantidad)),
                "categoria": categorizar_producto(
                    nombre,
                    valor_celda(f, indice_categoria),
                ),
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
