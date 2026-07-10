import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './src/routes/chat.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (Seguridad básica y parseo de JSON que pediste en la arquitectura)
app.use(cors());
app.use(express.json());

// Endpoint de Health Check (Mencionado en tu optimización)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Ruta 0 Backend corriendo' });
});

// Rutas de la API
app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});