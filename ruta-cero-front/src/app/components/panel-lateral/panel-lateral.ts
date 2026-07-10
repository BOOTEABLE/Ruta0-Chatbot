import { Component, inject, OnInit } from '@angular/core'; // <-- 1. Importamos OnInit
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Store } from '../../services/store';
import { LugaresService } from '../../services/lugares'; // Ajusta la ruta
@Component({
  selector: 'app-panel-lateral',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-lateral.html',
  styleUrl: './panel-lateral.css'
})
export class PanelLateral implements OnInit { // <-- 2. Implementamos OnInit
  private store = inject(Store);
  private http = inject(HttpClient);
  private lugaresService = inject(LugaresService);
  vista = this.store.vistaActual;
  lugarSeleccionado = this.store.lugarSeleccionado;
  historial = this.store.historialChat;
  procesandoMensaje = false;

  // 👇 3. Variables para guardar tu ubicación exacta en memoria
  miLatitud: number | null = null;
  miLongitud: number | null = null;

  // 👇 4. Esto se ejecuta UNA SOLA VEZ apenas se abre la aplicación
  ngOnInit() {
    console.log("📍 Buscando GPS inicial silenciosamente...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          this.miLatitud = posicion.coords.latitude;
          this.miLongitud = posicion.coords.longitude;
          console.log(`✅ ¡Ubicación lista! Coordenadas guardadas: ${this.miLatitud}, ${this.miLongitud}`);
        },
        (error) => {
          console.warn("⚠️ No se pudo obtener el GPS inicial.");
        },
        { enableHighAccuracy: true } // Pedimos alta precisión porque tenemos tiempo
      );
    }
  }

  cambiarVista(nuevaVista: 'descubrir' | 'chat' | 'detalle') {
    this.store.vistaActual.set(nuevaVista);
  }

  enviarMensaje(texto: string, inputElement: HTMLInputElement) {
    // Si no hay texto, o si YA estamos procesando un mensaje, no hagas nada (bloqueo)
    if (!texto.trim() || this.procesandoMensaje) return;

    // Cerramos el candado
    this.procesandoMensaje = true;

    this.historial.update(h => [...h, { emisor: 'usuario', texto }]);
    inputElement.value = ''; 
    
    // 👇 5. Envío INSTANTÁNEO usando las variables guardadas (0 esperas)
    console.log("🚀 Enviando mensaje al backend con tu ubicación guardada...");
    this.llamarBackend(texto, this.miLatitud, this.miLongitud);
  }

  // Función auxiliar que se encarga de hablar con Node.js
  llamarBackend(texto: string, lat: number | null, lng: number | null) {
    const payload = { mensaje: texto, lat: lat, lng: lng };

    this.http.post<any>('http://localhost:3000/api/chat', payload).subscribe({
      next: (res) => {
        // 👇 ESTA LÍNEA ES VITAL PARA DEPURAR
        console.log("📦 Respuesta completa del servidor:", res);
        
        const textoDelServidor = res?.respuesta || "Recibí los datos...";
        this.historial.update(h => [...h, { emisor: 'bot', texto: textoDelServidor }]);
        
        if (res.lugaresFisicos && res.lugaresFisicos.length > 0) {
           console.log("📍 ¡Sí llegaron los lugares! Enviando al Store...");
           this.store.lugaresRecomendados.set(res.lugaresFisicos);
        } else {
           console.warn("⚠️ Advertencia: lugaresFisicos llegó vacío o undefined");
        }
        
        this.procesandoMensaje = false;
      },
      error: (err) => {
        console.error("❌ Error conectando con el backend:", err);
        this.historial.update(h => [...h, { emisor: 'bot', texto: "Upps, no pude conectar con el servidor." }]);
        
        // También abrimos el candado si hay un error
        this.procesandoMensaje = false;
      }
    });
  }

  seleccionarLugarEjemplo() {
    const ejemplo = {
      nombre: 'Café de la Vaca Centro',
      categoria: 'Cafetería',
      latitud: -0.2225,
      longitud: -78.5118,
      descripcion: 'Excelente cafetería tradicional ubicada en el centro histórico de la ciudad.'
    };
    
    this.store.lugaresRecomendados.set([ejemplo]);
    this.store.lugarSeleccionado.set(ejemplo);
    this.store.vistaActual.set('detalle');
  }

  formatearMensaje(texto: string): string {
    if (!texto) return '';
    
    let html = texto;
    // 1. Convierte los **textos** en negritas (<strong>)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 2. Convierte los *textos* en cursivas (<em>)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 3. Convierte los saltos de línea ocultos (\n) en saltos reales (<br>)
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }
}