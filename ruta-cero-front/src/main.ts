import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

// REVISA AQUÍ: Debe decir appConfig, NO config
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));