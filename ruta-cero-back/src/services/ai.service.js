import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { pool } from '../repositories/db.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @typedef {Object} LugarDB
 * @property {string} nombre
 * @property {string} categoria
 * @property {string} descripcion
 * @property {string|null} horario
 * @property {string|null} precio
 * @property {number} latitud
 * @property {number} longitud
 * @property {number} confianza
 */

/**
 * @typedef {Object} ProcesarMensajeResult
 * @property {string} respuesta
 * @property {LugarDB[]} lugaresFisicos
 */

const MODEL_NAME = 'gemini-2.5-flash';
const SEARCH_RADIUS_METERS = 2000;
const MAX_PLACES_FOR_PROMPT = 20;

function buildPlacesText(lugares) {
  if (lugares.length === 0) {
    return 'Actualmente no hay lugares registrados cerca de esta ubicación.';
  }
  return lugares.map(l =>
    `- **${l.nombre}** (${l.categoria})${l.precio ? ` - ${l.precio}` : ''}: ${l.descripcion}${l.horario ? ` | Horario: ${l.horario}` : ''}`
  ).join('\n');
}

function buildPrompt(lugaresTexto, mensaje, fechaActual) {
  return `
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
  `.trim();
}

function rankPlacesForPrompt(lugares) {
  return [...lugares]
    .sort((a, b) => {
      const confDiff = b.confianza - a.confianza;
      if (confDiff !== 0) return confDiff;
      const horarioDiff = (b.horario ? 1 : 0) - (a.horario ? 1 : 0);
      if (horarioDiff !== 0) return horarioDiff;
      return (b.precio ? 1 : 0) - (a.precio ? 1 : 0);
    })
    .slice(0, MAX_PLACES_FOR_PROMPT);
}

function buildPlacesQuery(lat, lng) {
  return {
    text: `
      SELECT * FROM lugares 
      WHERE ST_DWithin(
        ubicacion::geography, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        $3
      ) ORDER BY confianza DESC LIMIT $4;
    `,
    values: [lng, lat, SEARCH_RADIUS_METERS, MAX_PLACES_FOR_PROMPT * 2]
  };
}

function buildRandomPlacesQuery() {
  return {
    text: 'SELECT * FROM lugares ORDER BY confianza DESC LIMIT $1;',
    values: [MAX_PLACES_FOR_PROMPT * 2]
  };
}

export const procesarMensaje = async (mensaje, lat, lng) => {
  try {
    let lugares = [];

    if (lat && lng) {
      console.log(`📍 Buscando a 2km de: Lat ${lat}, Lng ${lng}...`);
      const query = buildPlacesQuery(lat, lng);
      const resultadoDB = await pool.query(query.text, query.values);
      lugares = resultadoDB.rows;
    } else {
      console.log('⚠️ No hay GPS. Buscando lugares aleatorios...');
      const query = buildRandomPlacesQuery();
      const resultadoDB = await pool.query(query.text, query.values);
      lugares = resultadoDB.rows;
    }

    const lugaresParaPrompt = rankPlacesForPrompt(lugares);
    const lugaresTexto = buildPlacesText(lugaresParaPrompt);
    const fechaActual = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      tools: [{ googleSearch: {} }]
    });

    const prompt = buildPrompt(lugaresTexto, mensaje, fechaActual);

    console.log('🤖 Consultando a Gemini 2.5 Flash con Grounding...');
    const result = await model.generateContent(prompt);

    return {
      respuesta: result.response.text(),
      lugaresFisicos: lugares
    };

  } catch (error) {
    console.error('❌ Error en el servicio de IA:', error);
    throw new Error('No pudimos contactar a la IA o a la Base de Datos');
  }
};