import cron from 'node-cron';
import { ejecutarETL } from './etl.js';

const HORARIO_CRON = process.env.ETL_CRON_SCHEDULE || '0 3 * * 0';

let corriendoActualmente = false;

export const iniciarCronRefrescoLugares = () => {
    cron.schedule(HORARIO_CRON, async () => {
        if (corriendoActualmente) {
            console.log('⏭️  [CRON] El ETL anterior sigue corriendo, se salta esta ejecución.');
            return;
        }

        corriendoActualmente = true;
        console.log('🔄 [CRON] Iniciando refresco automático de lugares (ETL)...');

        try {
            await ejecutarETL({ cerrarConexionAlFinal: false });
        } catch (error) {
            console.error('❌ [CRON] Error inesperado corriendo el ETL programado:', error.message);
        } finally {
            corriendoActualmente = false;
        }
    }, {
        timezone: 'America/Guayaquil'
    });

    console.log(`🕒 [CRON] Refresco automático de lugares programado: "${HORARIO_CRON}" (America/Guayaquil).`);
};