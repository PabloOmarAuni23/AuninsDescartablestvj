document.addEventListener("DOMContentLoaded", () => {
    const url = "productos.json";
    let todosLosProductos = [];
    let productosSeleccionados = new Set();
    let categoriaActual = "todos";
    let textoBusqueda = "";

    // Elementos de la interfaz HTML
    const gridProductos = document.querySelector(".productos-grid");
    const mensajeCarga = document.getElementById("mensaje-carga");
    const buscador = document.querySelector(".buscador");
    const btnLimpiar = document.getElementById("btn-limpiar");
    const botonesCategorias = document.querySelectorAll(".categoria-boton");

    // Elementos del cuadro inferior de resumen
    const resumenItems = document.getElementById("resumen-items");
    const resumenMinor = document.getElementById("resumen-minor");
    const resumenMajor = document.getElementById("resumen-major");

    // Intentar leer el archivo JSON de productos
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar el archivo");
            return response.json();
        })
        .then(data => {
            // Filtramos las filas vacías o decorativas del JSON
            todosLosProductos = data.filter(p => p.name && p.name !== "Listado Precios Articulos");

            // Clasificación interna por palabras clave para repartirlos en tus botones
            todosLosProductos.forEach(p => {
                const nombre = p.name.toUpperCase();
                if (nombre.includes("BAND") || nombre.includes("ESTUCHE") || nombre.includes("POTE")) {
                    p.categoriaAsignada = "bandejas";
                } else if (nombre.includes("BOLSA") || nombre.includes("SOBRE")) {
                    p.categoriaAsignada = "bolsas";
                } else if (nombre.includes("VASO") || nombre.includes("PLATO") || nombre.includes("CUBIERTO") || nombre.includes("VAJILLA") || nombre.includes("AGITADOR")) {
                    p.categoriaAsignada = "vajilla";
                } else {
                    p.categoriaAsignada = "embalaje";
                }
            });

            // Ocultamos el letrero estático de carga
            if (mensajeCarga) mensajeCarga.style.display = "none";

            inicializarCatalogo();
        })
        .catch(error => {
            console.error("Error cargando base de datos:", error);
            if (mensajeCarga) mensajeCarga.textContent = "❌ Error al cargar los artículos.";
        });

    function inicializarCatalogo() {
        actualizarContadores();
        renderizarTarjetas();
        configurarFiltros();
    }

    function actualizarContadores() {
        // Poner el total numérico en el botón "Todos"
        const countTodos = document.querySelector('.categoria-boton[data-categoria="todos"] .contador');
        if (countTodos) countTodos.textContent = `(${todosLosProductos.length})`;

        // Poner las cantidades respectivas a cada categoría
        const categorias = ["bandejas", "bolsas", "vajilla", "embalaje"];
        categorias.forEach(cat => {
            const totalCat = todosLosProductos.filter(p => p.categoriaAsignada === cat).length;
            const countElem = document.querySelector(`.categoria-boton[data-categoria="${cat}"] .contador`);
            if (countElem) countElem.textContent = `(${totalCat})`;
        });
    }

    function renderizarTarjetas() {
        if (!gridProductos) return;
        gridProductos.innerHTML = "";

        // Filtrado en tiempo real por botones y barra de búsqueda
        const filtrados = todosLosProductos.filter(p => {
            const coincideCat = (categoriaActual === "todos" || p.categoriaAsignada === categoriaActual);
            const coincideBusqueda = p.name.toLowerCase().includes(textoBusqueda.toLowerCase());
            return coincideCat && coincideBusqueda;
        });

        if (filtrados.length === 0) {
            gridProductos.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-texto-claro); padding: 20px;">No se encontraron artículos que coincidan.</div>`;
            return;
        }

        // Crear las cajitas de los artículos en la cuadrícula
        filtrados.forEach(p => {
            const card = document.createElement("div");
            card.className = `producto-card tickeable ${productosSeleccionados.has(p.name) ? "activo" : ""}`;

            const txtMinor = p.minor ? p.minor : "---";
            const txtMajor = p.major ? p.major : "---";
            const divCant = p.cantidad ? `<div class="producto-cantidad"><span>Mayor desde: ${p.cantidad} u.</span></div>` : "";

            card.innerHTML = `
                <div class="producto-nombre">${p.name}</div>
                <div class="producto-precio">
                    <div class="precio-item precio-minor">Min: <span class="valor">${txtMinor}</span></div>
                    <div class="precio-item precio-major">May: <span class="valor">${txtMajor}</span></div>
                </div>
                ${divCant}
            `;

            // Marcar y desmarcar productos al tocarlos
            card.addEventListener("click", () => {
                if (productosSeleccionados.has(p.name)) {
                    productosSeleccionados.delete(p.name);
                    card.classList.remove("activo");
                } else {
                    productosSeleccionados.add(p.name);
                    card.classList.add("activo");
                }
                calcularTotales();
            });

            gridProductos.appendChild(card);
        });
    }

    function configurarFiltros() {
        // Evento para escribir en la barra buscadora
        if (buscador) {
            buscador.addEventListener("input", (e) => {
                textoBusqueda = e.target.value;
                renderizarTarjetas();
            });
        }

        // Eventos para cambiar de pestaña de categorías
        botonesCategorias.forEach(btn => {
            btn.addEventListener("click", () => {
                botonesCategorias.forEach(b => b.classList.remove("activo"));
                btn.classList.add("activo");
                categoriaActual = btn.getAttribute("data-categoria") || "todos";
                renderizarTarjetas();
            });
        });

        // Botón para limpiar todos los artículos marcados de golpe
        if (btnLimpiar) {
            btnLimpiar.addEventListener("click", () => {
                productosSeleccionados.clear();
                document.querySelectorAll(".producto-card").forEach(c => c.classList.remove("activo"));
                calcularTotales();
            });
        }
    }

    function calcularTotales() {
        let sumaMinor = 0;
        let sumaMajor = 0;

        // Sumar aritméticamente los elementos elegidos por el usuario
        todosLosProductos.forEach(p => {
            if (productosSeleccionados.has(p.name)) {
                // Limpiar símbolos de pesos y convertir texto numérico ("\$1200.00" -> 1200)
                const numMinor = p.minor ? parseFloat(p.minor.replace("\$", "")) : 0;
                const numMajor = p.major ? parseFloat(p.major.replace("\$", "")) : 0;
                
                if (!isNaN(numMinor)) sumaMinor += numMinor;
                if (!isNaN(numMajor)) sumaMajor += numMajor;
            }
        });

        // Imprimir los resultados finales actualizados en el panel
        if (resumenItems) resumenItems.textContent = productosSeleccionados.size;
        if (resumenMinor) resumenMinor.textContent = `$${sumaMinor.toFixed(2)}`;
        if (resumenMajor) resumenMajor.textContent = `$${sumaMajor.toFixed(2)}`;
    }
});
