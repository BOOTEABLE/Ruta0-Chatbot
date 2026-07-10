import { pool } from '../repositories/db.js';
import { procesarMensaje } from '../services/ai.service.js';

// 🚦 EL CLASIFICADOR (Semáforo)
const clasificarIntencion = (mensaje) => {
    const texto = mensaje.toLowerCase();
    
    // 1. Palabras que SIEMPRE requieren análisis profundo o internet (Van a Gemini)
    const palabrasComplejas = ['$', 'dólar', 'dolares', 'horas', 'tiempo', 'clima', 'llueve', 'lluvia', 'romántico', 'niños', 'mascota', 'recomienda', 'itinerario', 'plan', 'presupuesto'];
    
    if (palabrasComplejas.some(pc => texto.includes(pc))) {
        return "GEMINI"; 
    }

    // 2. Búsquedas directas (Van a PostgreSQL a costo $0)
    const categoriasSimples = ['cafetería', 'cafeteria', 'restaurante', 'parque', 'museo', 'mirador', 'mostrar', 'buscar', 'dime'];
    
    if (texto.length < 40 || categoriasSimples.some(cs => texto.includes(cs))) {
        return "POSTGRESQL"; 
    }

    return "GEMINI"; 
};

// ⚙️ EL ENRUTADOR (Controlador principal)
export const enviarMensajeChat = async (req, res) => {
    try {
        const { mensaje, lat, lng } = req.body;
        
        const intencion = clasificarIntencion(mensaje);
        console.log(`🚦 [Enrutador] Intención detectada: ${intencion}`);

        if (intencion === "POSTGRESQL") {
            // ==========================================
            // 🟢 VÍA RÁPIDA (0 TOKENS) - Búsqueda SQL
            // ==========================================
            let query = '';
            let valores = [];
            
            let categoria = 'Otros';
            if (mensaje.toLowerCase().includes('cafe')) categoria = 'Cafeterías';
            else if (mensaje.toLowerCase().includes('restaurante') || mensaje.toLowerCase().includes('comer')) categoria = 'Gastronomía';
            else if (mensaje.toLowerCase().includes('museo')) categoria = 'Cultura';
            else if (mensaje.toLowerCase().includes('parque')) categoria = 'Parques';
            else if (mensaje.toLowerCase().includes('mirador')) categoria = 'Miradores';

            if (lat && lng) {
                // 👇 NUEVO: Añadimos latitud, longitud y horario a la consulta SQL
                query = `
                    SELECT nombre, categoria, descripcion, precio, latitud, longitud, horario FROM lugares 
                    WHERE categoria = $1 
                    AND ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 2000) 
                    LIMIT 5;
                `;
                valores = [categoria, lng, lat];
            } else {
                // 👇 NUEVO: Aquí también añadimos latitud, longitud y horario
                query = `SELECT nombre, categoria, descripcion, precio, latitud, longitud, horario FROM lugares WHERE categoria = $1 LIMIT 5;`;
                valores = [categoria];
            }

            const resultado = await pool.query(query, valores);
            const lugares = resultado.rows;
            console.log(`✅ Consulta terminada. Se encontraron ${lugares.length} lugares.`);

            if (lugares.length === 0) {
                return res.json({ 
                    respuesta: `No encontré lugares de tipo ${categoria} cerca de ti en este momento. ¡Intenta buscar otra cosa!`,
                    lugaresFisicos: [] 
                });
            }

            const textoRespuesta = lugares.map(l => `- **${l.nombre}** (Precio: ${l.precio}): ${l.descripcion}`).join('\n\n');
            
            // 👇 NUEVO: Devolvemos el texto Y la lista de objetos geográficos completa para Angular
            return res.json({ 
                respuesta: `*¡Consulta rápida (0 Tokens)!* ⚡\n\nAquí tienes algunas opciones de ${categoria} cerca de ti:\n\n${textoRespuesta}`,
                lugaresFisicos: lugares 
            });

        } else {
            // ==========================================
            // 🧠 VÍA INTELIGENTE (GEMINI) - Gasta Tokens
            // ==========================================
            const respuestaIA = await procesarMensaje(mensaje, lat, lng);
            
            // 👇 NUEVO: Retornamos directamente lo que entrega la IA (que ya incluye respuesta y lugaresFisicos)
            return res.json(respuestaIA); 
        }

    } catch (error) {
        console.error("❌ Error en el chat:", error);
        res.status(500).json({ error: "Upps, no pude conectar con el servidor." });
    }
};