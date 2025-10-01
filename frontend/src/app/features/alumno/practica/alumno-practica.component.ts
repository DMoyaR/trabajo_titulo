import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import jsPDF from 'jspdf';

@Component({
  selector: 'alumno-practica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alumno-practica.component.html',
  styleUrls: ['./alumno-practica.component.css'],
})
export class AlumnoPracticaComponent {
  indicadores = signal([
    { etapa: 'Inicio', pct: 25 },
    { etapa: 'Entrega', pct: 60 },
    { etapa: 'Evaluación', pct: 80 },
    { etapa: 'Cierre', pct: 10 },
  ]);

  documentos = signal([
    { nombre: 'Certificado de práctica', tipo: '' },
    { nombre: 'Certificado de cumplimiento', tipo: '' },
  ]);

  // Estado modal
  showCartaModal = false;

  // Datos del alumno (puedes reemplazar luego por data real)
  alumno = {
    nombres: 'Bastián Alejandro',
    apellidos: 'Peña Saldías',
    carrera: 'Ingeniería Civil en Computación, mención Informática',
  };

  // Formulario para la carta
  cartaForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.cartaForm = this.fb.group({
      empresaNombre: ['', Validators.required],
      empresaCorreo: ['', [Validators.required, Validators.email]],
      encargado: ['', Validators.required],
      jefeDirecto: ['', Validators.required],
      cargoAlumno: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      destNombre: ['', Validators.required],
      destApellidos: ['', Validators.required],
      destCargo: ['', Validators.required],
    });
  }

  toggleCartaModal(open: boolean) {
    this.showCartaModal = open;
    if (!open) this.cartaForm.reset();
  }

  generarCartaPDF() {
    if (this.cartaForm.invalid) {
      this.cartaForm.markAllAsTouched();
      return;
    }

    const v = this.cartaForm.value;
    const doc = new jsPDF();

    const fecha = new Date().toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    doc.setFont('Times', 'Normal');
    doc.setFontSize(12);

    // Encabezado
    doc.text('Universidad Tecnológica Metropolitana', 20, 20);
    doc.text('Facultad de Ingeniería • Escuela de Informática', 20, 30);

    // Fecha
    doc.text(`Santiago, ${fecha}`, 20, 50);

    // Destinatario
    doc.text(`Señor(a): ${v.destNombre} ${v.destApellidos}`, 20, 70);
    doc.text(`${v.destCargo}`, 20, 80);
    doc.text(`${v.empresaNombre}`, 20, 90);
    doc.text('Presente', 20, 100);

    // Cuerpo
    const alumnoLinea = `${this.alumno.nombres} ${this.alumno.apellidos}`;
    const parrafos = [
      `Me permito presentarle a ${alumnoLinea}, alumno(a) regular de ${this.alumno.carrera}, de la Universidad Tecnológica Metropolitana, para realizar su práctica profesional.`,
      `La práctica se realizará en ${v.empresaNombre}, iniciando el ${new Date(v.fechaInicio).toLocaleDateString('es-CL')} bajo la supervisión del jefe directo ${v.jefeDirecto}. El cargo a desempeñar será: ${v.cargoAlumno}.`,
      'Cabe destacar que el(la) estudiante cuenta con la cobertura del seguro estudiantil conforme al Art. 3º de la Ley N° 16.744 y el Art. 1° del D.L. N° 313/73.',
      'Esperando una favorable acogida, se despide atentamente,',
    ];

    let y = 120;
    parrafos.forEach(p => {
      const lines = doc.splitTextToSize(p, 170);
      doc.text(lines, 20, y);
      y += lines.length * 10 + 6;
    });

    // Firma
    doc.text('_________________________', 20, y + 20);
    doc.text('Jefe de Carrera', 20, y + 30);

    // Guardar PDF
    const nombreArchivo = `Carta_Practica_${this.alumno.nombres}_${this.alumno.apellidos}.pdf`;
    doc.save(nombreArchivo);

    this.toggleCartaModal(false);
  }

  hasError(ctrl: string, err: string) {
    const c = this.cartaForm.get(ctrl);
    return !!(c && c.touched && c.hasError(err));
  }
}