import dotenv from 'dotenv';
dotenv.config();

async function descubrirModelos() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        console.log("⏳ Conectando con los servidores de Google...");
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        
        if (datos.error) {
            console.log("❌ Error con la API Key:", datos.error.message);
            return;
        }

        // Filtramos solo los que se llaman "gemini"
        const nombres = datos.models
            .map(m => m.name.replace('models/', ''))
            .filter(n => n.includes('gemini'));
            
        console.log("✅ ¡Éxito! Estos son los modelos exactos que puedes usar:");
        console.log(nombres);
    } catch (error) {
        console.error("❌ Error consultando a Google:", error.message);
    }
}

descubrirModelos();