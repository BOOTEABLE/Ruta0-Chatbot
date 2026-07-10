import dotenv from 'dotenv';
dotenv.config();

async function escanearModelos() {
    console.log("🔍 Escaneando los servidores de Google con tu API Key...");
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("❌ No se encontró la API Key en el .env");
        return;
    }

    try {
        const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const datos = await respuesta.json();

        if (datos.error) {
            console.error("❌ Google rechazó la llave por este motivo:", datos.error.message);
            return;
        }

        console.log("\n✅ ¡ÉXITO! Estos son los modelos EXACTOS que Google te permite usar:");
        console.log("--------------------------------------------------");
        
        // Filtramos solo los modelos que sirven para chatear
        const modelosParaChat = datos.models.filter(m => 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
        );

        modelosParaChat.forEach(m => {
            // Le quitamos la palabra "models/" para que veas el nombre exacto
            console.log(`👉 ${m.name.replace('models/', '')}`);
        });
        
        console.log("--------------------------------------------------");
        console.log("📝 TAREA: Copia uno de esos nombres (el que diga flash o pro) y ponlo en tu ai.service.js");

    } catch (error) {
        console.error("❌ Error de red al intentar contactar a Google:", error);
    }
}

escanearModelos();