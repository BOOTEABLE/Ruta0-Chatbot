import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mapa } from '../mapa/mapa';
import { PanelLateral } from '../panel-lateral/panel-lateral';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Mapa, PanelLateral], // Mantenemos tus nombres cortos de clase
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent { }