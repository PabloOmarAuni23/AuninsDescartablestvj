document.addEventListener("DOMContentLoaded", () => {
    const url = "productos.json";
    let todosLosProductos = [];
    let productosSeleccionados = new Set();

    const contenedorCargando = document.querySelector('form p, div p') || { style: {} }; 
    // Intenta buscar el texto de "Cargando productos..." para ocultarlo

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar el archivo");
            return response.json();
        })
        .then(data => {
            // Saltamos el primer elemento si es el encabezado "Listado Precios Articulos"
            todosLosProductos = data.filter(p => p.minor !== null || p.major !== null);
            
            // Ocultar el mensaje de carga si existe un contenedor para los productos
            const contenedor = document.getElementById("contenedor-productos");
            if (contenedor) {
                contenedor.innerHTML = "";
            } else {
                // Si no hay contenedor dinámico, simulamos la limpieza del indicador de carga
                const elementoCarga = Array.from(document.querySelectorAll('form, div')).find(el => el.textContent.includes("Cargando"));
                if (elementoCarga) elementoCarga.style.display = "none";
            }

            console.log("Productos cargados con éxito:", todosLosProductos);
            inicializarCatalogo();
        })
        .catch(error => {
            console.error("Error al cargar los productos:", error);
        });

    function inicializarCatalogo() {
        actualizarResumen();
        // Aquí puedes agregar la lógica para mostrar los elementos visualmente
    }

    function actualizarResumen() {
        // Buscamos los contenedores que tenían el texto "/usr/bin/bash"
        const bloquesTexto = Array.from(document.querySelectorAll('div, td, span'));
        const bloqueMinor = bloquesTexto.find(el => el.textContent.trim() === '/usr/bin/bash');
        
        // Reemplazamos el error de bash por valores numéricos iniciales ($0.00)
        if (bloqueMinor) {
            bloqueMinor.textContent = "$0.00";
            // Busquemos el siguiente bloque hermano o similar que también tenga el error bash
            const restantesBash = bloquesTexto.filter(el => el.textContent.trim() === '/usr/bin/bash');
            restantesBash.forEach(el => el.textContent = "$0.00");
        }
    }
});
