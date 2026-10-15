document.addEventListener("DOMContentLoaded", () => {
    const url = "productos.json";
    let todosLosProductos = [];
    let productosSeleccionados = new Set();
    let categoriaActual = "todos";
    let textoBusqueda = "";
    let filtrosConfigurados = false;
    let controlesConfigurados = false;
    let peticionId = 0;

    // Elementos de la interfaz HTML
    const gridProductos = document.querySelector(".productos-grid");
    const mensajeCarga = document.getElementById("mensaje-carga");
    const mensajeError = document.getElementById("mensaje-error");
    const buscador = document.querySelector(".buscador");
    const btnBuscar = document.getElementById("btn-buscar");
    const btnLimpiar = document.getElementById("btn-limpiar");
    const btnRefrescar = document.getElementById("btn-refrescar");
    const btnReintentar = document.getElementById("btn-reintentar");
    const botonesCategorias = document.querySelectorAll(".categoria-boton");

    // Elementos del cuadro inferior de resumen
    const resumenItems = document.getElementById("resumen-items");
    const resumenMinor = document.getElementById("resumen-minor");
    const resumenMajor = document.getElementById("resumen-major");

    // Intentar leer el archivo JSON de productos (reintentable).
    // peticionId evita que una respuesta vieja (lenta) pise a la más reciente.
    function cargarProductos() {
        const miPeticion = ++peticionId;
        if (mensajeCarga) {
            mensajeCarga.style.display = "block";
            mensajeCarga.textContent = "⏳ Cargando productos...";
        }
        if (mensajeError) mensajeError.style.display = "none";

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status} al cargar ${url}`);
                return response.json();
            })
            .then(data => {
                if (miPeticion !== peticionId) return; // respuesta obsoleta
                if (!Array.isArray(data)) throw new Error("El JSON no contiene una lista de productos");

                // Filtramos títulos, filas vacías y renglones de ruido (p. ej. "-333 $14.79 $13.77")
                todosLosProductos = data.filter(p =>
                    p &&
                    typeof p.name === "string" &&
                    p.name.trim() !== "" &&
                    p.name !== "Listado Precios Articulos" &&
                    !/^Total Articulos/i.test(p.name.trim()) &&
                    /[a-záéíóúñ]/i.test(p.name)
                );

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
                if (miPeticion !== peticionId) return; // el fallo también es de una petición vieja
                console.error("Error cargando base de datos:", error);
                if (mensajeCarga) mensajeCarga.style.display = "none";
                if (mensajeError) mensajeError.style.display = "block";
            });
    }

    cargarProductos();

    // Controles únicos de la página (se registran una sola vez aunque
    // DOMContentLoaded o la carga se disparen más de una vez)
    function configurarControles() {
        if (controlesConfigurados) return;
        controlesConfigurados = true;

        // Botón "Intentar de nuevo" del mensaje de error
        if (btnReintentar) {
            btnReintentar.addEventListener("click", (e) => {
                e.preventDefault();
                cargarProductos();
            });
        }

        // Botón "Refrescar" del header: recarga los datos sin recargar la página completa
        if (btnRefrescar) {
            btnRefrescar.addEventListener("click", () => {
                productosSeleccionados.clear();
                if (buscador) buscador.value = "";
                textoBusqueda = "";
                categoriaActual = "todos";
                botonesCategorias.forEach(b => b.classList.toggle("activo", b.getAttribute("data-categoria") === "todos"));
                document.querySelectorAll(".producto-card").forEach(c => c.classList.remove("activo"));
                calcularTotales();
                cargarProductos();
            });
        }

        // Botón "🔍 Buscar": aplica el texto escrito en la barra
        if (btnBuscar) {
            btnBuscar.addEventListener("click", () => {
                textoBusqueda = buscador ? buscador.value : "";
                renderizarTarjetas();
            });
        }
    }

    configurarControles();

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

    function configureFiltros() {
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

    function configurarFiltros() {
        // En reintentos no volvemos a registrar los listeners
        if (filtrosConfigurados) return;
        filtrosConfigurados = true;
        configureFiltros();
    }

    function calcularTotales() {
        let sumaMinor = 0;
        let sumaMajor = 0;

        // Sumar aritméticamente los elementos elegidos por el usuario con soporte para comas latinas
        todosLosProductos.forEach(p => {
            if (productosSeleccionados.has(p.name)) {
                // Reemplazamos la coma por punto y removemos el signo de pesos
                const strMinor = p.minor ? p.minor.replace("\$", "").replace(",", ".").trim() : "0";
                const strMajor = p.major ? p.major.replace("\$", "").replace(",", ".").trim() : "0";
                
                const numMinor = parseFloat(strMinor);
                const numMajor = parseFloat(strMajor);
                
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

