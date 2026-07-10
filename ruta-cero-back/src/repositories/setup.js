import { pool } from './db.js';

const configurarBaseDeDatos = async () => {
    try {
        console.log("⏳ Conectando a PostgreSQL y preparando terreno...");
        
        // 1. Activamos los superpoderes espaciales de PostGIS
        await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');

        // 2. Borramos la tabla vieja
        await pool.query('DROP TABLE IF EXISTS lugares;');

        // 3. Creamos la nueva tabla con columnas para GPS
        await pool.query(`
            CREATE TABLE lugares (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                categoria VARCHAR(50) NOT NULL,
                precio VARCHAR(20),
                descripcion TEXT,
                latitud DECIMAL(10, 8),
                longitud DECIMAL(11, 8),
                ubicacion GEOMETRY(Point, 4326) -- Esta es la columna mágica de PostGIS
            );
        `);
        console.log("✅ Tabla 'lugares' creada con soporte para mapas.");

        // 4. Insertamos los lugares, ahora con sus coordenadas reales en Quito
        console.log("⏳ Insertando lugares con sus coordenadas reales...");
        await pool.query(`
            INSERT INTO lugares (nombre, categoria, precio, descripcion, latitud, longitud, ubicacion) VALUES 
            ('Café de la Vaca Centro', 'Cafetería', '$$', 'Excelente cafetería tradicional en el centro.', -0.2201, -78.5123, ST_SetSRID(ST_MakePoint(-78.5123, -0.2201), 4326)),
            ('Parque La Carolina', 'Parques', 'Gratis', 'El parque más grande del centro-norte.', -0.1839, -78.4831, ST_SetSRID(ST_MakePoint(-78.4831, -0.1839), 4326)),
            ('Yaku Museo del Agua', 'Museos', '$', 'Museo con excelentes vistas de la ciudad.', -0.2232, -78.5186, ST_SetSRID(ST_MakePoint(-78.5186, -0.2232), 4326));
        `);
        console.log("✅ Datos y coordenadas guardados correctamente.");

    } catch (error) {
        console.error("❌ Error configurando la base de datos:", error.message);
    } finally {
        pool.end(); 
    }
};

configurarBaseDeDatos();