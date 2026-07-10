import { Component, OnInit, inject, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Store } from '../../services/store';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  template: `<div id="map"></div>`,
  styles: [`#map { width: 100%; height: 100%; min-height: 100vh; }`]
})
export class Mapa implements OnInit {
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID); // Detecta si estamos en servidor o navegador
  private map: any; // Usamos any para evitar importar 'L' directamente arriba
  private markersLayer: any;
  private isBrowser: boolean;

  constructor() {
    // Guardamos si estamos en el navegador
    this.isBrowser = isPlatformBrowser(this.platformId);

    effect(() => {
      const lugares = this.store.lugaresRecomendados();
      if (this.isBrowser && this.map) {
        this.actualizarMarcadores(lugares);
      }
    });
  }

  ngOnInit(): void {
    // Si estamos en el servidor, detenemos la ejecución para que no explote
    if (!this.isBrowser) return;

    // Cargamos Leaflet dinámicamente solo si estamos en el navegador
    import('leaflet').then((L) => {
      this.initMap(L);
    });
  }

  private initMap(L: any): void {
    setTimeout(() => {
      // 1. Inicializamos el mapa centrado en Quito por defecto
      this.map = L.map('map').setView([-0.2201, -78.5123], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.map.invalidateSize();

      // ---------------------------------------------------------
      // NUEVO: 2. ¡Buscar la ubicación real del usuario!
      // ---------------------------------------------------------
      this.map.locate({ setView: true, maxZoom: 16 });

      // Si encuentra tu ubicación, pone un círculo azul
      this.map.on('locationfound', (e: any) => {
        const radius = e.accuracy / 2;
        
        // Marcador de tu ubicación
        L.marker(e.latlng).addTo(this.map)
          .bindPopup(`¡Estás aquí! (Precisión: ${Math.round(radius)} metros)`).openPopup();

        // Un círculo para mostrar el área de precisión
        L.circle(e.latlng, radius, {
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.2
        }).addTo(this.map);
      });

      // Si el usuario deniega el permiso de GPS
      this.map.on('locationerror', (e: any) => {
        console.warn("No se pudo obtener la ubicación:", e.message);
      });
      // ---------------------------------------------------------

    }, 400); 
  }

  private actualizarMarcadores(lugares: any[]): void {
    if (!this.map || !this.markersLayer) return;

    import('leaflet').then((L) => {
      this.markersLayer.clearLayers();
      if (lugares.length === 0) return;

      lugares.forEach(lugar => {
        // 👇 Mejoramos el diseño del popup para incluir el horario
        const popupHTML = `
          <div style="font-family: Arial, sans-serif; min-width: 150px;">
            <strong style="color: #1976d2; font-size: 1.1em;">${lugar.nombre}</strong><br>
            <span style="color: #666; font-size: 0.9em;">📍 ${lugar.categoria}</span><br>
            ${lugar.horario ? `<hr style="margin: 5px 0;"><span style="font-size: 0.85em;">🕒 <b>Horario:</b> ${lugar.horario}</span>` : ''}
          </div>
        `;

        const marker = L.marker([lugar.latitud, lugar.longitud])
          .bindPopup(popupHTML); // Conectamos el nuevo diseño
        
        marker.on('click', () => {
          this.store.lugarSeleccionado.set(lugar);
          this.store.vistaActual.set('detalle');
        });
        
        this.markersLayer.addLayer(marker);
      });

      this.map.invalidateSize();
      const group = L.featureGroup(this.markersLayer.getLayers() as any);
      // Animación suave para centrar todos los lugares en la pantalla
      this.map.fitBounds(group.getBounds().pad(0.2), { animate: true, duration: 1 });
    });
  }
}