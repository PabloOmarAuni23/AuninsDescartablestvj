// Datos de productos (cargados desde JSON)
let productos = [];
let productosPorCategoria = { todos: [], bandejas: [], bolsas: [], vajilla: [], embalaje: [] };
let seleccionados = new Set();

// Categorías de mapeo
const categoriasMap = {
    'bandejas': ['bandeja', 'estuche', 'pote', 'recipiente', 'plato', 'bowl', 'alimento', 'empacar', 'dulce', 'postre', 'food container'],
    'bolsas': ['bolsa', 'sobre', 'saco', 'envase', 'mail', 'e-commerce', 'kraft', 'papel', 'residuo', 'despacho', 'envío', 'delivery', 'takeaway', 'sobres'],
    'vajilla': ['vaso', 'copa', 'plato', 'cubierto', 'tenedor', 'cuchara', 'cuchillo', 'pitillo', 'sorbete', 'pincho', 'servillet', 'mantel', 'tissue', 'bebida', 'drink', 'café', 'cafe', 'recipient', 'cantinilla'],
    'embalaje': ['film', 'stretch', 'papel', 'comercial', 'higiene', 'limpieza', 'guante', 'nitrilo', 'latex', 'barbijo', 'cofia', 'sabana', 'camilla', 'pack', 'empaque', 'envoltura', 'proteccion', 'sanitario', 'wipe']
};

function categorizarProducto(nombre) {
    const lower = nombre.toLowerCase();
    for (const [cat, palabras] of Object.entries(categoriasMap)) {
        for (const p of palabras) {
            if (lower.includes(p)) return cat;
        }
    }
    return 'todos';
}

async function cargarProductos() {
    try {
        const respuesta = await fetch('productos.json');
        productos = await respuesta.json();
        productosPorCategoria.todos = productos;
        for (const p of productos) {
            const cat = categorizarProducto(p.name || '');
            productosPorCategoria[cat].push(p);
        }
        renderizarProductos('todos');
        actualizarContadores();
        const buscador = document.getElementById('buscador');
        if (buscador) {
            const savedSearch = localStorage.getItem('buscador');
            if (savedSearch) {
                buscador.value = savedSearch;
                filtrarProductos();
            }
        }
    } catch (error) {
        document.getElementById('lista-productos').innerHTML = '<p>Error al cargar: ' + error.message + '</p>';
    }
}

function renderizarProductos(categoria) {
    const lista = document.getElementById('lista-productos');
    const productosFiltrados = productosPorCategoria[categoria];
    if (productosFiltrados.length === 0) {
        lista.innerHTML = '<div class="vacio"><div class="vacio-icono">🔍</div><p>No se encontraron artículos en esta categoría</p></div>';
        return;
    }
    let html = '';
    for (const p of productosFiltrados) {
        const nombre = p.name || 'Sin nombre';
        const nombreLimpiado = nombre.replace(/<[^>]*>/g, '');
        const minor = p.minor ? '$$' + p.minor : 'Sin precio';
        const major = p.major ? '$$' + p.major : 'Sin precio';
        const cantidad = p.cantidad ? '📦 ' + p.cantidad + ' u. (canti x mayor)' : '';
        const checked = seleccionados.has(nombre) ? 'checked' : '';
        const showTick = seleccionados.has(nombre) ? '✓' : '';
        html += '<div class="producto-card tickeable" data-nombre="' + nombreLimpiado + '">';
        html += '<div class="producto-checkbox">';
        html += '<input type="checkbox" id="check-' + nombre + '" ' + checked + ' onchange="toggleSeleccion(' + nombre + ')">';
        html += '<span class="checkbox-indicador">' + showTick + '</span>';
        html += '<div class="producto-nombre">' + nombreLimpiado + '</div>';
        html += '</div>';
        html += '<div class="producto-precio">';
        html += '<span class="precio-item">Minor: <span class="valor">' + minor + '</span></span>';
        html += '<span class="precio-item">Mayor: <span class="valor">' + major + '</span></span>';
        html += '</div>';
        if (cantidad) html += '<div class="producto-cantidad">' + cantidad + '</div>';
        html += '</div>';
    }
    lista.innerHTML = html;
}

// Filtrar productos por categoría
function filtrarPorCategoria(categoria) {
    const botones = document.querySelectorAll('.categoria-boton');
    botones.forEach(b => b.classList.remove('activo'));
    if (categoria === 'todos') {
        document.querySelector('[data-categoria="todos"]').classList.add('activo');
    } else {
        document.querySelector('[data-categoria="' + categoria + '"]').classList.add('activo');
    }
    renderizarProductos(categoria);
    actualizarContadores();
    document.getElementById('buscador').focus();
}

