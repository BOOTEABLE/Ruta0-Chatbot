import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
// REVISA ESTA LÍNEA: Tiene que decir exactamente 'AppComponent'
export class AppComponent { 
  title = 'ruta-cero-front';
}