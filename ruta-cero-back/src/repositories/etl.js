import { pool } from './db.js';

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// 1. EXTRACT: Definimos la consulta Overpass (Quito)
const queryOSM = `
[out:json][timeout:90];
(
  nwr["amenity"="cafe"](-0.35,-78.58,-0.08,-78.43);
  nwr["amenity"="restaurant"](-0.35,-78.58,-0.08,-78.43);
  nwr["tourism"="museum"](-0.35,-78.58,-0.08,-78.43);
  nwr["tourism"="viewpoint"](-0.35,-78.58,-0.08,-78.43);
  nwr["leisure"="park"](-0.35,-78.58,-0.08,-78.43);
);
out center;
`;

const ejecutarETL = async () => {
    try {
        console.log("⏳ [ETL] 1. Extrayendo datos desde OpenStreetMap (Overpass API)...");
        
        const respuesta = await fetch(OVERPASS_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Ruta0-App-Quito/1.0"
            },
            body: "data=" + encodeURIComponent(queryOSM)
        });

        if (!respuesta.ok) {
            throw new Error(`Error en Overpass API: ${respuesta.statusText}`);
        }

        const datos = await respuesta.json();
        const elementos = datos.elements || [];
        console.log(`📥 [ETL] Se encontraron ${elementos.length} lugares en Quito.`);

        console.log("⏳ [ETL] 2. Limpiando y transformando datos...");
        console.log("⏳ [ETL] 3. Cargando datos en PostgreSQL con PostGIS...");

        let insertados = 0;

        for (const elemento of elementos) {
            if (!elemento.tags || !elemento.tags.name) continue;

            const nombre = elemento.tags.name;
            
            let categoria = "Otros";
            if (elemento.tags.amenity === 'cafe') categoria = 'Cafeterías';
            else if (elemento.tags.amenity === 'restaurant') categoria = 'Gastronomía';
            else if (elemento.tags.tourism === 'museum') categoria = 'Cultura';
            else if (elemento.tags.tourism === 'viewpoint') categoria = 'Miradores';
            else if (elemento.tags.leisure === 'park') categoria = 'Parques';

            // 👇 NUEVO: Extraemos el horario de OpenStreetMap (si no existe, ponemos un valor por defecto)
            const horario = elemento.tags.opening_hours || 'Horario no disponible';

            const lat = elemento.lat || (elemento.center ? elemento.center.lat : null);
            const lng = elemento.lon || (elemento.center ? elemento.center.lon : null);

            if (!lat || !lng) continue;

            const precio = elemento.tags.price_level === '1' ? '$' : elemento.tags.price_level === '3' ? '$$$' : '$$';
            const descripcion = elemento.tags.description || `Un fantástico lugar de categoría ${categoria} ubicado en Quito.`;

            // 👇 NUEVO: Agregamos la columna 'horario' y el parámetro $7 a la consulta
            const queryInsert = `
                INSERT INTO lugares (nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario)
                VALUES (
                    $1, 
                    $2, 
                    $3, 
                    $4, 
                    $5::numeric, 
                    $6::numeric, 
                    ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326),
                    $7
                )
                ON CONFLICT DO NOTHING;
            `;

            // 👇 NUEVO: Pasamos la variable 'horario' al final del array
            await pool.query(queryInsert, [nombre, categoria, precio, descripcion, lat, lng, horario]);
            insertados++;
        }

        console.log(`✅ [ETL] ¡Proceso completado con éxito! Se cargaron ${insertados} lugares reales en tu base de datos.`);

    } catch (error) {
        console.error("❌ [ETL] Error durante el proceso:", error.message);
    } finally {
        pool.end(); 
    }
};

ejecutarETL();