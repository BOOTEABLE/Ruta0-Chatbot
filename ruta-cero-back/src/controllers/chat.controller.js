import { pool } from '../repositories/db.js';
import { procesarMensaje } from '../services/ai.service.js';

const normalizarTexto = (texto) => {
    return texto.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const clasificarIntencion = (mensaje) => {
    const texto = normalizarTexto(mensaje);
    
    const palabrasComplejas = ['$', 'dolar', 'dolares', 'horas', 'tiempo', 'clima', 'llueve', 'lluvia', 'romantico', 'ninos', 'mascota', 'recomienda', 'itinerario', 'plan', 'presupuesto'];
    
    if (palabrasComplejas.some(pc => texto.includes(pc))) {
        return "GEMINI"; 
    }

    const categoriasSimples = ['cafeteria', 'cafe', 'restaurante', 'parque', 'museo', 'mirador', 'mostrar', 'buscar', 'dime'];
    
    if (texto.length < 40 || categoriasSimples.some(cs => texto.includes(cs))) {
        return "POSTGRESQL"; 
    }

    return "GEMINI"; 
};

export const enviarMensajeChat = async (req, res) => {
    try {
        const { mensaje, lat, lng } = req.body;
        
        const intencion = clasificarIntencion(mensaje);
        console.log(`🚦 [Enrutador] Intención detectada: ${intencion}`);

        if (intencion === "POSTGRESQL") {
            let query = '';
            let valores = [];
            
            let categoria = 'Otros';
            const textoNormalizado = normalizarTexto(mensaje); // úsalo en vez de mensaje.toLowerCase()
        if (textoNormalizado.includes('cafe')) categoria = 'Cafeterías';
            else if (textoNormalizado.includes('restaurante') || textoNormalizado.includes('comer')) categoria = 'Gastronomía';
            else if (textoNormalizado.includes('museo')) categoria = 'Cultura';
            else if (textoNormalizado.includes('parque')) categoria = 'Parques';
            else if (textoNormalizado.includes('mirador')) categoria = 'Miradores';

            if (lat && lng) {
                query = `
                    SELECT nombre, categoria, descripcion, precio, latitud, longitud, horario FROM lugares 
                    WHERE categoria = $1 
                    AND ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 2000) 
                    LIMIT 5;
                `;
                valores = [categoria, lng, lat];
            } else {
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
            
            return res.json({ 
                respuesta: `*¡Consulta rápida (0 Tokens)!* ⚡\n\nAquí tienes algunas opciones de ${categoria} cerca de ti:\n\n${textoRespuesta}`,
                lugaresFisicos: lugares 
            });

        } else {
            const respuestaIA = await procesarMensaje(mensaje, lat, lng);
            return res.json(respuestaIA); 
        }

    } catch (error) {
        console.error("❌ Error en el chat:", error);
        res.status(500).json({ error: "Upps, no pude conectar con el servidor." });
    }
};