import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig);

// se guarda mensaje en consola
console.log('Aplicación iniciada con éxito');