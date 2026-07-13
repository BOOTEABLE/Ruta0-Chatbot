import { pool } from './db.js';

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

const calcularConfianza = (tags, categoria) => {
    let puntaje = 0;
    if (tags.name) puntaje += 30;
    if (categoria !== 'Otros') puntaje += 20;
    if (tags['addr:street'] || tags['addr:full']) puntaje += 15;
    if (tags.opening_hours) puntaje += 10;
    if (tags.phone || tags['contact:phone']) puntaje += 10;
    if (tags.website || tags['contact:website']) puntaje += 10;
    if (tags.description || tags.image) puntaje += 5;
    return puntaje;
};

export const ejecutarETL = async ({ cerrarConexionAlFinal = true } = {}) => {
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
        let descartados = 0;

        for (const elemento of elementos) {
            if (!elemento.tags || !elemento.tags.name) continue;

            const nombre = elemento.tags.name;
            
            let categoria = "Otros";
            if (elemento.tags.amenity === 'cafe') categoria = 'Cafeterías';
            else if (elemento.tags.amenity === 'restaurant') categoria = 'Gastronomía';
            else if (elemento.tags.tourism === 'museum') categoria = 'Cultura';
            else if (elemento.tags.tourism === 'viewpoint') categoria = 'Miradores';
            else if (elemento.tags.leisure === 'park') categoria = 'Parques';

            const confianza = calcularConfianza(elemento.tags, categoria);
            if (confianza < 50) {
                descartados++;
                continue;
            }

            const horario = elemento.tags.opening_hours || 'Horario no disponible';

            const lat = elemento.lat || (elemento.center ? elemento.center.lat : null);
            const lng = elemento.lon || (elemento.center ? elemento.center.lon : null);

            if (!lat || !lng) continue;

            const precio = elemento.tags.price_level === '1' ? '$' : elemento.tags.price_level === '3' ? '$$$' : '$$';
            const descripcion = elemento.tags.description || `Un fantástico lugar de categoría ${categoria} ubicado en Quito.`;

            const queryInsert = `
                INSERT INTO lugares (nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza, actualizado_en)
                VALUES (
                    $1, 
                    $2, 
                    $3, 
                    $4, 
                    $5::numeric, 
                    $6::numeric, 
                    ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326),
                    $7,
                    $8,
                    now()
                )
                ON CONFLICT (nombre) DO UPDATE SET
                    categoria = EXCLUDED.categoria,
                    precio = EXCLUDED.precio,
                    descripcion = EXCLUDED.descripcion,
                    horario = EXCLUDED.horario,
                    confianza = EXCLUDED.confianza,
                    actualizado_en = now();
            `;

            await pool.query(queryInsert, [nombre, categoria, precio, descripcion, lat, lng, horario, confianza]);
            insertados++;
        }

        console.log(`✅ [ETL] ¡Proceso completado! Se cargaron/actualizaron ${insertados} lugares. Se descartaron ${descartados} por baja confianza (<50 pts).`);

    } catch (error) {
        console.error("❌ [ETL] Error durante el proceso:", error.message);
    } finally {
        if (cerrarConexionAlFinal) {
            await pool.end();
        }
    }
};

const main = async () => {
    await ejecutarETL({ cerrarConexionAlFinal: true });
};

main();