// Filtrar por búsqueda
function filtrarProductos() {
    const termino = document.getElementById('buscador').value.toLowerCase().trim();
    const botones = document.querySelectorAll('.categoria-boton');
    const categoriaActual = Array.from(botones).find(b => b.classList.contains('activo'))?.dataset.categoria || 'todos';
    if (termino === '') {
        renderizarProductos(categoriaActual);
        actualizarContadores();
        return;
    }
    let resultados = [];
    if (categoriaActual === 'todos') {
        resultados = productos.filter(p => p.name && p.name.toLowerCase().includes(termino));
    } else {
        resultados = productosPorCategoria[categoriaActual].filter(p => p.name && p.name.toLowerCase().includes(termino));
    }
    if (resultados.length === 0) {
        document.getElementById('lista-productos').innerHTML = '<div class="vacio"><div class="vacio-icono">🔍</div><p>No se encontraron artículos con "' + termino + '</p></div>';
        return;
    }
    let html = '';
    for (const p of resultados) {
        const nombre = p.name || 'Sin nombre';
        const minor = p.minor ? '$$' + p.minor : 'Sin precio';
        const major = p.major ? '$$' + p.major : 'Sin precio';
        const cantidad = p.cantidad ? '📦 ' + p.cantidad + ' u. (canti x mayor)' : '';
        const checked = seleccionados.has(nombre) ? 'checked' : '';
        const showTick = seleccionados.has(nombre) ? '✓' : '';
        html += '<div class="producto-card tickeable" data-nombre="' + nombre + '">';
        html += '<div class="producto-checkbox">';
        html += '<input type="checkbox" id="check-' + nombre + '" ' + checked + ' onchange="toggleSeleccion(' + nombre + ')">';
        html += '<span class="checkbox-indicador">' + showTick + '</span>';
        html += '<div class="producto-nombre">' + nombre + '</div>';
        html += '</div>';
        html += '<div class="producto-precio">';
        html += '<span class="precio-item">Minor: <span class="valor">' + minor + '</span></span>';
        html += '<span class="precio-item">Mayor: <span class="valor">' + major + '</span></span>';
        html += '</div>';
        if (cantidad) html += '<div class="producto-cantidad">' + cantidad + '</div>';
        html += '</div>';
    }
    document.getElementById('lista-productos').innerHTML = html;
}

// Toggle de selección
function toggleSeleccion(nombre) {
    const checkbox = document.getElementById('check-' + nombre);
    if (checkbox && checkbox.checked) {
        seleccionados.add(nombre);
    } else {
        seleccionados.delete(nombre);
    }
    renderizarProductos('todos');
    actualizarContadores();
}

// Actualizar contadores y resumen
function actualizarContadores() {
    const seleccionadosItems = document.querySelectorAll('.producto-card input[type="checkbox"]:checked');
    const seleccionadosCount = seleccionadosItems.length;
    document.getElementById('resumen-total-articulos').textContent = seleccionadosCount;
    let totalMinor = 0;
    let totalMajor = 0;
    let totalCantidad = 0;
    seleccionadosItems.forEach(cb => {
        const card = cb.closest('.producto-card');
        const nombre = card.dataset.nombre;
        const producto = productos.find(p => p.name === nombre);
        if (producto) {
            if (producto.minor) totalMinor += parseFloat(producto.minor.replace('$', ''));
            if (producto.major) totalMajor += parseFloat(producto.major.replace('$', ''));
            if (producto.cantidad) totalCantidad += parseInt(producto.cantidad);
        }
    });
    document.getElementById('resumen-total-minor').textContent = totalMinor > 0 ? '$' + totalMinor.toFixed(2) : '$0';
    document.getElementById('resumen-total-major').textContent = totalMajor > 0 ? '$' + totalMajor.toFixed(2) : '$0';
    document.getElementById('resumen-cantidad').textContent = totalCantidad;
    document.getElementById('resumen-total-general').textContent = totalMajor > 0 ? '$' + totalMajor.toFixed(2) : '$0';
    document.getElementById('resumen-total-general').classList.toggle('sin-seleccion', totalMajor === 0);
}

// Limpiar selección
function limpiarSeleccion() {
    seleccionados.clear();
    renderizarProductos('todos');
    actualizarContadores();
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    document.getElementById('buscador').addEventListener('input', function() {
        localStorage.setItem('buscador', this.value);
    });
});
