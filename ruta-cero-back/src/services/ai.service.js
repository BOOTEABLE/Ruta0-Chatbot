import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { pool } from '../repositories/db.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const procesarMensaje = async (mensaje, lat, lng) => {
    try {
        let lugares = [];

        // 1. Buscamos a un radio de 2km (2000 metros) usando PostGIS
        if (lat && lng) {
            console.log(`📍 Buscando a 2km de: Lat ${lat}, Lng ${lng}...`);
            const query = `
                SELECT * FROM lugares 
                WHERE ST_DWithin(
                    ubicacion::geography, 
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
                    2000 
                ) LIMIT 30; -- Limitamos a 30 para no saturar a la IA
            `;
            const resultadoDB = await pool.query(query, [lng, lat]);
            lugares = resultadoDB.rows;
        } else {
            console.log("⚠️ No hay GPS. Buscando lugares aleatorios...");
            const resultadoDB = await pool.query('SELECT * FROM lugares LIMIT 30;');
            lugares = resultadoDB.rows;
        }

        // 2. Formateamos los datos
        let lugaresTexto = "Actualmente no hay lugares registrados cerca de esta ubicación.";
        if (lugares.length > 0) {
            lugaresTexto = lugares.map(
                lugar => `- **${lugar.nombre}** (${lugar.categoria}): ${lugar.descripcion}`
            ).join('\n');
        }

        // 3. CAPA DE INTELIGENCIA: Gemini 2.5 Flash + Búsqueda en Internet
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            tools: [{ googleSearch: {} }] // ¡Encendemos el internet!
        });

        // 4. EL RELOJ: Para que sepa si un lugar está abierto AHORA
        const fechaActual = new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" });

        // 5. PROMPT MAESTRO (Ajustado a tu arquitectura)
        const promptContexto = `
Eres un asistente turístico experto de Ruta0.
Fecha y hora actual: ${fechaActual}.

BASE DE DATOS LOCAL (Lugares a menos de 2km):
${lugaresTexto}

REGLAS ESTRICTAS:
1. Recomienda ÚNICAMENTE los lugares de la base de datos local de arriba. No inventes lugares.
2. Si el usuario pregunta si están abiertos, o quieres dar un buen servicio, USA TU HERRAMIENTA DE GOOGLE SEARCH para buscar los horarios reales de los lugares recomendados en internet.
3. Si te preguntan por el clima actual, busca el clima de Quito en internet.
4. Sé conciso y honesto. Si no encuentras el horario en internet, dile al usuario que no pudiste confirmarlo.

Mensaje del usuario: "${mensaje}"
        `;

        console.log("🤖 Consultando a Gemini 2.5 Flash con Grounding...");
        const result = await model.generateContent(promptContexto);
        return { 
            respuesta: result.response.text(),
            lugaresFisicos: lugares 
        };

    } catch (error) {
        console.error("❌ Error en el servicio de IA:", error);
        throw new Error("No pudimos contactar a la IA o a la Base de Datos");
    }
};