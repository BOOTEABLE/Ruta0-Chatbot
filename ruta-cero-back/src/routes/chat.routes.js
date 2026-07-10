import { Router } from 'express';
import { enviarMensajeChat } from '../controllers/chat.controller.js';

const router = Router();

// Aquí le decimos que escuche las peticiones POST
router.post('/', enviarMensajeChat);

export default router;