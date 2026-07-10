import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LugaresService {
  // Esta Señal guardará la lista de lugares y avisará al mapa cuando cambie
  public lugaresEncontrados = signal<any[]>([]);
}