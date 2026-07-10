# Ruta0 - Backend de Asistencia Turística Inteligente
Una aplicación híbrida de asistencia turística para la ciudad de Quito que combina consultas geoespaciales eficientes en PostGIS con razonamiento avanzado y clima en tiempo real mediante Gemini 2.5 Flash.

## Stack
- Lenguaje: JavaScript (ES Modules / `import`)
- Framework / runtime: Node.js 24.11 + Express.js
- Base de datos: PostgreSQL con extensión PostGIS (Manejo de Geografías SRID 4326)
- Motor de IA: Gemini 2.5 Flash (Google AI Studio) con Google Search Grounding activado exclusivamente para datos dinámicos.

## Comandos
- `npm run dev` — arranca el servidor en local usando Nodemon
- `node src/repositories/etl.js` — ejecuta el script de extracción, filtro de calidad y carga desde OpenStreetMap (Overpass API) hacia PostgreSQL.

## Estructura del proyecto
- `src/controllers/` — Capa de control de peticiones HTTP. Gestiona el enrutamiento inteligente (Semáforo de Intenciones).
- `src/services/` — Capa de lógica de negocio profunda. Contiene la lógica del AI Service y la construcción de Prompts Maestros.
- `src/repositories/` — Capa de persistencia y base de datos. Contiene la conexión al Pool de Postgres (`db.js`) y el script `etl.js`.

## Convenciones
- **Enrutamiento Híbrido (El Semáforo):** Cada mensaje entrante debe pasar por `clasificarIntencion()`. Si es una búsqueda directa por categoría o comando simple, se resuelve vía SQL puro (`POSTGRESQL`) a costo 0 tokens. Si requiere análisis de variables complejas (presupuesto, tiempo, clima), se enruta a `GEMINI`.
- **Contratos de Respuesta HTTP:** Todas las respuestas del chat hacia el frontend (Angular) deben retornar un objeto JSON estructurado con la forma `{ respuesta: string, lugaresFisicos: Array }`. Está prohibido recortar o aislar la respuesta de texto, los datos geoespaciales deben viajar en el mismo paquete.
- **Consultas PostGIS:** Las búsquedas por cercanía deben utilizar la función geográfica estricta `ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, distancia_metros)`.
- **Índice de Confianza:** Todos los registros en la base de datos deben contar con un puntaje entero en la columna `confianza`, evaluado en el ETL bajo las siguientes ponderaciones: Nombre (+30), Categoría (+20), Dirección (+15), Horario (+10), Teléfono (+10), Sitio Web (+10), Descripción/Imagen (+5).

## No hagas
- **Zonas Prohibidas (No alucinación de RAG):** No permitas que Gemini use Google Search para buscar horarios o direcciones de los lugares de la base de datos local. El prompt debe exigirle usar estrictamente los strings inyectados desde PostgreSQL para evitar colisiones de datos. Google Search se usa *únicamente* para el clima.
- **Filtro de Ingesta:** No elimines la regla mínima de calidad en el ETL. Cualquier lugar extraído de OpenStreetMap con una puntuación menor a 50 puntos debe ser descartado (`continue`) para evitar registrar datos "fantasmas" o vacíos que afecten la Experiencia de Usuario (UX).
- **Seguridad en Repositorios:** No subas el archivo `.env` que contiene las credenciales de PostgreSQL ni tu API Key de Gemini.
- **Cierre de Conexiones:** No olvides invocar `pool.end()` en los bloques `finally` de los scripts independientes (como el ETL) para evitar dejar colgadas conexiones zombis en el servidor de Postgres.

## Flujo de trabajo
- Antes de modificar el Prompt Maestro o añadir nuevas palabras clave al Clasificador de Intenciones, propón la lógica y espera mi confirmación.
- Trabajamos una característica a la vez (por ejemplo: implementar el flujo de reportes en base de datos o mapear los estados 🟢 🟡 🔴 en Angular). Al terminar, detalla los archivos modificados.
- Si una consulta geoespacial o el comportamiento de la IA genera un resultado inesperado, detén el código, imprime la traza de datos con `console.log` y analiza la discrepancia matemática.

## Documentación
- **Fuente de Datos Históricos:** OpenStreetMap mediante Overpass API (`https://overpass-api.de/api/interpreter`).
- **Arquitectura de Software Documentada:** Sistema Distribuido con API Composition (PostgreSQL, Redis, OpenTelemetry), Backend en arquitectura por capas (Controller->Service->Repository) y Frontend reactivo en Angular 20 mediante Standalone Components y Signals.