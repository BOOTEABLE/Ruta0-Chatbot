import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    // Estas dos líneas evitan que el servidor se cuelgue:
    max: 20, // Máximo 20 conexiones al mismo tiempo
    idleTimeoutMillis: 30000 // Cierra conexiones inactivas después de 30 seg
});

// Este console.log solo debería aparecer UNA VEZ cuando el servidor arranca
console.log("📦 Conectado a la Base de Datos PostgreSQL");