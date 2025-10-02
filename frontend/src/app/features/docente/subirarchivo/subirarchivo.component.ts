import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'docente-subirarchivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subirarchivo.component.html',
  styleUrls: ['./subirarchivo.component.css'],
})
export class SubirArchivoComponent {
  // Datos del formulario
  tituloTema = signal('');
  contenidoEditor = signal('');
  
  // Estados del editor
  fontSize = signal('12pt');
  fontFamily = signal('Párrafo');
  mostrarMenuFormato = signal(false);
  
  // Contadores
  palabras = signal(0);
  
  // Secciones publicar - ELIMINADO
  
  // Opciones
  opciones = signal({
    atrasarPublicacion: false,
    fechaPublicacion: '',
    horaPublicacion: '',
    permitirComentarios: false,
    publicarAntesRespuestas: false,
    activarFeedPodcast: false,
    permitirMeGusta: false
  });

  // Métodos de formato
  aplicarFormato(comando: string, valor?: string) {
    document.execCommand(comando, false, valor);
    this.actualizarContadoresManual();
  }

  // Cambiar tamaño de fuente
  cambiarTamanoFuente(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.fontSize.set(select.value);
    const sizeMappings: {[key: string]: string} = {
      '8pt': '1',
      '10pt': '2',
      '12pt': '3',
      '14pt': '4',
      '18pt': '5',
      '24pt': '6',
      '36pt': '7'
    };
    this.aplicarFormato('fontSize', sizeMappings[select.value] || '3');
  }

  // Cambiar familia de fuente
  cambiarFuenteFamilia(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.fontFamily.set(select.value);
    const fontName = select.value === 'Párrafo' ? 'Arial' : select.value;
    this.aplicarFormato('fontName', fontName);
  }

  // Insertar enlace
  insertarEnlace() {
    const url = prompt('Ingrese la URL:');
    if (url) {
      this.aplicarFormato('createLink', url);
    }
  }

  // Insertar imagen
  insertarImagen() {
    const url = prompt('Ingrese la URL de la imagen:');
    if (url) {
      this.aplicarFormato('insertImage', url);
    }
  }

  // Actualizar contadores
  actualizarContadores(event: Event) {
    const texto = (event.target as HTMLElement).innerText || '';
    const palabrasArray = texto.trim().split(/\s+/).filter(p => p.length > 0);
    this.palabras.set(palabrasArray.length);
  }

  actualizarContadoresManual() {
    const editor = document.querySelector('.editor-content');
    if (editor) {
      const texto = editor.textContent || '';
      const palabrasArray = texto.trim().split(/\s+/).filter(p => p.length > 0);
      this.palabras.set(palabrasArray.length);
    }
  }

  // Gestión de secciones - ELIMINADO

  // Seleccionar archivo
  seleccionarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      console.log('Archivo seleccionado:', input.files[0].name);
      // Aquí puedes agregar la lógica de subida
    }
  }

  // Toggle opciones
  toggleOpcion(opcion: 'atrasarPublicacion' | 'permitirComentarios' | 'publicarAntesRespuestas' | 'activarFeedPodcast' | 'permitirMeGusta') {
    const opcionesActuales = this.opciones();
    this.opciones.set({
      ...opcionesActuales,
      [opcion]: !opcionesActuales[opcion]
    });
  }

  // Actualizar fecha/hora
  actualizarFecha(event: Event) {
    const input = event.target as HTMLInputElement;
    const opcionesActuales = this.opciones();
    this.opciones.set({
      ...opcionesActuales,
      fechaPublicacion: input.value
    });
  }

  actualizarHora(event: Event) {
    const input = event.target as HTMLInputElement;
    const opcionesActuales = this.opciones();
    this.opciones.set({
      ...opcionesActuales,
      horaPublicacion: input.value
    });
  }

  // Toggle menú formato
  toggleMenuFormato() {
    this.mostrarMenuFormato.set(!this.mostrarMenuFormato());
  }

  cerrarMenuFormato() {
    this.mostrarMenuFormato.set(false);
  }

  // Publicar
  publicar() {
    const editor = document.querySelector('.editor-content');
    const contenido = editor?.innerHTML || '';
    
    console.log('Publicando formulario...');
    console.log('Título:', this.tituloTema());
    console.log('Contenido:', contenido);
    console.log('Opciones:', this.opciones());
  }

  cancelar() {
    console.log('Cancelar publicación');
  }
}