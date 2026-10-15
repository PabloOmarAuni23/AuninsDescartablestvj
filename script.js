document.addEventListener("DOMContentLoaded", () => {
    const url = "productos.json";
    let todosLosProductos = [];
    let productosSeleccionados = new Set();
    let categoriaActual = "todos";
    let textoBusqueda = "";

    // Diccionario de categorías basados en tu archivo index.html
    const categoriasDefinidas = {
        "bandejas": "Bandejas, Estuches y Potes",
        "bolsas": "Bolsas y Sobres",
        "vajilla": "Vajilla Descartable",
        "embalaje": "Embalaje, Envolturas e Higiene"
    };

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar el archivo");
            return response.json();
        })
        .then(data => {
            // Filtrar elementos vacíos o que no sean productos reales
            todosLosProductos = data.filter(p => p.name && p.name !== "Listado Precios Articulos");
            
            // Asignar una categoría automática basada en palabras clave del nombre
            todosLosProductos.forEach(p => {
                const nombre = p.name.toUpperCase();
                if (nombre.includes("BAND") || nombre.includes("ESTUCHE") || nombre.includes("POTE")) {
                    p.categoriaAsignada = "bandejas";
                } else if (nombre.includes("BOLSA") || nombre.includes("SOBRE")) {
                    p.categoriaAsignada = "bolsas";
                } else if (nombre.includes("VASO") || nombre.includes("PLATO") || nombre.includes("CUBIERTO") || nombre.includes("VAJILLA")) {
                    p.categoriaAsignada = "vajilla";
                } else {
                    p.categoriaAsignada = "embalaje"; // Categoría por defecto
                }
            });

            inicializarCatalogo();
        })
        .catch(error => {
            console.error("Error al cargar los productos:", error);
            const msgCarga = document.getElementById("mensaje-carga");
            if (msgCarga) msgCarga.textContent = "Error al conectar con la base de datos.";
        });

    function inicializarCatalogo() {
        actualizarContadoresCategorias();
        renderizarProductos();
        configurarEventos();
        actualizarResumen();
    }

    function actualizarContadoresCategorias() {
        // Actualizar el número total del botón "Todos"
        const countTodos = document.querySelector('.categoria-boton[data-categoria="todos"] .contador');
        if (countTodos) countTodos.textContent = `(${todosLosProductos.length})`;

        // Actualizar los contadores específicos
        Object.keys(categoriasDefinidas).forEach(cat => {
            const cantidad = todosLosProductos.filter(p => p.categoriaAsignada === cat).length;
            const countElem = document.querySelector(`.categoria-boton[data-categoria="${cat}"] .contador`);
            if (countElem) countElem.textContent = `(${cantidad})`;
        });
    }

    function renderizarProductos() {
        // Encontrar el contenedor donde van las tarjetas de productos
        const grid = document.querySelector(".productos-grid");
        if (!grid) return;
        
        grid.innerHTML = "";

        // Filtrar según los criterios seleccionados
        const productosFiltrados = todosLosProductos.filter(p => {
            const cumpleCategoria = (categoriaActual === "todos" || p.categoriaAsignada === categoryActual);
            const cumpleBusqueda = p.name.toLowerCase().includes(textoBusqueda.toLowerCase());
            return cumpleCategoria && cumpleBusqueda;
        });

        if (productosFiltrados.length === 0) {
            grid.innerHTML = `<p style="padding: 20px; color: var(--color-texto-claro);">No se encontraron artículos.</p>`;
            return;
        }

        // Crear las tarjetas HTML dinámicamente
        productosFiltrados.forEach((p, index) => {
            const card = document.createElement("div");
            card.className = "producto-card tickeable";
            
            const precioMinor = p.minor ? p.minor : "Sin precio";
            const precioMajor = p.major ? p.major : "Sin precio";
            const cantidadTxt = p.cantidad ? `<span>Cant: ${p.cantidad}</span>` : "";

            card.innerHTML = `
                <div class="producto-nombre">${p.name}</div>
                <div class="producto-precio">
                    <div class="precio-item precio-minor">Min: <span class="valor">${precioMinor}</span></div>
                    <div class="precio-item precio-major">May: <span class="valor">${precioMajor}</span></div>
                </div>
                <div class="producto-cantidad">${cantidadTxt}</div>
            `;

            // Controlar si se selecciona el producto al hacer clic
            card.addEventListener("click", () => {
                if (productosSeleccionados.has(index)) {
                    productosSeleccionados.delete(index);
                    card.classList.remove("activo");
                } else {
                    productosSeleccionados.add(index);
                    card.classList.add("activo");
                }
                actualizarResumen();
            });

            grid.appendChild(card);
        });
    }

    function configurarEventos() {
        // Capturar la barra de búsqueda si existe
        const buscador = document.querySelector(".buscador");
        if (buscador) {
            buscador.addEventListener("input", (e) => {
                textoBusqueda = e.target.value;
                renderizarProductos();
            });
        }

        // Capturar clicks en los botones de categorías
        const botonesCategorias = document.querySelectorAll(".categoria-boton");
        botonesCategorias.forEach(btn => {
            btn.addEventListener("click", () => {
                botonesCategorias.forEach(b => b.classList.remove("activo"));
                btn.classList.add("activo");
                categoriaActual = btn.getAttribute("data-categoria") || "todos";
                renderizarProductos();
            });
        });

        // Botón limpiar selección
        const btnLimpiar = Array.from(document.querySelectorAll("button")).find(el => el.textContent.includes("Limpiar"));
        if (btnLimpiar) {
            btnLimpiar.addEventListener("click", () => {
                productosSeleccionados.clear();
                document.querySelectorAll(".producto-card").forEach(c => c.classList.remove("activo"));
                actualizarResumen();
            });
        }
    }

    function actualizarResumen() {
        // Buscar los elementos donde estaban los errores fijos de bash /usr/bin/bash
        const itemsResumen = document.querySelectorAll(".resumen-item .valor, .resumen-grid div");
        
        // Reemplazar textos y actualizar el estado de los precios dinámicamente
        let totalArticulos = productosSeleccionados.size;
        
        // Buscar el contenedor específico del resumen en el HTML para modificar los valores
        const elementosTexto = Array.from(document.querySelectorAll('div, span, p'));
        
        elementosTexto.forEach(el => {
            if (el.textContent.trim() === "/usr/bin/bash") {
                el.textContent = "\$0.00";
            }
            if (el.textContent.trim() === "0" && el.nextElementSibling?.textContent.includes("Artículos")) {
                el.textContent = totalArticulos.toString();
            }
        });
    }
});
