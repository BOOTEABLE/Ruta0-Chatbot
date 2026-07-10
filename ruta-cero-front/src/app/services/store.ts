import { Injectable, signal } from '@angular/core';

export interface Lugar {
  id?: number;
  nombre: string;
  categoria: string;
  latitud: number;
  longitud: number;
  descripcion: string;
  horario?: string;
  precio?: string;
}

// 1. NUEVO: Agregamos la estructura para los mensajes
export interface Mensaje {
  emisor: 'usuario' | 'bot';
  texto: string;
}

@Injectable({
  providedIn: 'root'
})
export class Store {
  lugarSeleccionado = signal<Lugar | null>(null);
  lugaresRecomendados = signal<Lugar[]>([]);
  vistaActual = signal<'descubrir' | 'chat' | 'detalle'>('descubrir');
  
  // 2. NUEVO: Agregamos la memoria del chat con un saludo inicial
  historialChat = signal<Mensaje[]>([
    { emisor: 'bot', texto: '🤖 ¡Hola! Cuéntame: ¿Cuánto presupuesto o tiempo tienes para tu salida hoy en Quito?' }
  ]);
}