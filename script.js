document.addEventListener("DOMContentLoaded", () => {
    const url = "productos.json";

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("No se pudo cargar el archivo de productos");
            }
            return response.json();
        })
        .then(data => {
            console.log("Productos cargados con éxito:", data);
            // Aquí puedes llamar a la función que renderiza tus productos en la pantalla
            // Ejemplo: mostrarProductos(data);
        })
        .catch(error => {
            console.error("Error al cargar los productos:", error);
        });
});
